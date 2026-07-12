// lib/chat-sync.ts
// 聊天记录同步：IndexedDB ↔ Supabase
// 设计原则：IndexedDB 是主存储，Supabase 是异步备份层
// 推送不阻塞 UI，拉取在加载时和定时进行

import { dbPutMessages } from "./chat-db";
import {
  loadChatMessages,
  CHAT_MESSAGE_PUSHED_EVENT,
  type ChatMessage,
} from "./chat-storage";

// ── Supabase 配置 ──
const SB_URL = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL) || "";
const SB_KEY = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || "";

function sbHeaders(): Record<string, string> {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
  };
}

// ── 同步口令 ──
const LS_SYNC_PASSPHRASE = "chat_sync_passphrase";

async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getSyncPassphrase(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LS_SYNC_PASSPHRASE) || "";
  } catch {
    return "";
  }
}

export async function setSyncPassphrase(passphrase: string): Promise<string> {
  if (typeof window === "undefined") return "";
  try {
    localStorage.setItem(LS_SYNC_PASSPHRASE, passphrase);
  } catch {}
  if (!passphrase) return "";
  return hashPassphrase(passphrase);
}

export function isSyncEnabled(): boolean {
  return getSyncPassphrase().length > 0;
}

let cachedUserId: string | null = null;

async function getSyncUserId(): Promise<string | null> {
  const passphrase = getSyncPassphrase();
  if (!passphrase) return null;
  if (!cachedUserId) {
    cachedUserId = await hashPassphrase(passphrase);
  }
  return cachedUserId;
}

// ── 推送单条消息 ──
async function pushMessageToCloud(msg: ChatMessage, userId: string): Promise<boolean> {
  if (!SB_URL || !SB_KEY) return false;

  const row = {
    id: msg.id,
    user_id: userId,
    session_id: msg.sessionId,
    role: msg.role,
    content: msg.content,
    status: msg.status,
    created_at: msg.createdAt,
    media_type: msg.mediaType || null,
    is_retracted: msg.isRetracted || false,
  };

  try {
    const res = await fetch(`${SB_URL}/rest/v1/chat_messages`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    return res.ok || res.status === 409; // 409 = duplicate id, ok
  } catch {
    return false;
  }
}

// ── 拉取增量消息 ──
async function pullMessagesFromCloud(
  userId: string,
  since: string | null,
): Promise<ChatMessage[]> {
  if (!SB_URL || !SB_KEY) return [];

  let url = `${SB_URL}/rest/v1/chat_messages?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc&limit=200`;

  if (since) {
    url += `&created_at=gt.${encodeURIComponent(since)}`;
  }

  try {
    const res = await fetch(url, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      sessionId: r.session_id as string,
      role: r.role as ChatMessage["role"],
      content: (r.content as string) || "",
      status: (r.status as ChatMessage["status"]) || "sent",
      createdAt: r.created_at as string,
      mediaType: (r.media_type as ChatMessage["mediaType"]) || undefined,
      isRetracted: (r.is_retracted as boolean) || undefined,
    }));
  } catch {
    return [];
  }
}

// ── 合并到本地 IndexedDB ──
async function mergeMessagesToLocal(messages: ChatMessage[]): Promise<number> {
  if (!messages.length) return 0;

  // 过滤掉本地已有的消息（避免覆盖）
  const sessionIds = new Set(messages.map((m) => m.sessionId));
  const existingIds = new Set<string>();

  for (const sid of sessionIds) {
    try {
      const local = loadChatMessages(sid, 500);
      for (const m of local) existingIds.add(m.id);
    } catch {}
  }

  const newMessages = messages.filter((m) => !existingIds.has(m.id));
  if (!newMessages.length) return 0;

  try {
    dbPutMessages(newMessages);
    return newMessages.length;
  } catch {
    return 0;
  }
}

// ── 同步循环 ──
const LS_LAST_SYNC = "chat_sync_last_at";
let syncTimer: ReturnType<typeof setInterval> | null = null;
let pushListener: ((e: Event) => void) | null = null;

function getLastSyncAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LS_LAST_SYNC) || null;
  } catch {
    return null;
  }
}

function setLastSyncAt(iso: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_LAST_SYNC, iso);
  } catch {}
}

export async function startChatSync(): Promise<() => void> {
  if (typeof window === "undefined") return () => {};

  const userId = await getSyncUserId();
  if (!userId) {
    console.log("[chat-sync] passphrase not set, sync disabled");
    return () => {};
  }

  if (syncTimer) {
    console.log("[chat-sync] already running");
    return stopChatSync;
  }

  console.log("[chat-sync] starting, userId=" + userId.slice(0, 8) + "...");

  // ── 首次拉取 ──
  const performPull = async () => {
    try {
      const since = getLastSyncAt();
      const messages = await pullMessagesFromCloud(userId, since);
      if (messages.length) {
        const merged = await mergeMessagesToLocal(messages);
        console.log(`[chat-sync] pulled ${messages.length}, merged ${merged} new`);
      }
      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      console.warn("[chat-sync] pull failed:", e);
    }
  };

  // 立即拉一次
  await performPull();

  // ── 监听新消息 → 推送 ──
  pushListener = async (e: Event) => {
    const msg = (e as CustomEvent).detail?.message as ChatMessage | undefined;
    if (!msg) return;
    try {
      const uid = await getSyncUserId();
      if (!uid) return;
      const ok = await pushMessageToCloud(msg, uid);
      if (ok) {
        setLastSyncAt(new Date().toISOString());
      }
    } catch {}
  };
  window.addEventListener(CHAT_MESSAGE_PUSHED_EVENT, pushListener);

  // ── 定时拉取（每 2 分钟） ──
  syncTimer = setInterval(performPull, 2 * 60 * 1000);

  console.log("[chat-sync] ready");
  return stopChatSync;
}

export function stopChatSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (pushListener) {
    window.removeEventListener(CHAT_MESSAGE_PUSHED_EVENT, pushListener);
    pushListener = null;
  }
  cachedUserId = null;
  console.log("[chat-sync] stopped");
}
