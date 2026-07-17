// lib/reading-companion-service.ts — Phase 2: Companion 主动阅读
//
// 由 proactive-service.ts 的 tick 循环调起（find_activity 或 contact 分支）。
// 不新建引擎 / 情绪系统 / 事件系统。
// ────────────────────────────────────────────────────────────

import { loadBooks, loadChapters, loadProgress, saveProgress, loadNotes, loadHighlights, loadAnnotations, saveHighlight, saveAnnotation, saveNote } from "./reading-storage";
import type { Book, BookChapter, ReadingProgress, ReadingHighlight, ReadingNote, ReadingAnnotation } from "./reading-types";
import { applyInteraction, getStyleGuidance, defaultEmotionConfig, type EmotionState } from "./emotion-engine";
import { saveState } from "./emotion-storage";
import { kvGet, kvSet, registerKvMigration } from "./kv-db";
import { makeTimedWakeId, saveTimedWakeSchedule } from "./timed-wake-storage";
import { loadChatContacts, loadChatSessions, pushReadingDiscussCard } from "./chat-storage";
import { resolveBinding, loadBindingConfig } from "./settings-storage";
import { splitParagraphSentences } from "./reading-anchors";
import { buildSharedReadingEntries } from "./short-term-assembler";
import { saveMemoryEntry } from "./memory-storage";
import type { MemoryEntry } from "./memory-types";

// ── 配额（独立于聊天 canContact，互不挤占）────────────────
const QUOTA_KEY_PREFIX = "ai_phone_reading_companion_v1";
registerKvMigration(QUOTA_KEY_PREFIX);

type CompanionQuota = { date: string; count: number; lastSessionAt: string };

const COMPANION_READING_CONFIG = {
    dailyMaxSessions: 2,
    sessionCooldownMs: 4 * 60 * 60 * 1000,
    maxParagraphsPerSession: 30,
    maxAnnotationsPerSession: 3,
    noteChanceBase: 0.3,
    noteConnectionWeight: 0.5,
    immersionScale: 1.5,
    timedWakeMinDelayMs: 30 * 60 * 1000,
    timedWakeMaxDelayMs: 90 * 60 * 1000,
    timedWakeConnectionThreshold: 0.45,
    connectionGate: 0.35,
};

function loadQuota(characterId: string): CompanionQuota {
    try {
        const raw = kvGet(`${QUOTA_KEY_PREFIX}_${characterId}`);
        if (raw) return JSON.parse(raw) as CompanionQuota;
    } catch { /* ignore */ }
    return { date: "", count: 0, lastSessionAt: "" };
}
function saveQuota(characterId: string, q: CompanionQuota): void {
    kvSet(`${QUOTA_KEY_PREFIX}_${characterId}`, JSON.stringify(q));
}
function todayString(): string { return new Date().toISOString().slice(0, 10); }

// ── 门控 ───────────────────────────────────────────────

export function canCompanionRead(characterId: string, state: EmotionState): { allowed: boolean; reason: string } {
    const cfg = COMPANION_READING_CONFIG;
    const quota = loadQuota(characterId);
    const today = todayString();
    if (quota.date !== today) return { allowed: true, reason: "new_day" };
    if (quota.count >= cfg.dailyMaxSessions) return { allowed: false, reason: "daily_cap" };
    if (quota.lastSessionAt) {
        const elapsed = Date.now() - new Date(quota.lastSessionAt).getTime();
        if (elapsed < cfg.sessionCooldownMs) return { allowed: false, reason: "cooldown" };
    }
    if (state.connection < cfg.connectionGate) return { allowed: false, reason: "connection_low" };
    return { allowed: true, reason: "ok" };
}

// ── 主流程 ──────────────────────────────────────────────

export type CompanionReadingResult = {
    sessionRun: boolean;
    paragraphsRead: number;
    annotationCount: number;
    highlightCount: number;
    noteCount: number;
    finished: boolean;
    timedWakeScheduled: boolean;
};

export async function maybeRunCompanionReading(
    characterId: string,
    characterName: string,
    state: EmotionState,
): Promise<CompanionReadingResult> {
    const empty: CompanionReadingResult = {
        sessionRun: false, paragraphsRead: 0, annotationCount: 0,
        highlightCount: 0, noteCount: 0, finished: false, timedWakeScheduled: false,
    };

    const gate = canCompanionRead(characterId, state);
    if (!gate.allowed) return empty;

    const books = loadBooks();
    const candidates: { book: Book; progress: ReadingProgress }[] = [];
    for (const book of books) {
        const prog = await loadProgress(book.id);
        if (!prog?.companion) continue;
        if (prog.companion.characterId !== characterId) continue;
        if ((prog.companion.fraction ?? 0) >= 1) continue;
        if ((prog.progressFraction ?? 0) >= 1 && (prog.companion.fraction ?? 0) >= 1) continue;
        candidates.push({ book, progress: prog });
    }
    if (candidates.length === 0) return empty;

    const { book, progress } = candidates[0];
    const chapters = await loadChapters(book.id);
    if (chapters.length === 0) return empty;

    const cp = progress.companion!;
    let curCh = cp.chapterIndex;
    let curP = cp.paragraphIndex;
    const maxCh = chapters.length - 1;
    const capCh = Math.min(maxCh, progress.chapterIndex + 1); // 进度封顶：用户 +1 章

    const style = getStyleGuidance(state);
    const cfg = COMPANION_READING_CONFIG;
    const budget = Math.round(cfg.maxParagraphsPerSession * (1 + state.immersion * cfg.immersionScale));

    let paragraphsRead = 0;
    const allRead: string[] = [];
    const readRanges: { chapterIndex: number; start: number; end: number }[] = [];

    while (paragraphsRead < budget && curCh <= capCh) {
        const chapter = chapters.find((c) => c.index === curCh);
        if (!chapter) break;
        const total = chapter.paragraphs.length;
        const start = curCh === cp.chapterIndex ? curP : 0;
        const toRead = Math.min(total - start, budget - paragraphsRead);
        if (toRead <= 0) { curCh++; curP = 0; if (curCh > capCh) break; continue; }

        const seg = chapter.paragraphs.slice(start, start + toRead);
        allRead.push(...seg);
        readRanges.push({ chapterIndex: curCh, start, end: start + toRead });
        paragraphsRead += toRead;
        curP = start + toRead;
        if (curP >= total) { curCh++; curP = 0; }
    }
    if (paragraphsRead === 0) return empty;

    // ── 批注 ──
    let annotationCount = 0;
    const annotChapterIndex = cp.chapterIndex;
    try {
        const binding = resolveBinding(loadBindingConfig(), characterId, "reading");
        if (binding?.apiConfigId) {
            const { generateAnnotationBatch } = await import("./reading-engine");
            const chapterTitle = chapters.find((c) => c.index === annotChapterIndex)?.title ?? `第${annotChapterIndex + 1}章`;
            // 把段落实例做成 AnnotationTarget[]
            const targets = allRead.slice(0, cfg.maxAnnotationsPerSession * 3).map((text, i) => ({
                absoluteIndex: i,
                chapterIndex: annotChapterIndex,
                paragraphIndex: cp.paragraphIndex + i,
                text,
            }));
            const raw = await generateAnnotationBatch(book, chapterTitle, targets, [], characterId).catch(() => null);
            if (raw && Array.isArray(raw)) {
                for (const a of raw.slice(0, cfg.maxAnnotationsPerSession)) {
                    if (a && typeof a.paragraphIndex === "number" && typeof a.content === "string") {
                        await saveAnnotation({
                            id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                            bookId: book.id, chapterIndex: annotChapterIndex,
                            paragraphIndex: a.paragraphIndex, characterId, characterName,
                            content: a.content, createdAt: new Date().toISOString(),
                        });
                        annotationCount++;
                    }
                }
            }
        }
    } catch { /* 批注失败不阻塞阅读进度 */ }

    // ── 划线（概率）──
    let highlightCount = 0;
    const hlChance = Math.min(0.8, state.connection * 1.2);
    if (Math.random() < hlChance && allRead.length > 0) {
        const pick = allRead[Math.floor(Math.random() * allRead.length)];
        const { splitParagraphSentences } = await import("./reading-anchors");
        const sentences = splitParagraphSentences(pick);
        if (sentences.length > 0) {
            const s = sentences[Math.floor(Math.random() * sentences.length)];
            const hl: ReadingHighlight = {
                id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                bookId: book.id, chapterIndex: annotChapterIndex,
                paragraphIndex: cp.paragraphIndex, sentenceIndex: s.sentenceIndex,
                snippet: s.text.slice(0, 80), kind: "underline", authorType: "companion",
                characterId, characterName, createdAt: new Date().toISOString(),
            };
            await saveHighlight(hl);
            highlightCount++;
        }
    }

    // ── 留言（概率）──
    let noteCount = 0;
    const noteChance = Math.min(0.8, cfg.noteChanceBase + state.connection * cfg.noteConnectionWeight);
    if (Math.random() < noteChance && allRead.length > 0) {
        try {
            const pick = allRead[Math.floor(Math.random() * allRead.length)];
            const { generateCompanionNote } = await import("./reading-engine");
            const txt = await generateCompanionNote(book, characterId, {
                quote: pick.slice(0, 120),
                chapterTitle: chapters.find((c) => c.index === annotChapterIndex)?.title ?? "",
                contextParagraphs: allRead.slice(0, 5),
                threadMessages: [],
            }).catch(() => null);
            if (txt) {
                const { splitParagraphSentences } = await import("./reading-anchors");
                const ss = splitParagraphSentences(pick);
                const s = ss[0];
                const n: ReadingNote = {
                    id: `cn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    bookId: book.id, chapterIndex: annotChapterIndex,
                    paragraphIndex: cp.paragraphIndex,
                    sentenceIndex: s?.sentenceIndex ?? -1,
                    snippet: s?.text.slice(0, 80) ?? pick.slice(0, 80),
                    authorType: "companion", characterId, characterName,
                    content: txt, createdAt: new Date().toISOString(),
                };
                await saveNote(n);
                noteCount++;
            }
        } catch { /* ignore */ }
    }

    // ── 更新进度 ──
    const totalParas = chapters.reduce((s, c) => s + c.paragraphs.length, 0);
    const readIdx = chapters.filter((c) => c.index < curCh).reduce((s, c) => s + c.paragraphs.length, 0) + curP;
    const newFraction = totalParas > 0 ? Math.min(1, readIdx / totalParas) : 0;
    const finished = newFraction >= 1;

    const updatedProgress: ReadingProgress = {
        ...progress,
        companion: {
            characterId,
            chapterIndex: curCh,
            paragraphIndex: curP,
            fraction: newFraction,
            updatedAt: new Date().toISOString(),
            lastSessionAt: new Date().toISOString(),
        },
    };
    await saveProgress(updatedProgress);

    // ── 配额更新 ──
    const quota = loadQuota(characterId);
    const today = todayString();
    saveQuota(characterId, {
        date: today,
        count: quota.date === today ? quota.count + 1 : 1,
        lastSessionAt: new Date().toISOString(),
    });

    // ── 情绪更新 ──
    try {
        const emoCfg = defaultEmotionConfig();
        const updated = applyInteraction(state, emoCfg, {
            replied: false,
            delayMinutes: cfg.sessionCooldownMs / 60000,
        });
        updated.immersion = Math.min(1, (updated.immersion || 0) + 0.03);
        await saveState(characterId, updated);
    } catch { /* ignore */ }

    // ── Timeline ──
    try {
        buildSharedReadingEntries(book.id, {
            companionReading: {
                characterId, characterName,
                chaptersRead: readRanges.length, paragraphsRead,
            },
        });
    } catch { /* ignore */ }

    // ── 主动聊书（高质量 timed-wake）──
    let timedWakeScheduled = false;
    if (state.connection >= cfg.timedWakeConnectionThreshold && annotationCount > 0) {
        const contacts = loadChatContacts();
        const contact = contacts.find((c) => c.characterId === characterId);
        if (contact) {
            const sessions = loadChatSessions();
            const session = sessions.find((s) => !s.isGroup && s.contactId === contact.id);
            if (session) {
                const delayMs = cfg.timedWakeMinDelayMs + Math.floor(Math.random() * (cfg.timedWakeMaxDelayMs - cfg.timedWakeMinDelayMs));
                const nowMs = Date.now();
                saveTimedWakeSchedule({
                    id: makeTimedWakeId(session.id),
                    sessionId: session.id,
                    characterId,
                    fireAt: nowMs + delayMs,
                    createdAt: nowMs,
                    delayMinutes: Math.round(delayMs / 60000),
                    intent: `最近一起读了《${book.title}》。`,
                });
                timedWakeScheduled = true;
            }
        }
    }

    // ── Shared Reading Complete ──
    const userDone = (progress.progressFraction ?? 0) >= 1;
    if (finished && userDone && !progress.sharedCompleteAt) {
        await triggerSharedReadingComplete(book, updatedProgress, characterName, characterId, chapters);
    }

    return {
        sessionRun: true, paragraphsRead, annotationCount,
        highlightCount, noteCount, finished, timedWakeScheduled,
    };
}

// ── 共读完成事件 ─────────────────────────────────────────

async function triggerSharedReadingComplete(
    book: Book,
    progress: ReadingProgress,
    compName: string,
    compId: string,
    chapters: BookChapter[],
): Promise<void> {
    const now = new Date().toISOString();

    // 聚合（轻量、不等 LLM）
    const highlights = await dbHighlightsAll(book.id);
    const notes = await dbNotesAll(book.id);
    const userHl = highlights.filter((h) => h.authorType === "user").length;
    const compHl = highlights.filter((h) => h.authorType === "companion").length;
    const favCount = highlights.filter((h) => h.kind === "favorite").length;
    const compNoteCount = notes.filter((n) => n.authorType === "companion").length;
    const sumText = [
        `我们一起读完了《${book.title}》。`,
        `${compName}划线 ${compHl} 处，你划线 ${userHl} 处，收藏 ${favCount} 处，留言 ${compNoteCount} 条。`,
    ].join(" ");

    // Companion 总结（一次 LLM）
    let compSummary = "";
    try {
        const { generateCompanionNote } = await import("./reading-engine");
        const raw = await generateCompanionNote(book, compId, {
            quote: sumText,
            chapterTitle: "全书回顾",
            contextParagraphs: [sumText],
            threadMessages: [],
        }).catch(() => "");
        if (raw) compSummary = raw;
    } catch { /* ignore */ }

    // Timeline 事件
    buildSharedReadingEntries(book.id, { sharedComplete: { characterName: compName, statsText: sumText } });

    // 强写记忆
    const memContent = compSummary ? `${sumText} ${compSummary}` : sumText;
    const mem: MemoryEntry = {
        id: `reading_complete_${book.id}`,
        characterId: compId,
        type: "long_term",
        content: memContent.slice(0, 2000),
        importance: 0.9,
        sourceApp: "reading",
        createdAt: now,
        updatedAt: now,
        metadata: { origin: "reading", bookId: book.id, eventType: "shared_complete" },
    };
    await saveMemoryEntry(mem);

    // 幂等标记
    await saveProgress({ ...progress, sharedCompleteAt: now });

    // 完成卡
    const contacts = loadChatContacts();
    const contact = contacts.find((c) => c.characterId === compId);
    if (contact) {
        const sessions = loadChatSessions();
        const session = sessions.find((s) => !s.isGroup && s.contactId === contact.id);
        if (session) {
            pushReadingDiscussCard({
                sessionId: session.id,
                bookInfo: { id: book.id, title: book.title },
                threadId: `shared_complete_${book.id}`,
                snippet: compSummary || sumText.slice(0, 80),
                noteCount: compNoteCount,
                kind: "complete",
            });
        }
    }
}

async function dbHighlightsAll(bookId: string) {
    try { return await loadHighlights(bookId, 0); } catch { return []; }
}
async function dbNotesAll(bookId: string) {
    try { return await loadNotes(bookId, 0); } catch { return []; }
}
