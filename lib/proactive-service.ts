/* ============================================
   lib/proactive-service.ts — 主动行为服务
   从 jiwen-bridge.ts 提取，使用统一 emotion-engine + emotion-storage

   职责：
   - 后台定时 tick 所有角色
   - 阈值检测 → 触发主动消息
   - cooldown / daily limit 保护
   - LLM 生成主动消息 → 写入聊天记录
   ============================================ */

import {
  tick,
  checkThreshold,
  getStyleGuidance,
  defaultEmotionConfig,
  jiwenProfileConfig,
  type EmotionConfig,
} from "./emotion-engine";
import {
  loadOrCreateState,
  saveState,
  canContact,
  recordContact,
  getAllCharacterIds,
} from "./emotion-storage";
import { loadCharacters } from "./character-storage";
import {
  loadChatContacts,
  loadChatSessions,
  loadChatMessages,
  pushChatMessage,
} from "./chat-storage";
import { loadApiConfigs } from "./settings-storage";
import { determineBaseUrl, buildChatCompletionsUrl, buildRequestHeaders } from "./api-helpers";
import { bgSetInterval } from "./bg-timer";
import { resolveCharacterId } from "./memories-sync";
import { maybeRunCompanionReading, canCompanionRead } from "./reading-companion-service";
import { loadReadingInteractionConfig } from "./reading-storage";

// ===== Config =====

export type ProactiveConfig = {
  /** tick 间隔（毫秒），默认 5 分钟 */
  tickIntervalMs: number;
  /** 两次主动消息最小间隔（毫秒），默认 30 分钟 */
  contactCooldownMs: number;
  /** 每日主动消息上限，默认 8 */
  maxDailyMessages: number;
  /** 使用 Jiwen 风格的激进参数（连接感增长更快、阈值更低） */
  useJiwenProfile: boolean;
};

export function defaultProactiveConfig(): ProactiveConfig {
  return {
    tickIntervalMs: 5 * 60 * 1000,
    contactCooldownMs: 30 * 60 * 1000,
    maxDailyMessages: 8,
    useJiwenProfile: true, // 主动行为默认用 Jiwen 的激进参数
  };
}

// ===== User message time =====

function getLastUserMessageTimeAny(): number | null {
  try {
    const sessions = loadChatSessions();
    let latest: number | null = null;
    for (const session of sessions) {
      const messages = loadChatMessages(session.id, 10);
      for (const msg of messages) {
        if (msg.role === "user") {
          const t = new Date(msg.createdAt).getTime();
          if (latest === null || t > latest) latest = t;
        }
      }
    }
    return latest;
  } catch {
    return null;
  }
}

// ===== Proactive message generation =====

async function sendProactiveMessage(
  characterId: string,
  characterName: string,
  config: EmotionConfig,
): Promise<boolean> {
  console.log(`[proactive] ${characterName} generating message...`);

  const configs = loadApiConfigs();
  if (!configs.length || !configs[0].apiKey) {
    console.log(`[proactive] ${characterName} FAILED: no API config`);
    return false;
  }

  const apiConfig = configs[0];
  const baseUrl = determineBaseUrl(apiConfig);
  const url = buildChatCompletionsUrl(baseUrl);

  const state = await loadOrCreateState(characterId);
  const style = getStyleGuidance(state);

  const characters = loadCharacters();
  const char = characters.find(c => resolveCharacterId(c.name) === characterId);
  const persona = char?.persona || `你是${characterName}。`;

  const systemPrompt = `${persona}

现在是主动发消息的场景。你不应该等待对方的消息，而是自己发起对话。
风格指引：${style.instruction}
心情：${style.mood}
简短自然地发一条消息（15字以内）。像真人发微信一样。`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildRequestHeaders(apiConfig, baseUrl),
      body: JSON.stringify({
        model: apiConfig.defaultModel || "deepseek-chat",
        messages: [{ role: "system", content: systemPrompt }],
        max_tokens: 80,
        temperature: 0.9,
        stream: false,
      }),
    });

    if (!res.ok) {
      console.log(`[proactive] ${characterName} LLM FAILED: HTTP ${res.status}`);
      return false;
    }

    const j = await res.json() as Record<string, unknown>;
    const choices = j.choices as Array<{ message?: { content?: string } }> | undefined;
    const text = choices?.[0]?.message?.content || "";
    if (!text.trim()) {
      console.log(`[proactive] ${characterName} LLM returned empty`);
      return false;
    }

    console.log(`[proactive] ${characterName} response: "${text.trim()}"`);

    // Find contact + session
    const contacts = loadChatContacts();
    const contact = contacts.find(c => c.characterId === char?.id);
    if (!contact) {
      console.log(`[proactive] ${characterName} FAILED: no contact`);
      return false;
    }
    const sessions = loadChatSessions();
    const session = sessions.find(s => s.contactId === contact.id);
    if (!session) {
      console.log(`[proactive] ${characterName} FAILED: no session`);
      return false;
    }

    pushChatMessage({
      sessionId: session.id,
      role: "assistant",
      content: text.trim(),
      status: "sent",
    });

    // Record contact (updates cooldown in IndexedDB)
    await recordContact(characterId);

    console.log(`[proactive] ${characterName} done`);
    return true;
  } catch (e) {
    console.log(`[proactive] ${characterName} FAILED:`, e);
    return false;
  }
}

// ===== Main loop =====

let stopTick: (() => void) | null = null;

export function startEmotionLoop(config?: Partial<ProactiveConfig>): () => void {
  if (typeof window === "undefined") return () => {};
  if (stopTick) {
    console.log("[proactive] loop already running");
    return stopEmotionLoop;
  }

  const proactiveConfig = { ...defaultProactiveConfig(), ...config };
  const engineConfig: EmotionConfig = proactiveConfig.useJiwenProfile
    ? jiwenProfileConfig()
    : defaultEmotionConfig();

  console.log("[proactive] loop starting:", {
    tickInterval: proactiveConfig.tickIntervalMs / 1000 + "s",
    cooldown: proactiveConfig.contactCooldownMs / 1000 + "s",
    maxDaily: proactiveConfig.maxDailyMessages,
    useJiwenProfile: proactiveConfig.useJiwenProfile,
    contactThreshold: engineConfig.contactThreshold,
  });

  const tickFn = async () => {
    console.log("[proactive] ── tick start ──");
    const characters = loadCharacters();
    if (!characters.length) {
      console.log("[proactive] no characters, skip");
      return;
    }

    const lastUserMsgTime = getLastUserMessageTimeAny();

    for (const char of characters) {
      const cid = resolveCharacterId(char.name);
      let state = await loadOrCreateState(cid);

      const minutes = Math.max(0, (Date.now() - state.lastTick) / 60000);
      if (minutes < 1 && state.lastTick > 0) continue;

      // Tick
      const before = { conn: state.connection.toFixed(3), pride: state.pride.toFixed(3), restr: state.restraint.toFixed(3) };
      state = tick(state, engineConfig, minutes);
      await saveState(cid, state);
      console.log(`[proactive] ${char.name} tick(${minutes.toFixed(1)}min) | ${before.conn}→${state.connection.toFixed(3)}`);

      // Check threshold
      const threshold = checkThreshold(state, engineConfig);
      if (!threshold.triggered) continue;

      console.log(`[proactive] ${char.name} threshold: ${threshold.type}`);

      if (
        threshold.type === "contact" &&
        (await canContact(cid, proactiveConfig.contactCooldownMs, proactiveConfig.maxDailyMessages, lastUserMsgTime))
      ) {
        await sendProactiveMessage(cid, char.name, engineConfig);
      }

      // Phase 2: Companion 主动阅读（find_activity 分支或独立门控）
      // 注意：走独立门控 canCompanionRead（不挤占聊天 canContact 配额）
      if (threshold.triggered && (threshold.type === "find_activity" || threshold.type === "contact")) {
        const readingConfig = loadReadingInteractionConfig();
        if (readingConfig.sharedReadingEnabled) {
          const companionGate = canCompanionRead(cid, state);
          if (companionGate.allowed) {
            console.log(`[proactive] ${char.name} companion reading: ${companionGate.reason}`);
            void maybeRunCompanionReading(cid, char.name, state);
          }
        }
      }
    }
    console.log("[proactive] ── tick end ──");
  };

  // First tick after 30s, then every tickIntervalMs
  const initialTimeout = setTimeout(() => {
    tickFn();
    stopTick = bgSetInterval(tickFn, proactiveConfig.tickIntervalMs);
  }, 30000);

  console.log("[proactive] first tick in 30s");

  return () => {
    clearTimeout(initialTimeout);
    if (stopTick) { stopTick(); stopTick = null; }
    console.log("[proactive] loop stopped");
  };
}

export function stopEmotionLoop(): void {
  if (stopTick) {
    stopTick();
    stopTick = null;
    console.log("[proactive] loop stopped (manual)");
  }
}
