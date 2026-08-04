/**
 * Shared rich-media message parser.
 *
 * Parse order:
 *   1. parseStateValues() → extract [好感度:72] etc.
 *   2. Extract [状态栏]...[/状态栏] display-only status panel
 *   3. Extract [内心]...[/内心] inner monologue
 *   4. split(/\n\n+/) → split by double newlines
 *   5. Parse each segment for rich-media markers (direct matching, no placeholders)
 */

import type { ChatMessage } from "./chat-storage";
import type { StateValue } from "./chat-storage";
import { parseStateValues, mergeStateValues } from "./state-value-parser";
import { stripActionShells } from "./action-parser";

// ── Types ──────────────────────────────────────────────

export interface ParsedMessagePart {
    content: string;
    mediaType?: ChatMessage["mediaType"];
    mediaData?: ChatMessage["mediaData"];
}

export interface ParsedAIResponse {
    parts: ParsedMessagePart[];
    stateValues: StateValue[];
    statusPanel: string;
    innerMonologue: string;
}

// ── Rich-media patterns (non-global, for single match with index) ──

const C = "\\s*[：:]\\s*"; // half-width or full-width colon, allowing surrounding spaces

function parseMuteMinutes(num?: string, unit?: string): number {
    const n = parseInt(num || "", 10);
    if (!Number.isFinite(n) || n <= 0) return 10;
    if (unit === "天") return n * 1440;
    if (unit === "小时") return n * 60;
    return n;
}

const RICH_PATTERNS: {
    regex: RegExp;
    build: (m: RegExpMatchArray) => ParsedMessagePart;
}[] = [
    {
        // 推荐联系人名片：[名片:角色名]。名字在渲染时按推荐人同世界实时解析，
        // 查无此人也放行成卡——点击后可现场生成该角色档案（幻觉转建档）。
        regex: new RegExp(`\\[名片${C}([^\\]]+)\\]`),
        build: (m) => ({
            content: "",
            mediaType: "contact_card" as const,
            mediaData: { contactCardName: m[1].trim(), label: m[1].trim() },
        }),
    },
    {
        regex: new RegExp(`\\[照片${C}(使用参考图|不使用参考图)${C}([^\\]]+)\\]`),
        build: (m) => ({
            content: "",
            mediaType: "image",
            mediaData: { label: m[2].trim(), useReferenceImage: m[1] === "使用参考图" },
        }),
    },
    {
        regex: new RegExp(`\\[照片${C}([^\\]]+)\\]`),
        build: (m) => ({
            content: "",
            mediaType: "image",
            mediaData: { label: m[1].trim(), useReferenceImage: false },
        }),
    },
    {
        regex: new RegExp(`\\[位置${C}([^\\]]+)\\]`),
        build: (m) => ({
            content: "",
            mediaType: "location",
            mediaData: { label: m[1] },
        }),
    },
    {
        regex: /\[([^\]]+)拍了拍([^\]]+)\]/,
        build: (m) => ({
            content: "",
            mediaType: "poke" as const,
            mediaData: { pokeSender: m[1]?.trim() || "", pokeTarget: m[2]?.trim() || "" },
        }),
    },
    {
        regex: new RegExp(`\\[表情包${C}([^\\]]+)\\]`),
        build: (m) => {
            const name = m[1].trim();
            return {
                content: "",
                mediaType: "sticker" as const,
                mediaData: { label: name },
            };
        },
    },
    {
        regex: new RegExp(`\\[引用${C}([^\\]]+)\\](.+)`),
        build: (m) => ({
            content: m[2].trim(),
            mediaType: "quote" as const,
            mediaData: { quotePreview: m[1].trim() },
        }),
    },
    {
        // [音乐:歌名-歌手] or [音乐:歌名]
        regex: new RegExp(`\\[音乐${C}([^\\]]+)\\]`),
        build: (m) => {
            const raw = m[1].trim();
            const sep = raw.indexOf("-");
            const title = sep > 0 ? raw.slice(0, sep).trim() : raw;
            const artist = sep > 0 ? raw.slice(sep + 1).trim() : "";
            return {
                content: "",
                mediaType: "music" as const,
                mediaData: { musicTitle: title, musicArtist: artist, label: raw },
            };
        },
    },
    {
        // [音乐分享:歌名] — AI shares a song as a card
        regex: new RegExp(`\\[音乐分享${C}([^\\]]+)\\]`),
        build: (m) => {
            const title = m[1].trim();
            return {
                content: "",
                mediaType: "music_share" as const,
                mediaData: { musicTitle: title, label: title },
            };
        },
    },
    {
        // [语音条:文字内容] — voice message
        regex: new RegExp(`\\[语音条${C}([^\\]]+)\\]`),
        build: (m) => ({
            content: "",
            mediaType: "audio" as const,
            mediaData: { label: m[1].trim() },
        }),
    },
    {
        regex: /\[我向[^\]]+发起了语音通话\]/,
        build: () => ({ content: "", mediaType: "voice_call" as const }),
    },
    {
        regex: /\[我向[^\]]+发起了视频通话\]/,
        build: () => ({ content: "", mediaType: "video_call" as const }),
    },
    // 群管理操作（权限在 processGroupParts 校验，无权限的标签直接丢弃）
    {
        regex: /\[([^\]]+?)将群主转让给了?([^\]]+?)\]/,
        build: (m) => ({ content: "", mediaType: "group_admin_notice" as const, mediaData: { adminAction: "transfer_owner" as const, adminActorName: m[1]?.trim(), adminTargetName: m[2]?.trim() } }),
    },
    {
        regex: /\[([^\]]+?)将([^\]]+?)设为了?管理员\]/,
        build: (m) => ({ content: "", mediaType: "group_admin_notice" as const, mediaData: { adminAction: "set_admin" as const, adminActorName: m[1]?.trim(), adminTargetName: m[2]?.trim() } }),
    },
    {
        regex: /\[([^\]]+?)取消了([^\]]+?)的管理员\]/,
        build: (m) => ({ content: "", mediaType: "group_admin_notice" as const, mediaData: { adminAction: "unset_admin" as const, adminActorName: m[1]?.trim(), adminTargetName: m[2]?.trim() } }),
    },
    {
        regex: /\[([^\]]+?)将([^\]]+?)移出了?群聊\]/,
        build: (m) => ({ content: "", mediaType: "group_admin_notice" as const, mediaData: { adminAction: "kick" as const, adminActorName: m[1]?.trim(), adminTargetName: m[2]?.trim() } }),
    },
    {
        regex: /\[([^\]]+?)邀请([^\]]+?)加入了?群聊\]/,
        build: (m) => ({ content: "", mediaType: "group_admin_notice" as const, mediaData: { adminAction: "invite" as const, adminActorName: m[1]?.trim(), adminTargetName: m[2]?.trim() } }),
    },
    {
        // [A将B禁言30分钟]（必须先于下面的宽松模式，否则 "A将B禁言了1天" 会被错误拆分）
        regex: /\[([^\]：:]+?)将([^\]：:]+?)禁言(?:了)?\s*(\d+)?\s*(分钟|小时|天)?\]/,
        build: (m) => ({
            content: "",
            mediaType: "group_admin_notice" as const,
            mediaData: {
                adminAction: "mute" as const,
                adminActorName: m[1]?.trim(),
                adminTargetName: m[2]?.trim(),
                adminMuteMinutes: parseMuteMinutes(m[3], m[4]),
            },
        }),
    },
    {
        // [A禁言了B:30分钟] / [A禁言了B]（默认10分钟）
        regex: /\[([^\]：:]+?)禁言了([^\]：:]+?)(?:[：:]\s*(\d+)\s*(分钟|小时|天))?\]/,
        build: (m) => ({
            content: "",
            mediaType: "group_admin_notice" as const,
            mediaData: {
                adminAction: "mute" as const,
                adminActorName: m[1]?.trim(),
                adminTargetName: m[2]?.trim(),
                adminMuteMinutes: parseMuteMinutes(m[3], m[4]),
            },
        }),
    },
    {
        regex: /\[([^\]]+?)解除了([^\]]+?)的禁言\]/,
        build: (m) => ({ content: "", mediaType: "group_admin_notice" as const, mediaData: { adminAction: "unmute" as const, adminActorName: m[1]?.trim(), adminTargetName: m[2]?.trim() } }),
    },
];

type RichPatternCandidate = {
    index: number;
    matchText: string;
    build: () => ParsedMessagePart;
};

function findBuiltInRichCandidate(segment: string): RichPatternCandidate | null {
    let best: { index: number; m: RegExpMatchArray; build: (m: RegExpMatchArray) => ParsedMessagePart } | null = null;
    for (const { regex, build } of RICH_PATTERNS) {
        const m = segment.match(regex);
        if (m && m.index !== undefined && (best === null || m.index < best.index)) {
            best = { index: m.index, m, build };
        }
    }
    if (!best) return null;
    const candidate = best;
    return {
        index: best.index,
        matchText: best.m[0],
        build: () => candidate.build(candidate.m),
    };
}

// ── Structured hidden block extraction ───────────────────

function extractBracketBlock(text: string, tag: string): { cleaned: string; content: string } {
    let content = "";
    let cleaned = text;
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`\\[${escapedTag}\\]([\\s\\S]*?)\\[\\/${escapedTag}\\]`, "g");

    let match;
    while ((match = rx.exec(cleaned)) !== null) {
        const block = match[1].trim();
        if (!block) continue;
        if (content) content += "\n\n";
        content += block;
    }
    cleaned = cleaned.replace(rx, "").trim();

    return { cleaned, content };
}

// ── Segment parser ──────────────────────────────────────

/**
 * Parse a segment for rich-media markers.
 * If found, splits into before-text + media + recurse(after-text).
 * If not found, pushes as plain text.
 */
function parseSegment(segment: string, parts: ParsedMessagePart[]) {
    // Pick the rich marker that appears EARLIEST in the text, not the first
    // pattern that happens to match. Otherwise, when an earlier-in-text marker
    // (e.g. [表情包:x]) belongs to a pattern listed after a later-in-text marker
    // (e.g. [...拍了拍...]), the earlier marker lands in the un-parsed `before`
    // chunk and leaks as literal text. Ties keep list order (priority).
    const best = findBuiltInRichCandidate(segment);

    if (best) {
        const before = segment.slice(0, best.index).trim();
        const after = segment.slice(best.index + best.matchText.length).trim();

        // `before` is guaranteed marker-free (we chose the earliest marker).
        if (before) parts.push({ content: before });
        parts.push(best.build());
        if (after) parseSegment(after, parts);
        return;
    }

    // No rich media — plain text
    parts.push({ content: segment });
}

// ── Main parser ──────────────────────────────────────────

export function parseAIResponse(rawText: string, previousState: StateValue[]): ParsedAIResponse {
    // 0. FIRST: extract ```html blocks and <style>+HTML before any processing
    const htmlBlockPlaceholders: { placeholder: string; original: string }[] = [];
    let protected_ = rawText;
    // Protect ```html...``` blocks
    protected_ = protected_.replace(/```html\s*\n[\s\S]*?```/g, (match) => {
        const placeholder = `\x00HTML_BLOCK_${htmlBlockPlaceholders.length}\x00`;
        htmlBlockPlaceholders.push({ placeholder, original: match });
        return placeholder;
    });
    // Protect <style>...</style> and following HTML until next double-newline + non-HTML
    protected_ = protected_.replace(/<style[\s\S]*?<\/style>[\s\S]*?(?=\n\n[^<\x00]|$)/gi, (match) => {
        const placeholder = `\x00HTML_BLOCK_${htmlBlockPlaceholders.length}\x00`;
        htmlBlockPlaceholders.push({ placeholder, original: match });
        return placeholder;
    });

    // Helper to restore placeholders
    const restore = (text: string) => {
        let r = text;
        for (const { placeholder, original } of htmlBlockPlaceholders) {
            r = r.split(placeholder).join(original);
        }
        return r;
    };

    // 1. Parse state values
    const parsedSV = parseStateValues(protected_);
    const stateValues = mergeStateValues(previousState, parsedSV.stateValues);

    // 1.5. Strip AI hallucination XML/bracket action shells
    const actionCleaned = stripActionShells(parsedSV.cleanText);

    // 2. Extract display-only status panel, then inner monologue
    const status = extractBracketBlock(actionCleaned, "状态栏");
    const mono = extractBracketBlock(status.cleaned, "内心");

    // 2.1. Collapse residual blank lines left by tag extraction
    const postCleaned = mono.cleaned.replace(/\n{3,}/g, "\n\n").trim();

    // 2.5. Merge [引用:...] with following reply text even if separated by newlines
    const mergedText = postCleaned.replace(/(\[引用[：:][^\]]+\])\s*\n+\s*/g, "$1");

    // 2.6. Collapse blank lines around [表情包:...] so stickers stay in the same segment as adjacent text
    const stickerMerged = mergedText
        .replace(/\n\n+(?=\[表情包[：:][^\]]+\])/g, "\n")
        .replace(/(\[表情包[：:][^\]]+\])\n\n+/g, "$1\n");

    // 3. Split by double newlines (placeholders still in place)
    const segments = stickerMerged.split(/\n\n+/).map(s => s.trim()).filter(Boolean);

    // 4. Parse each segment
    const parts: ParsedMessagePart[] = [];
    for (const seg of segments) {
        parseSegment(seg, parts);
    }

    // 5. Restore HTML block placeholders and keep unknown bracket protocols as plain text.
    //    Strip tool directives (获取指令/执行动作) from display content too: a
    //    directive-only segment would otherwise survive as a non-empty part, render
    //    as an empty bubble after the display layer strips it, and capture the inner
    //    monologue (which then has nowhere to attach). Stripping here makes such a
    //    part empty → filtered out → inner monologue lands on the first real reply.
    const cleaned = parts.map(p => {
        if (p.mediaType) return p;
        const display = restore(p.content)
            .replace(/\[[^\]]*?(?:获取指令|获取工具)[：:][^\]]*\]/g, "")
            .replace(/\[[^\]]*?(?:执行动作|工具调用)[：:][^\]]*?[（(][\s\S]*?[)）]\]/g, "")
            .trim();
        return { ...p, content: display };
    }).filter(p => p.mediaType || p.content);

    return {
        parts: cleaned,
        stateValues,
        statusPanel: restore(status.content),
        innerMonologue: restore(mono.content),
    };
}
