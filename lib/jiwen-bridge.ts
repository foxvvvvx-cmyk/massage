// lib/jiwen-bridge.ts
// 积温桥接层 — 连接 Engine 和虚拟手机项目
// 依赖：Engine / chat-storage / character-storage / settings-storage / api-helpers

import {
  tick, applyInteraction, checkThreshold, getStyleGuidance,
  exportState, importState,
  defaultJiwenState, defaultJiwenConfig,
  type JiwenState, type JiwenConfig, type InteractionInput,
} from "./jiwen-engine";
import { defaultRuntimeConfig, type JiwenRuntimeConfig } from "./jiwen-config";
import { loadChatMessages, loadChatSessions, loadChatContacts, pushChatMessage, type ChatMessage } from "./chat-storage";
import { loadCharacters } from "./character-storage";
import { loadApiConfigs } from "./settings-storage";
import { determineBaseUrl, buildChatCompletionsUrl, buildRequestHeaders } from "./api-helpers";
import { resolveCharacterId } from "./memories-sync";

// ── 角色状态存储 key ──
function stateKey(characterId: string): string { return `jiwen_state_${characterId}`; }

// ── 加载/保存角色状态 ──
function loadJiwenState(characterId: string): JiwenState {
  if (typeof window === "undefined") return defaultJiwenState();
  try {
    const raw = localStorage.getItem(stateKey(characterId));
    return raw ? (importState(raw) || defaultJiwenState()) : defaultJiwenState();
  } catch { return defaultJiwenState(); }
}

function saveJiwenState(characterId: string, state: JiwenState): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(stateKey(characterId), exportState(state)); } catch {}
}

// ── 主动消息冷却追踪 ──
const lastContactTime = new Map<string, number>();
const dailyContactCounts = new Map<string, number>();

// ── 获取用户最近一次发消息的时间（跨所有会话） ──
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

function canContact(
  characterId: string,
  runtime: JiwenRuntimeConfig,
  lastUserMsgTime: number | null,
): boolean {
  const now = Date.now();

  // 冷却检查
  const last = lastContactTime.get(characterId) || 0;
  if (now - last < runtime.contactCooldownMs) {
    console.log(`[jiwen] ${characterId} blocked: cooldown (${Math.round((now - last) / 1000)}s ago, need ${Math.round(runtime.contactCooldownMs / 1000)}s)`);
    return false;
  }

  // 每日上限
  const today = new Date().toDateString();
  const dailyKey = `${characterId}_${today}`;
  const count = dailyContactCounts.get(dailyKey) || 0;
  if (count >= runtime.maxDailyMessages) {
    console.log(`[jiwen] ${characterId} blocked: daily limit (${count}/${runtime.maxDailyMessages})`);
    return false;
  }

  // 用户最近 N 分钟内有消息 → 不打扰
  if (lastUserMsgTime && (now - lastUserMsgTime) < runtime.userIdleThresholdMs) {
    console.log(`[jiwen] ${characterId} blocked: user active ${Math.round((now - lastUserMsgTime) / 1000)}s ago (threshold ${Math.round(runtime.userIdleThresholdMs / 1000)}s)`);
    return false;
  }

  return true;
}

function recordContact(characterId: string): void {
  const now = Date.now();
  lastContactTime.set(characterId, now);
  const today = new Date().toDateString();
  const dailyKey = `${characterId}_${today}`;
  dailyContactCounts.set(dailyKey, (dailyContactCounts.get(dailyKey) || 0) + 1);
}

// ── 获取角色的最新消息时间 ──
function getLastUserMessageTimeForCharacter(characterId: string): number | null {
  try {
    const contacts = loadChatContacts();
    const characters = loadCharacters();
    const char = characters.find(c => resolveCharacterId(c.name) === characterId);
    if (!char) return null;
    const contact = contacts.find(c => c.characterId === char.id);
    if (!contact) return null;
    const sessions = loadChatSessions();
    const session = sessions.find(s => s.contactId === contact.id);
    if (!session) return null;
    const messages = loadChatMessages(session.id, 10);
    // 找用户最后一条消息
    let latest: number | null = null;
    for (const msg of messages) {
      if (msg.role === "user") {
        const t = new Date(msg.createdAt).getTime();
        if (latest === null || t > latest) latest = t;
      }
    }
    return latest;
  } catch {
    return null;
  }
}

// ── 发送主动消息 ──
async function sendProactiveMessage(characterId: string, characterName: string): Promise<boolean> {
  console.log(`[jiwen] ${characterName} generating proactive message...`);

  const configs = loadApiConfigs();
  if (!configs.length || !configs[0].apiKey) {
    console.log(`[jiwen] ${characterName} FAILED: no API config`);
    return false;
  }

  const apiConfig = configs[0];
  const baseUrl = determineBaseUrl(apiConfig);
  const url = buildChatCompletionsUrl(baseUrl);

  const state = loadJiwenState(characterId);
  const style = getStyleGuidance(state);

  const characters = loadCharacters();
  const char = characters.find(c => resolveCharacterId(c.name) === characterId);
  const persona = char?.persona || `你是${characterName}。`;

  const systemPrompt = `${persona}

现在是主动发消息的场景。你不应该等待对方的消息，而是自己发起对话。
风格指引：${style.instruction}
心情：${style.mood === "missing" ? "想对方了" : style.mood === "proud" ? "正在端着" : style.mood === "sad" ? "有点低落" : "平常"}
简短自然地发一条消息（15字以内）。像真人发微信一样。`;

  try {
    console.log(`[jiwen] ${characterName} calling LLM...`);
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
      console.log(`[jiwen] ${characterName} LLM FAILED: HTTP ${res.status}`);
      return false;
    }
    const j = await res.json();
    const text: string = j.choices?.[0]?.message?.content || "";
    if (!text.trim()) {
      console.log(`[jiwen] ${characterName} LLM returned empty text`);
      return false;
    }

    console.log(`[jiwen] ${characterName} LLM response: "${text.trim()}"`);

    // 推送到聊天记录 — 使用与普通 assistant 消息完全一致的数据结构
    const contacts = loadChatContacts();
    const contact = contacts.find(c => c.characterId === char?.id);
    if (!contact) {
      console.log(`[jiwen] ${characterName} FAILED: no contact found for char.id=${char?.id}`);
      return false;
    }
    const sessions = loadChatSessions();
    const session = sessions.find(s => s.contactId === contact.id);
    if (!session) {
      console.log(`[jiwen] ${characterName} FAILED: no session found for contact.id=${contact.id}`);
      return false;
    }

    const savedMsg = pushChatMessage({
      sessionId: session.id,
      role: "assistant",
      content: text.trim(),
      status: "sent",
    });

    console.log(`[jiwen] ${characterName} message saved: id=${savedMsg.id} session=${session.id}`);
    recordContact(characterId);
    console.log(`[jiwen] ${characterName} ✓ done`);
    return true;
  } catch (e) {
    console.log(`[jiwen] ${characterName} FAILED:`, e);
    return false;
  }
}

// ── Tick 循环 ──
let tickTimer: ReturnType<typeof setInterval> | null = null;

export function startJiwenLoop(): () => void {
  if (typeof window === "undefined") return () => {};
  if (tickTimer) {
    console.log("[jiwen] loop already running, skip duplicate start");
    return stopJiwenLoop;
  }

  const runtime = defaultRuntimeConfig();
  const engineConfig = defaultJiwenConfig();

  console.log("[jiwen] loop starting:");
  console.log(`[jiwen]   tickInterval=${runtime.tickIntervalMs / 1000}s`);
  console.log(`[jiwen]   cooldown=${runtime.contactCooldownMs / 1000}s`);
  console.log(`[jiwen]   maxDaily=${runtime.maxDailyMessages}`);
  console.log(`[jiwen]   userIdleThreshold=${runtime.userIdleThresholdMs / 1000}s`);
  console.log(`[jiwen]   contactThreshold=${engineConfig.contactThreshold}`);
  console.log(`[jiwen]   prideBlockThreshold=${engineConfig.prideBlockThreshold}`);

  const tickFn = async () => {
    console.log("[jiwen] ── tick start ──");
    const characters = loadCharacters();
    if (!characters.length) {
      console.log("[jiwen] no characters, skip tick");
      return;
    }

    // 预计算用户最后活跃时间（跨所有会话），一次 tick 只算一次
    const lastUserMsgTime = getLastUserMessageTimeAny();
    if (lastUserMsgTime) {
      console.log(`[jiwen] last user message: ${new Date(lastUserMsgTime).toLocaleTimeString()}`);
    } else {
      console.log("[jiwen] no user messages found (fresh state)");
    }

    for (const char of characters) {
      const cid = resolveCharacterId(char.name);
      let state = loadJiwenState(cid);

      const now = Date.now();
      const minutes = Math.max(0, (now - state.lastTick) / 60000);
      if (minutes < 1 && state.lastTick > 0) {
        console.log(`[jiwen] ${char.name} skip: only ${(minutes * 60).toFixed(0)}s since last tick`);
        continue;
      }

      // tick
      console.log(`[jiwen] ${char.name} tick (${minutes.toFixed(1)}min) | before: conn=${state.connection.toFixed(3)} pride=${state.pride.toFixed(3)}`);
      state = tick(state, engineConfig, minutes);
      saveJiwenState(cid, state);
      console.log(`[jiwen] ${char.name} after tick: conn=${state.connection.toFixed(3)} pride=${state.pride.toFixed(3)} valence=${state.valence.toFixed(3)}`);

      // 检查阈值
      const threshold = checkThreshold(state, engineConfig);
      if (threshold.triggered) {
        console.log(`[jiwen] ${char.name} threshold triggered: type=${threshold.type}`);
      }

      if (threshold.triggered && threshold.type === "contact" && canContact(cid, runtime, lastUserMsgTime)) {
        await sendProactiveMessage(cid, char.name);
      }
    }
    console.log("[jiwen] ── tick end ──");
  };

  // 首次延迟 30 秒，之后按间隔
  const initialTimeout = setTimeout(() => {
    tickFn();
    tickTimer = setInterval(tickFn, runtime.tickIntervalMs);
  }, 30000);

  console.log("[jiwen] first tick scheduled in 30s");

  return () => {
    clearTimeout(initialTimeout);
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    console.log("[jiwen] loop stopped");
  };
}

export function stopJiwenLoop(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
    console.log("[jiwen] loop stopped (via stopJiwenLoop)");
  }
}

// ── 对话后更新：Bridge 读取聊天行为计算 delta ──
export function onConversationEnd(characterName: string, userReplied: boolean, lastUserMsgTime?: number): void {
  const cid = resolveCharacterId(characterName);
  let state = loadJiwenState(cid);

  const input: InteractionInput = {
    replied: userReplied,
    delayMinutes: lastUserMsgTime ? Math.max(0, (Date.now() - lastUserMsgTime) / 60000) : 0,
    sentiment: "neutral",
  };

  state = applyInteraction(state, defaultJiwenConfig(), input);
  saveJiwenState(cid, state);
  console.log(`[jiwen] ${characterName} interaction: replied=${userReplied} → conn=${state.connection.toFixed(3)}`);
}
