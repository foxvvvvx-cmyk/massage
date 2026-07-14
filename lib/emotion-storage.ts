/* ============================================
   lib/emotion-storage.ts — 统一情感状态持久化
   合并 resonance-storage.ts（IndexedDB）+ jiwen-bridge.ts（localStorage + 冷却追踪）

   IndexedDB: ai_phone_emotion_db_v1 / states
   每个 Character 一条 EmotionState 记录 + 冷却元数据
   ============================================ */

import type { EmotionState } from "./emotion-engine";
import { defaultEmotionState } from "./emotion-engine";
import { openIndexedDbAtLeast } from "./idb-open";

const DB_NAME = "ai_phone_emotion_db_v1";
const DB_VERSION = 1;
const STORE_NAME = "states";

// ===== Browser check =====

function hasBrowserApi(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

// ===== DB =====

function ensureIndexes(store: IDBObjectStore): void {
  if (!store.indexNames.contains("by_character")) {
    store.createIndex("by_character", "characterId", { unique: true });
  }
}

async function openDb(): Promise<IDBDatabase | null> {
  if (!hasBrowserApi()) return null;
  return openIndexedDbAtLeast(DB_NAME, DB_VERSION, (db, _oldVersion, tx) => {
    let store: IDBObjectStore;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      store = db.createObjectStore(STORE_NAME, { keyPath: "characterId" });
    } else {
      store = tx!.objectStore(STORE_NAME);
    }
    ensureIndexes(store);
  }).catch(() => null);
}

function runRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ===== Record type =====

export type EmotionRecord = {
  characterId: string;
  state: EmotionState;
  /** 上次主动联系时间戳（毫秒），用于 cooldown 检查 */
  lastContactTime: number | null;
  /** 当日主动联系计数 key: YYYY-MM-DD → count */
  dailyContactCounts: Record<string, number>;
  updatedAt: string;
};

function defaultRecord(characterId: string): EmotionRecord {
  return {
    characterId,
    state: defaultEmotionState(),
    lastContactTime: null,
    dailyContactCounts: {},
    updatedAt: new Date().toISOString(),
  };
}

// ===== CRUD =====

export async function loadRecord(characterId: string): Promise<EmotionRecord | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const record: EmotionRecord | undefined = await runRequest(
      tx.objectStore(STORE_NAME).get(characterId),
    );
    return record ?? null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/** 加载状态；不存在时返回默认值（不写入） */
export async function loadOrCreateState(characterId: string): Promise<EmotionState> {
  const record = await loadRecord(characterId);
  return record?.state ?? defaultEmotionState();
}

/** 同步写入，等待事务完成 */
export async function saveState(characterId: string, state: EmotionState): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const existing = await loadRecord(characterId);
    const record: EmotionRecord = {
      characterId,
      state,
      lastContactTime: existing?.lastContactTime ?? null,
      dailyContactCounts: existing?.dailyContactCounts ?? {},
      updatedAt: new Date().toISOString(),
    };
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Fire-and-forget 写入。不等待事务、不抛异常。
 * 聊天响应路径专用——不阻塞用户看到回复。
 */
export function saveStateAsync(characterId: string, state: EmotionState): void {
  saveState(characterId, state).catch(() => {
    // 静默失败：情感状态不是关键路径
  });
}

export async function deleteState(characterId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(characterId);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}

/** 获取所有有 emotion 记录的角色 ID */
export async function getAllCharacterIds(): Promise<string[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const records: EmotionRecord[] = await runRequest(
      tx.objectStore(STORE_NAME).getAll(),
    );
    return records.map(r => r.characterId);
  } catch {
    return [];
  } finally {
    db.close();
  }
}

// ===== Cooldown / daily limit tracking（从 Jiwen 内存 Map → IndexedDB 持久化） =====

/** 检查是否可以主动联系（cooldown + 每日上限 + 用户活跃） */
export async function canContact(
  characterId: string,
  cooldownMs: number,
  maxDaily: number,
  lastUserMessageTime: number | null,
): Promise<boolean> {
  const now = Date.now();
  const record = await loadRecord(characterId);
  const lastContact = record?.lastContactTime ?? 0;
  const counts = record?.dailyContactCounts ?? {};

  // Cooldown
  if (lastContact && now - lastContact < cooldownMs) {
    return false;
  }

  // Daily limit
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayCount = counts[today] || 0;
  if (todayCount >= maxDaily) {
    return false;
  }

  // User idle
  if (lastUserMessageTime && now - lastUserMessageTime < 5 * 60 * 1000) {
    return false;
  }

  return true;
}

/** 记录一次主动联系（更新 cooldown + 当日计数），fire-and-forget */
export async function recordContact(characterId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const existing = await loadRecord(characterId);
    const record: EmotionRecord = existing
      ? { ...existing }
      : defaultRecord(characterId);
    record.lastContactTime = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    record.dailyContactCounts[today] = (record.dailyContactCounts[today] || 0) + 1;
    record.updatedAt = new Date().toISOString();

    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}
