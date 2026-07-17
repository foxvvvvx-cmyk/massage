// lib/reading-types.ts — Type definitions for the Reading (阅读) feature.

export type Book = {
    id: string;
    title: string;
    author?: string;
    format: "txt" | "epub" | "pdf";
    totalChapters: number;
    createdAt: string;
};

export type BookChapter = {
    id: string;
    bookId: string;
    index: number;
    title: string;
    paragraphs: string[];
    /** PDF only: synthetic page chunk start (1-based) */
    pageStart?: number;
    /** PDF only: synthetic page chunk end (1-based) */
    pageEnd?: number;
    /** PDF only: page number (1-based) for each paragraph */
    paragraphPages?: number[];
    /** PDF only: vertical position (0-1 ratio) within page for each paragraph */
    paragraphYPositions?: number[];
};

export type ReadingProgress = {
    bookId: string;
    chapterIndex: number;
    scrollPosition: number;
    companionCharacterId?: string;
    progressFraction?: number;
    progressCurrent?: number;
    progressTotal?: number;
    progressScope?: "book" | "chapter";
    lastReadAt: string;
    /** 共读：Companion 的独立进度（Phase 2 由主动阅读推进） */
    companion?: CompanionReadingProgress;
    /** 共读完成事件的幂等标记（Phase 2） */
    sharedCompleteAt?: string;
};

export type ReadingAnnotation = {
    id: string;
    bookId: string;
    chapterIndex: number;
    paragraphIndex: number;
    characterId: string;
    characterName: string;
    content: string;
    createdAt: string;
};

// ── Shared Reading（一起阅读）──

/** 划线/收藏的作者：用户本人或伴读角色 */
export type ReadingAuthorType = "user" | "companion";

/** 句级锚点：段内句序号 + 快照，快照用于解析器变更后模糊重定位 */
export type ReadingSentenceAnchor = {
    chapterIndex: number;
    paragraphIndex: number;
    /** 段内句序号（reading-anchors.ts 的分句规则），-1 表示整段（PDF 降级） */
    sentenceIndex: number;
    /** 句子前 80 字快照 */
    snippet: string;
};

export type ReadingHighlight = ReadingSentenceAnchor & {
    id: string;
    bookId: string;
    kind: "underline" | "favorite";
    authorType: ReadingAuthorType;
    characterId?: string;
    characterName?: string;
    createdAt: string;
};

/** 页边留言：讨论结束后留在句子旁，重开书仍可见 */
export type ReadingNote = ReadingSentenceAnchor & {
    id: string;
    bookId: string;
    authorType: ReadingAuthorType;
    characterId?: string;
    characterName?: string;
    content: string;
    /** 来源讨论串（可选） */
    threadId?: string;
    createdAt: string;
};

export type ReadingNoteThreadMessage = {
    role: "user" | "assistant";
    content: string;
    createdAt: string;
};

/** "聊这句"讨论串：完整内容只存这里，不进普通聊天历史（聊天侧只留卡片入口） */
export type ReadingNoteThread = {
    id: string;
    bookId: string;
    characterId: string;
    characterName: string;
    anchor: ReadingSentenceAnchor;
    messages: ReadingNoteThreadMessage[];
    status: "open" | "closed";
    /** 已推送到聊天会话的卡片 messageId（幂等防重） */
    readingCardMessageId?: string;
    createdAt: string;
    updatedAt: string;
};

/** Companion 的独立阅读进度（挂在 ReadingProgress.companion，非索引字段，无需迁移） */
export type CompanionReadingProgress = {
    characterId: string;
    chapterIndex: number;
    paragraphIndex: number;
    /** 整书进度 0-1 */
    fraction?: number;
    updatedAt: string;
    /** 上次主动阅读会话时间（冷却用，Phase 2） */
    lastSessionAt?: string;
};
