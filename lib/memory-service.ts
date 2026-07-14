// lib/memory-service.ts
// High-level memory orchestration: retrieve long-term memories for prompt injection.

import type { MemoryConfig, MemoryEntry } from "./memory-types";
import { loadMemoryEntriesByType, markMemoriesRetrievedAsync } from "./memory-storage";
import { resolveAuxiliaryApiConfig } from "./settings-storage";
import { generateEmbedding, resolveEmbeddingModel, cosineSimilarity } from "./memory-embedding";
import { estimateTokens } from "./token-counter";

// ── Heat scoring（从沈度移植） ──

const HOUR_72 = 72 * 3600 * 1000;
const HOUR_24 = 24 * 3600 * 1000;

/**
 * 计算单条记忆的"热度"分。
 * - 每次被检索 +2 基础分
 * - 72h 内被用过 +3（"还热着"）
 * - 24h 内被用过额外 +1
 * 热度分高的在同等相关性下优先注入。
 */
function heatScore(entry: MemoryEntry, now: number): number {
  let score = (entry.usageCount || 0) * 2;
  if (entry.lastRetrievedAt) {
    const elapsed = now - new Date(entry.lastRetrievedAt).getTime();
    if (elapsed < HOUR_24) {
      score += 4; // 24h 内：权重最高
    } else if (elapsed < HOUR_72) {
      score += 2; // 72h 内：还温热
    }
  }
  return score;
}

/**
 * 按热度降序排列；同热度 → 最新优先。
 */
function sortByHeat(entries: MemoryEntry[]): MemoryEntry[] {
  const now = Date.now();
  return [...entries].sort((a, b) => {
    const ha = heatScore(a, now);
    const hb = heatScore(b, now);
    if (ha !== hb) return hb - ha;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Retrieve relevant long-term memories for prompt injection.
 * Strategy:
 *   1. Total tokens <= longTermTokenBudget → return all (sorted by heat)
 *   2. Over budget + embedding API configured → vector-rank, heat as tiebreaker
 *   3. Over budget + no embedding → heat-sorted (usageCount + recency), fill until budget
 * Embedding API is resolved from auxiliary binding (global, not per-character).
 *
 * Side effect: fire-and-forget marks retrieved entries as used (updates usageCount).
 */
export async function retrieveMemoriesForPrompt(
    characterId: string,
    currentContext: string,
    config: MemoryConfig,
): Promise<MemoryEntry[]> {
    const longTermEntries = await loadMemoryEntriesByType(characterId, "long_term");
    if (longTermEntries.length === 0 || !currentContext.trim()) return [];

    const budget = config.longTermTokenBudget;

    // Calculate total tokens for all entries
    let totalTokens = 0;
    for (const entry of longTermEntries) {
        totalTokens += estimateTokens(entry.content) + 4;
    }

    let result: MemoryEntry[];

    // Strategy 1: all fit within budget → return all, heat-sorted
    if (totalTokens <= budget) {
        result = sortByHeat(longTermEntries);
    } else {
        // Strategy 2: vector recall enabled + embedding API configured → vector search
        const embeddingApiConfig = config.vectorRecallEnabled
            ? resolveAuxiliaryApiConfig("embeddingApiConfigId")
            : null;
        if (embeddingApiConfig && resolveEmbeddingModel(embeddingApiConfig)) {
            const queryEmbedding = await generateEmbedding(currentContext, embeddingApiConfig);
            if (queryEmbedding) {
                const withEmbeddings = longTermEntries.filter(
                    m => m.embedding && m.embedding.length > 0,
                );
                if (withEmbeddings.length > 0) {
                    const now = Date.now();
                    const scored = withEmbeddings.map(entry => ({
                        entry,
                        // blend: 70% vector similarity + 30% heat
                        score:
                            cosineSimilarity(queryEmbedding, entry.embedding!) * 0.7 +
                            Math.min(1, heatScore(entry, now) / 10) * 0.3,
                    }));
                    scored.sort((a, b) => b.score - a.score);
                    result = fillByBudget(
                        scored.map(s => s.entry),
                        budget,
                    );
                } else {
                    result = fillByBudget(sortByHeat(longTermEntries), budget);
                }
            } else {
                result = fillByBudget(sortByHeat(longTermEntries), budget);
            }
        } else {
            // Strategy 3: no embedding → heat-sorted, fill by budget
            result = fillByBudget(sortByHeat(longTermEntries), budget);
        }
    }

    // Fire-and-forget: mark retrieved entries as used (heat tracking)
    if (result.length > 0) {
        markMemoriesRetrievedAsync(result.map(e => e.id));
    }

    return result;
}

export async function retrieveCoreMemoriesForPrompt(
    characterId: string,
    config: MemoryConfig,
): Promise<MemoryEntry[]> {
    const coreEntries = await loadMemoryEntriesByType(characterId, "core");
    if (coreEntries.length === 0) return [];

    const sorted = [...coreEntries].sort((a, b) => {
        const aActive = a.metadata?.active ? 1 : 0;
        const bActive = b.metadata?.active ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        // Heat breaks ties within same active status
        const now = Date.now();
        const ha = heatScore(a, now);
        const hb = heatScore(b, now);
        if (ha !== hb) return hb - ha;
        const aDate = String(a.metadata?.eventDate ?? a.updatedAt ?? a.createdAt);
        const bDate = String(b.metadata?.eventDate ?? b.updatedAt ?? b.createdAt);
        return bDate.localeCompare(aDate);
    });

    const result = fillByBudget(sorted, config.coreMemoryTokenBudget);

    // Fire-and-forget heat tracking for core memories too
    if (result.length > 0) {
        markMemoriesRetrievedAsync(result.map(e => e.id));
    }

    return result;
}

/** Pick entries in order until token budget is exhausted. */
function fillByBudget(entries: MemoryEntry[], budget: number): MemoryEntry[] {
    const result: MemoryEntry[] = [];
    let used = 0;
    for (const entry of entries) {
        const tokens = estimateTokens(entry.content) + 4;
        if (used + tokens > budget) break;
        result.push(entry);
        used += tokens;
    }
    return result;
}
