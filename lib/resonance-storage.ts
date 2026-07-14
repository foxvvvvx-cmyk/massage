/** @deprecated 已合并到 emotion-storage.ts。请改用 import { loadOrCreateState, saveState, saveStateAsync, canContact, recordContact } from "./emotion-storage"。本文件保留以兼容旧引用，不再更新。 */
/* ============================================
   lib/resonance-storage.ts — 共鸣状态持久化
   IndexedDB store：ai_phone_resonance_db_v1 / resonances
   每个 Character 一条记录，按 characterId 索引
   ============================================ */

import type { ResonanceState } from "./resonance-engine";
import { defaultResonanceState } from "./resonance-engine";
import { openIndexedDbAtLeast } from "./idb-open";

const DB_NAME = "ai_phone_resonance_db_v1";
const DB_VERSION = 1;
const STORE_NAME = "resonances";

function hasBrowserApi(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

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

export type ResonanceRecord = {
  characterId: string;
  state: ResonanceState;
  updatedAt: string;
};

// ===== CRUD =====

export async function loadResonanceState(
  characterId: string,
): Promise<ResonanceState | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const record: ResonanceRecord | undefined = await runRequest(
      tx.objectStore(STORE_NAME).get(characterId),
    );
    return record ? record.state : null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/**
 * 加载 resonance 状态；不存在时返回默认初始状态。
 * 不会自动写入——调用方决定是否持久化。
 */
export async function loadOrCreateResonanceState(
  characterId: string,
): Promise<ResonanceState> {
  const existing = await loadResonanceState(characterId);
  return existing ?? defaultResonanceState();
}

export async function saveResonanceState(
  characterId: string,
  state: ResonanceState,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const record: ResonanceRecord = {
      characterId,
      state,
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
 * Fire-and-forget 写入。不等待 IndexedDB 事务完成，不抛异常。
 * 用于聊天响应路径——不阻塞用户看到回复。
 */
export function saveResonanceStateAsync(
  characterId: string,
  state: ResonanceState,
): void {
  saveResonanceState(characterId, state).catch(() => {
    // 静默失败：resonance 不是关键路径，丢了只影响下一轮的状态精度
  });
}

export async function deleteResonanceState(characterId: string): Promise<void> {
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

/**
 * 获取所有有 resonance 记录的角色 ID 列表。
 */
export async function getAllResonanceCharacterIds(): Promise<string[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const records: ResonanceRecord[] = await runRequest(
      tx.objectStore(STORE_NAME).getAll(),
    );
    return records.map(r => r.characterId);
  } catch {
    return [];
  } finally {
    db.close();
  }
}
