// lib/memory-extractor.ts
// Memory extraction from chat — adapted from 沈度's extractMemoriesFromChat
// Uses the same MEMORY_EXTRACT_PROMPT and Supabase memories table

import { resolveCharacterId, pushMemory } from "./memories-sync";
import { loadChatContacts, loadChatSessions, loadChatMessages, type ChatMessage } from "./chat-storage";
import { loadApiConfigs } from "./settings-storage";
import { loadCharacters } from "./character-storage";
import { determineBaseUrl, buildChatCompletionsUrl, buildRequestHeaders } from "./api-helpers";
import type { ApiConfig } from "./settings-types";

// ── Same prompt as 沈度 ──
const MEMORY_EXTRACT_PROMPT = `请从以下对话中提取关于用户的**新事实**。严格要求：
- 只提取用户明确陈述的内容，不推测、不总结情绪、不编造
- 每条事实独立成句，不超过30字
- 分类为以下之一：关于ta | 约定 | 喜好 | 其他
- 如果没有任何新事实，只回复 [无]
- 格式：每行一条 "分类｜事实内容｜标签1,标签2,标签3"
- 重要：内容相近的事实合并为一条（如多个类似称呼合并）。准确分类，不要全扔进同一类。标签用完整词语，不要拆字。
- 不要回复任何其他内容，只输出提取结果。`;

// ── Per-session extraction counters (in-memory, resets on page reload) ──
const extractCounters = new Map<string, number>();
const extractingLocks = new Set<string>();

// ── Chinese keyword extraction (adapted from 沈度) ──
const CN_STOP_WORDS = new Set([
  "的", "了", "是", "我", "你", "他", "她", "它", "们", "这", "那", "在",
  "不", "也", "就", "都", "很", "要", "会", "可以", "能", "说", "想", "看",
  "让", "把", "被", "从", "对", "向", "到", "和", "与", "或", "但", "而",
  "因为", "所以", "如果", "虽然", "然后", "一个", "什么", "怎么", "哪",
  "吗", "啊", "呢", "吧", "哦", "嗯", "哈",
]);

function extractKeywords(text: string): string[] {
  const cleaned = text.replace(/[^一-鿿a-zA-Z0-9]/g, " ").trim();
  const segments = cleaned.split(/\s+/).filter((s) => s.length > 0);
  const keywords: string[] = [];
  for (const seg of segments) {
    if (/^[a-zA-Z]+$/.test(seg) && seg.length >= 2) { keywords.push(seg.toLowerCase()); continue; }
    if (/[一-鿿]/.test(seg)) {
      if (!CN_STOP_WORDS.has(seg) && seg.length >= 1) keywords.push(seg);
      if (seg.length >= 4) {
        for (let i = 0; i <= seg.length - 2; i++) {
          const bi = seg.slice(i, i + 2);
          if (!CN_STOP_WORDS.has(bi) && !CN_STOP_WORDS.has(bi[0]) && !CN_STOP_WORDS.has(bi[1])) keywords.push(bi);
        }
      }
    }
  }
  return [...new Set(keywords)];
}

// ── Get recent messages for a character ──
function getRecentMessagesForCharacter(characterName: string, limit = 20): ChatMessage[] {
  const characterId = resolveCharacterId(characterName);
  // First try: find character by resolved ID via characters list
  const characters = loadCharacters();
  const char = characters.find(
    (c) => resolveCharacterId(c.name) === characterId || c.name === characterName
  );
  if (!char) return [];

  const contacts = loadChatContacts();
  const contact = contacts.find((c) => c.characterId === char.id);
  if (!contact) return [];

  const sessions = loadChatSessions();
  const session = sessions.find((s) => s.contactId === contact.id);
  if (!session) return [];

  const messages = loadChatMessages(session.id, limit);
  return messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-limit);
}

// ── Get active API config ──
function getActiveApiConfig(): ApiConfig | null {
  const configs = loadApiConfigs();
  return configs.length > 0 ? configs[0] : null;
}

// ── Main extraction function ──
export async function extractMemoriesFromChat(
  characterName: string,
  silent = false
): Promise<number> {
  const characterId = resolveCharacterId(characterName);
  const lockKey = characterId;

  if (extractingLocks.has(lockKey)) return 0;
  const apiConfig = getActiveApiConfig();
  if (!apiConfig || !apiConfig.apiKey) {
    if (!silent) console.warn("[MemoryExtractor] No API config found");
    return 0;
  }

  const messages = getRecentMessagesForCharacter(characterName, 20);
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length < 3) {
    if (!silent) console.log("[MemoryExtractor] Not enough user messages:", userMessages.length);
    return 0;
  }

  extractingLocks.add(lockKey);
  try {
    const convo = messages
      .map((m) => (m.role === "user" ? "用户：" : "AI：") + m.content)
      .join("\n");

    const baseUrl = determineBaseUrl(apiConfig);
    const url = buildChatCompletionsUrl(baseUrl);
    const headers = buildRequestHeaders(apiConfig, baseUrl);
    const model = apiConfig.defaultModel || "deepseek-chat";

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: MEMORY_EXTRACT_PROMPT },
          { role: "user", content: convo },
        ],
        temperature: 0.3,
        max_tokens: 800,
        stream: false,
      }),
    });

    if (!res.ok) {
      console.error("[MemoryExtractor] API error:", res.status);
      return 0;
    }

    const j = await res.json();
    const text: string = j.choices?.[0]?.message?.content || "";
    if (!text || text.includes("[无]") || text.trim() === "[无]") return 0;

    const lines = text
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l && l.includes("｜") && !l.startsWith("["));

    let added = 0;
    for (const line of lines) {
      const parts = line.split("｜");
      const cat = (parts[0] || "").trim();
      const fact = (parts[1] || "").trim();
      const aiTags = (parts[2] || "")
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);

      if (!fact || fact.length < 2) continue;

      const ok = await pushMemory({
        id: Date.now() + added,
        content: fact,
        category: cat || "默认",
        tags: aiTags.length ? aiTags.join(",") : extractKeywords(fact).slice(0, 3).join(","),
        character_id: characterId,
        source: "auto",
      });

      if (ok) added++;
    }

    if (!silent && added > 0) {
      console.log(`[MemoryExtractor] Extracted ${added} memories for ${characterName}`);
    }
    return added;
  } catch (e) {
    console.error("[MemoryExtractor] Error:", e);
    return 0;
  } finally {
    extractingLocks.delete(lockKey);
  }
}

// ── Auto-trigger on message count ──
const AUTO_EXTRACT_INTERVAL = 8;

export function shouldAutoExtract(sessionId: string): boolean {
  const count = extractCounters.get(sessionId) || 0;
  return count > 0 && count % AUTO_EXTRACT_INTERVAL === 0;
}

export function incrementExtractCounter(sessionId: string): void {
  const current = extractCounters.get(sessionId) || 0;
  extractCounters.set(sessionId, current + 1);
}

export function resetExtractCounter(sessionId: string): void {
  extractCounters.delete(sessionId);
}
