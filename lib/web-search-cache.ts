// 联网搜索缓存层：同一个 query 短时间内不重复请求 Serper，节省 API 配额。
// 仅缓存成功结果；失败/超时不缓存。

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 分钟

type CacheEntry = {
    result: string;
    createdAt: number;
};

const store = new Map<string, CacheEntry>();

/** 清除过期条目（惰性清理，在每次 get/set 时触发） */
function evictStale(ttlMs: number = DEFAULT_TTL_MS): void {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now - entry.createdAt > ttlMs) store.delete(key);
    }
}

/** 生成 query 的缓存键（小写 + 去首尾空白后 hash） */
function cacheKey(query: string): string {
    const normalized = query.trim().toLowerCase();
    // 简单 hash：足够区分不同 query，比 JSON.stringify 快
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const ch = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash + ch) | 0;
    }
    return `ws_${hash}_${normalized.length}`;
}

export function getCachedResult(query: string, ttlMs?: number): string | undefined {
    evictStale(ttlMs);
    const entry = store.get(cacheKey(query));
    if (!entry) return undefined;
    if (Date.now() - entry.createdAt > (ttlMs ?? DEFAULT_TTL_MS)) {
        store.delete(cacheKey(query));
        return undefined;
    }
    return entry.result;
}

export function setCachedResult(query: string, result: string): void {
    evictStale();
    store.set(cacheKey(query), { result, createdAt: Date.now() });
}

export function clearWebSearchCache(): void {
    store.clear();
}

/** 仅用于调试/QA：查看缓存条目数 */
export function cacheStats(): { size: number } {
    evictStale();
    return { size: store.size };
}
