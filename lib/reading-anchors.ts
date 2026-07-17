// lib/reading-anchors.ts — 共读句级锚点：分句、定位、快照模糊重定位。
// 被 reading-viewer（划线/聊这句）与 reading-companion-service（Phase 2）共用。

import type { BookChapter, ReadingSentenceAnchor } from "./reading-types";

export type SentenceSpan = {
    /** 段内句序号 */
    sentenceIndex: number;
    /** 在段落文本中的起始偏移（含） */
    charStart: number;
    /** 在段落文本中的结束偏移（不含） */
    charEnd: number;
    text: string;
};

const SNIPPET_MAX = 80;

/** 句末标点：中文句号/问叹/省略号/分号 + 英文 .!?; 后跟引号右括号也归入本句 */
const SENTENCE_END_RE = /[。！？；!?;…]+[”"'』」）)】\]]*/g;

/**
 * 把段落文本切成句子区间。规则从宽：无句末标点的整段视为一句；
 * 换行符视为硬边界。返回区间连续覆盖整段（含标点，不含首尾空白修剪）。
 */
export function splitParagraphSentences(paragraph: string): SentenceSpan[] {
    if (!paragraph) return [];
    const spans: SentenceSpan[] = [];
    let sentenceIndex = 0;
    let segmentStart = 0;

    const pushRange = (start: number, end: number) => {
        const text = paragraph.slice(start, end);
        if (!text.trim()) return;
        spans.push({ sentenceIndex: sentenceIndex++, charStart: start, charEnd: end, text });
    };

    const splitSegment = (segStart: number, segEnd: number) => {
        const segment = paragraph.slice(segStart, segEnd);
        SENTENCE_END_RE.lastIndex = 0;
        let cursor = 0;
        let match: RegExpExecArray | null;
        while ((match = SENTENCE_END_RE.exec(segment)) !== null) {
            const end = match.index + match[0].length;
            pushRange(segStart + cursor, segStart + end);
            cursor = end;
        }
        if (cursor < segment.length) pushRange(segStart + cursor, segEnd);
    };

    for (let i = 0; i <= paragraph.length; i++) {
        if (i === paragraph.length || paragraph[i] === "\n") {
            if (i > segmentStart) splitSegment(segmentStart, i);
            segmentStart = i + 1;
        }
    }
    return spans;
}

/** 段内偏移 → 所在句子（找不到时返回 null，例如偏移落在换行上） */
export function sentenceAtOffset(paragraph: string, offset: number): SentenceSpan | null {
    const spans = splitParagraphSentences(paragraph);
    for (const span of spans) {
        if (offset >= span.charStart && offset < span.charEnd) return span;
    }
    return spans.length > 0 ? spans[spans.length - 1] : null;
}

/** 构造锚点（snippet 截前 80 字） */
export function buildSentenceAnchor(
    chapterIndex: number,
    paragraphIndex: number,
    span: SentenceSpan | null,
): ReadingSentenceAnchor {
    return {
        chapterIndex,
        paragraphIndex,
        sentenceIndex: span ? span.sentenceIndex : -1,
        snippet: span ? span.text.trim().slice(0, SNIPPET_MAX) : "",
    };
}

export type ResolvedAnchor = {
    paragraphIndex: number;
    span: SentenceSpan | null;
    /** exact = 索引直接命中；fuzzy = 靠 snippet 在邻近段重定位；lost = 找不到 */
    match: "exact" | "fuzzy" | "lost";
};

/**
 * 把锚点解析回当前章节文本。解析器版本变化可能移动段落/句子索引，
 * 索引失配时用 snippet 在 ±2 段范围内模糊重定位；仍找不到则 lost（调用方
 * 应把对应留言归入"未定位"而非丢弃）。
 */
export function resolveSentenceAnchor(chapter: BookChapter, anchor: ReadingSentenceAnchor): ResolvedAnchor {
    const snippet = anchor.snippet.trim();
    const tryParagraph = (paragraphIndex: number, requireSnippet: boolean): ResolvedAnchor | null => {
        const paragraph = chapter.paragraphs[paragraphIndex];
        if (typeof paragraph !== "string") return null;
        const spans = splitParagraphSentences(paragraph);
        if (anchor.sentenceIndex === -1) {
            // 整段锚点（PDF 降级）：只要段落存在（必要时校验 snippet）即可
            if (!requireSnippet || !snippet || paragraph.includes(snippet)) {
                return { paragraphIndex, span: null, match: requireSnippet ? "fuzzy" : "exact" };
            }
            return null;
        }
        const byIndex = spans[anchor.sentenceIndex];
        if (byIndex && (!requireSnippet || !snippet || byIndex.text.includes(snippet) || snippet.includes(byIndex.text.trim().slice(0, SNIPPET_MAX)))) {
            return { paragraphIndex, span: byIndex, match: requireSnippet ? "fuzzy" : "exact" };
        }
        if (snippet) {
            const bySnippet = spans.find((span) => span.text.includes(snippet));
            if (bySnippet) return { paragraphIndex, span: bySnippet, match: "fuzzy" };
        }
        return null;
    };

    // 1) 原段落 + 原句序，snippet 校验
    const exact = tryParagraph(anchor.paragraphIndex, true);
    if (exact) return exact.match === "fuzzy" ? exact : { ...exact, match: "exact" };
    // 2) ±2 段模糊重定位
    for (const delta of [-1, 1, -2, 2]) {
        const fuzzy = tryParagraph(anchor.paragraphIndex + delta, true);
        if (fuzzy) return { ...fuzzy, match: "fuzzy" };
    }
    // 3) 无 snippet 的旧数据：索引直用
    if (!snippet) {
        const bare = tryParagraph(anchor.paragraphIndex, false);
        if (bare) return bare;
    }
    return { paragraphIndex: anchor.paragraphIndex, span: null, match: "lost" };
}
