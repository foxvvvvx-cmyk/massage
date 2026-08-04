// lib/short-term-assembler.ts
// Reads native app data (chat messages, feature projections) and provides
// a unified timeline. Replaces the old ShortTermEvent IndexedDB approach.
// Used by: memory-bank-page (UI display), memory-summarizer (summarization input).

import { isReadingDiscussMessage, isSystemInstructionMessage, loadChatSessions, loadChatMessages, type ChatMessage } from "./chat-storage";
import { buildGroupAdminBracketText } from "./group-admin";
import { loadCharacters } from "./character-storage";
import { resolveUserIdentity } from "./settings-storage";
import { loadMemoryConfig } from "./memory-storage";
import { estimateTokens } from "./token-counter";
import { loadStoryProjectionEntries } from "./story-storage";
import { loadGameProjectionEntries } from "./game-storage";
import { stripStateAndInnerForPrompt } from "./prompt-sanitizer";
import { renderUserNameMacro } from "./user-macro";
import { loadChatOfflineProjectionEntries } from "./chat-offline-storage";
import { loadCheckPhoneProjectionEntries } from "./checkphone-storage";
import {
    formatPromptEventLabel,
    formatPromptTimestamp,
    formatStoredPromptEventContent,
    resolvePromptTimeAware,
    type PromptTimestampOptions,
} from "./prompt-time";

function formatPhotoDirectiveForPrompt(msg: ChatMessage): string {
    const description = msg.mediaData?.label?.trim() || "图片";
    const mode = msg.mediaData?.useReferenceImage === true ? "使用参考图" : "不使用参考图";
    return `[照片:${mode}:${description}]`;
}

export type NativeTimelineEntry = {
    id: string;
    sourceApp: "chat" | "story" | "game" | "checkphone" | "custom_app";
    sourceDetail?: "direct" | "group" | "system" | "story" | "chat_offline" | "game" | "checkphone" | "custom_app_event"; // chat sub-type: 1:1 vs group chat vs system note
    authorType?: "user" | "character" | "npc"; // who authored this entry
    sessionId?: string;
    groupSessionId?: string; // for group chat: which group session
    groupName?: string;      // for group chat: display name of the group
    timestamp: string; // ISO date
    content: string;   // formatted content for display / summarization
    customAppId?: string;
    customAppName?: string;
    customAppLabel?: string;
};

/** A single feature's recent data block for prompt injection. */
export type RecentBlock = {
    tag: string;     // XML tag name, e.g. "recent_chat"
    content: string; // formatted text (empty string = this block wraps the actual history)
};

export type UnifiedRecentItem =
    | {
        kind: "event";
        timestamp: string;
        sourceApp: NativeTimelineEntry["sourceApp"];
        sourceTag: string;
        text: string;
    }
    | {
        kind: "history";
        timestamp: string;
        historyIndex: number;
    };

function isPromptHiddenChatMessage(
    msg: Pick<ChatMessage, "mediaType" | "nativeToolResult" | "nativeToolCalls">,
    options?: { includeNativeToolHistory?: boolean },
): boolean {
    // 文本协议的工具往返（persistHiddenToolResult / persistHiddenAssistantToolTurn
    // 存的纯文本 tool_result，无 nativeToolResult 字段）必须回传——它们被持久化
    // 的目的就是 "for future LLM context"。只有原生工具轮的结构化残留才按
    // includeNativeToolHistory 开关控制。
    return (msg.nativeToolCalls?.length && !options?.includeNativeToolHistory)
        || (msg.mediaType === "tool_result" && !!msg.nativeToolResult && !options?.includeNativeToolHistory)
        || msg.mediaType === "tool_notice"
        || msg.mediaType === "memory_write_request";
}

function renderCharacterMacro(text: string, charName?: string | null): string {
    const resolvedName = charName?.trim() || "角色";
    return String(text ?? "").replace(/\{\{\s*char\s*\}\}/gi, resolvedName);
}

/**
 * Load a unified timeline of native app data for a character.
 * Aggregates chat messages and feature projections into a single sorted list.
 *
 * @param characterId - The character to load data for
 * @param options.afterTimestamp - Only include entries after this ISO timestamp
 */
export function loadNativeTimeline(
    characterId: string,
    options?: {
        afterTimestamp?: string;
        userName?: string;
        appId?: import("./settings-types").ContentAppId;
        excludeOfflineSessionId?: string;
        timeAware?: boolean;
        promptTimestampOptions?: PromptTimestampOptions;
    }
): NativeTimelineEntry[] {
    const entries: NativeTimelineEntry[] = [];
    const chars = loadCharacters();
    const userName = options?.userName ?? resolveUserIdentity(characterId, options?.appId)?.name ?? "用户";
    const charName = chars.find(c => c.id === characterId)?.name ?? "角色";
    const timeAware = resolvePromptTimeAware(options?.timeAware);
    const timestampOptions = options?.promptTimestampOptions;

    // ── Chat messages ──
    const sessions = loadChatSessions();
    // Include direct chat session AND group sessions where this character participates
    const session = sessions.find(s => !s.isGroup && s.contactId === characterId);
    const groupSessions = sessions.filter(s => s.isGroup && s.participantIds?.includes(characterId));

    // Process group sessions
    for (const gs of groupSessions) {
        const messages = loadChatMessages(gs.id);
        for (const msg of messages) {
            if (msg.isRetracted) continue;
            if (isPromptHiddenChatMessage(msg)) continue;
            if (options?.afterTimestamp && msg.createdAt <= options.afterTimestamp) continue;

            let sender: string;
            if (msg.role === "user") sender = userName;
            else if (isSystemInstructionMessage(msg)) sender = "系统指令";
            else if (msg.role === "system") continue; // skip system messages in group timeline
            else sender = msg.senderName || "未知";

            const msgLabel = formatPromptEventLabel(`群聊「${gs.groupName || "群聊"}」`, msg.createdAt, timeAware, timestampOptions);
            let content = stripStateAndInnerForPrompt(msg.content || "");

            // Action notifications: group format with names
            if (msg.mediaType === "poke") content = `[${msg.mediaData?.pokeSender || ""}拍了拍${msg.mediaData?.pokeTarget || ""}]`;
            else if (msg.mediaType === "group_admin_notice" && msg.mediaData?.adminAction) {
                content = buildGroupAdminBracketText(
                    msg.mediaData.adminAction,
                    msg.mediaData.adminActorName || "",
                    msg.mediaData.adminTargetName || "",
                    msg.mediaData.adminMuteMinutes,
                );
            }
            // Represent rich media as text when content is empty
            else if (!content && msg.mediaType) {
                if (msg.mediaType === "sticker") content = `[表情包:${msg.mediaData?.label || "贴纸"}]`;
                else if (msg.mediaType === "audio") content = `[语音条:${msg.mediaData?.label || "语音消息"}]`;
                else if (msg.mediaType === "image") content = formatPhotoDirectiveForPrompt(msg);
                else if (msg.mediaType === "contact_card") {
                    content = `[名片:${msg.mediaData?.contactCardName || msg.mediaData?.label || "联系人"}]`;
                }
                else if (msg.mediaType === "music_share") content = `[音乐分享:${msg.mediaData?.musicTitle || ""}]`;
                else if (msg.mediaType === "location") content = `[位置:${msg.mediaData?.label || ""}]`;
            }

            if (!content.trim()) continue;

            entries.push({
                id: msg.id,
                sourceApp: "chat",
                sourceDetail: "group",
                groupSessionId: gs.id,
                groupName: gs.groupName || "群聊",
                timestamp: msg.createdAt,
                content: `${msgLabel} ${sender}: ${content}`,
            });
        }
    }

    if (session) {
        const messages = loadChatMessages(session.id);
        for (const msg of messages) {
            if (msg.isRetracted) continue;
            if (isPromptHiddenChatMessage(msg)) continue;
            if (options?.afterTimestamp && msg.createdAt <= options.afterTimestamp) continue;

            const msgLabel = formatPromptEventLabel("私聊", msg.createdAt, timeAware, timestampOptions);

            if (msg.role === "system") {
                // UI-only notification — skip from prompt
                if (msg.mediaType === "music_notify") continue;
                if (msg.mediaType === "tool_notice") continue;
                if (msg.mediaType === "memory_write_request") continue;
                if (isSystemInstructionMessage(msg)) {
                    entries.push({
                        id: msg.id,
                        sourceApp: "chat",
                        sourceDetail: "system",
                        timestamp: msg.createdAt,
                        content: `${msgLabel} [系统指令] ${msg.content || ""}`,
                    });
                    continue;
                }
                // Music not found — reformat for prompt
                if (msg.mediaType === "music_not_found") {
                    const mTitle = msg.mediaData?.musicTitle || "未知歌曲";
                    entries.push({
                        id: msg.id,
                        sourceApp: "chat",
                        sourceDetail: "system",
                        timestamp: msg.createdAt,
                        content: `${msgLabel} ${mTitle}未被检索到，播放失败`,
                    });
                    continue;
                }
                entries.push({
                    id: msg.id,
                    sourceApp: "chat",
                    sourceDetail: "system",
                    timestamp: msg.createdAt,
                    content: `${msgLabel} ${msg.content || ""}`,
                });
                continue;
            }

            const sender = msg.role === "user" ? userName : charName;
            let content = stripStateAndInnerForPrompt(msg.content || "");

            // Action notifications: always override content to bracket format (stored content is natural language for UI)
            if (msg.mediaType === "poke") content = `[我拍了拍${msg.mediaData?.pokeTarget || ""}]`;
            // Represent rich media as text when content is empty
            else if (!content && msg.mediaType) {
                if (msg.mediaType === "sticker") content = `[表情包:${msg.mediaData?.label || "贴纸"}]`;
                else if (msg.mediaType === "audio") content = `[语音条:${msg.mediaData?.label || "语音消息"}]`;
                else if (msg.mediaType === "image") content = formatPhotoDirectiveForPrompt(msg);
                else if (msg.mediaType === "contact_card") {
                    content = `[名片:${msg.mediaData?.contactCardName || msg.mediaData?.label || "联系人"}]`;
                }
                else if (msg.mediaType === "voice_call" || msg.mediaType === "video_call") content = `[我发起了${msg.mediaType === "voice_call" ? "语音" : "视频"}通话]`;
                else if (msg.mediaType === "location") content = `[位置:${msg.mediaData?.label || ""}]`;
                else if (msg.mediaType === "music_share") content = `[音乐分享:${msg.mediaData?.musicTitle || ""}]`;
                else if (msg.mediaType === "media_file") {
                    const ft = msg.mediaData?.fileType;
                    const label = msg.mediaData?.fileName || "文件";
                    if (ft === "image") content = `[工具生成的图片:${label}]`;
                    else if (ft === "audio") content = `[工具生成的音频:${label}]`;
                    else if (ft === "video") content = `[工具生成的视频:${label}]`;
                    else content = `[工具生成的文件:${label}]`;
                }
            }

            if (!content.trim()) continue;

            entries.push({
                id: msg.id,
                sourceApp: "chat",
                sourceDetail: "direct",
                timestamp: msg.createdAt,
                content: `${msgLabel} ${sender}: ${content}`,
            });
        }
    }

    // ── Story projections ──
    const storyEntries = loadStoryProjectionEntries(characterId, {
        afterTimestamp: options?.afterTimestamp,
        userName,
        charName,
    });
    for (const storyEntry of storyEntries) {
        entries.push({
            id: storyEntry.id,
            sourceApp: "story",
            sourceDetail: "story",
            timestamp: storyEntry.timestamp,
            content: formatStoredPromptEventContent(storyEntry.content, {
                label: "事件",
                timestamp: storyEntry.timestamp,
                timeAware,
                timestampOptions,
            }),
        });
    }

    // ── Offline chat projections ──
    const offlineEntries = loadChatOfflineProjectionEntries(characterId, {
        afterTimestamp: options?.afterTimestamp,
        excludeSessionId: options?.excludeOfflineSessionId,
    });
    for (const offlineEntry of offlineEntries) {
        entries.push({
            id: offlineEntry.id,
            sourceApp: "chat",
            sourceDetail: "chat_offline",
            sessionId: offlineEntry.sessionId,
            groupSessionId: offlineEntry.groupSessionId,
            timestamp: offlineEntry.timestamp,
            content: formatStoredPromptEventContent(offlineEntry.content, {
                label: "事件",
                timestamp: offlineEntry.timestamp,
                timeAware,
                timestampOptions,
            }),
        });
    }

    // ── Game hall projections ──
    const gameEntries = loadGameProjectionEntries(characterId, {
        afterTimestamp: options?.afterTimestamp,
    });
    for (const gameEntry of gameEntries) {
        entries.push({
            id: gameEntry.id,
            sourceApp: "game",
            sourceDetail: "game",
            authorType: "character",
            timestamp: gameEntry.timestamp,
            content: `${formatPromptEventLabel("小游戏", gameEntry.timestamp, timeAware, timestampOptions)} ${gameEntry.summary}`,
        });
    }

    // ── Check phone projections ──
    const checkPhoneEntries = loadCheckPhoneProjectionEntries(characterId, {
        afterTimestamp: options?.afterTimestamp,
    });
    for (const checkPhoneEntry of checkPhoneEntries) {
        const rendered = renderCharacterMacro(renderUserNameMacro(checkPhoneEntry.content, userName), charName);
        entries.push({
            id: checkPhoneEntry.id,
            sourceApp: "checkphone",
            sourceDetail: "checkphone",
            authorType: "user",
            timestamp: checkPhoneEntry.timestamp,
            content: formatStoredPromptEventContent(rendered, {
                label: "查手机",
                timestamp: checkPhoneEntry.timestamp,
                timeAware,
                timestampOptions,
            }),
        });
    }

    // Sort by timestamp ascending
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return entries;
}

// Fixed order — lower = further from LLM output (appears higher in prompt)
const FEATURE_ORDER: Record<string, number> = { game: 0.5, checkphone: 1.7, story: 2, custom_app: 2.6, group_chat: 3, chat: 4 };
// Map appId → XML tag name for the "current feature" wrapper
const FEATURE_TAG: Record<string, string> = {
    chat: "recent_chat",
    group_chat: "recent_group_chat",
    story: "recent_events",
    game: "recent_game",
    checkphone: "recent_checkphone",
};

function getFeatureTag(appId: string): string {
    return appId === "custom_app" || appId.startsWith("custom_app:") ? "recent_custom_app" : FEATURE_TAG[appId] ?? FEATURE_TAG.chat;
}

function isChatOfflineEntry(entry: NativeTimelineEntry): boolean {
    return entry.sourceDetail === "chat_offline";
}

function formatCoReadingTimestamp(isoStr: string, timeAware: boolean, timestampOptions?: PromptTimestampOptions): string {
    if (!timeAware) return "";
    const ts = formatPromptTimestamp(isoStr, timestampOptions);
    return ts ? ts.replace("(", "（").replace(")", "）") : "";
}

function getReadingBookTitle(msg: ChatMessage, fallback = "当前书籍"): string {
    return msg.mediaData?.readingBookTitle?.trim() || fallback;
}

function buildCoReadingBoundaryEntries(
    history: ChatMessage[],
    params: { characterName: string; userName: string; timeAware: boolean; timestampOptions?: PromptTimestampOptions },
): NativeTimelineEntry[] {
    const entries: NativeTimelineEntry[] = [];
    let lastMode: "chat" | "reading" | null = null;
    let activeBookTitle = "";

    for (const msg of history) {
        if (msg.isRetracted) continue;
        if (isPromptHiddenChatMessage(msg)) continue;
        const mode = isReadingDiscussMessage(msg) ? "reading" : "chat";
        const bookTitle = mode === "reading" ? getReadingBookTitle(msg, activeBookTitle || "当前书籍") : activeBookTitle || "当前书籍";

        if (mode !== lastMode) {
            if (mode === "reading") {
                activeBookTitle = bookTitle;
                entries.push({
                    id: `coreading_start_${msg.id}`,
                    sourceApp: "chat",
                    sourceDetail: "direct",
                    sessionId: msg.sessionId,
                    timestamp: msg.createdAt,
                    content: `[共读${formatCoReadingTimestamp(msg.createdAt, params.timeAware, params.timestampOptions)}]${params.userName}和${params.characterName}开始了共读《${activeBookTitle}》`,
                });
            } else if (lastMode === "reading") {
                entries.push({
                    id: `coreading_end_${msg.id}`,
                    sourceApp: "chat",
                    sourceDetail: "direct",
                    sessionId: msg.sessionId,
                    timestamp: msg.createdAt,
                    content: `[共读${formatCoReadingTimestamp(msg.createdAt, params.timeAware, params.timestampOptions)}]${params.userName}和${params.characterName}结束了共读《${activeBookTitle || "当前书籍"}》`,
                });
            }
            lastMode = mode;
        }

        if (mode === "reading") activeBookTitle = bookTitle;
    }

    return entries;
}

// ── Shared Reading: 共读事件 Timeline ──

export type SharedReadingEvent = {
    companionReading?: {
        characterId: string;
        characterName: string;
        chaptersRead: number;
        paragraphsRead: number;
    };
    sharedComplete?: {
        characterName: string;
        statsText: string;
    };
};

/**
 * 从 reading-db 读取近期共读活动并生成 Timeline 条目。
 * 由 loadNativeTimeline 调用，对每个 reading-db 中有活动的书生成事件。
 * 注意：这里只是生 Timeline 条目——不写 DB，不触发记忆总结本身。
 */
export function buildSharedReadingEntries(
    bookId: string,
    event: SharedReadingEvent,
): NativeTimelineEntry[] {
    const entries: NativeTimelineEntry[] = [];
    const now = new Date().toISOString();
    const ts = `shared_reading_${bookId}`;

    if (event.companionReading) {
        const { characterName, chaptersRead, paragraphsRead } = event.companionReading;
        entries.push({
            id: `${ts}_companion_${now}`,
            sourceApp: "custom_app",
            sourceDetail: "custom_app_event",
            authorType: "character",
            timestamp: now,
            content: `${characterName}自己读了一会书（${chaptersRead}章，${paragraphsRead}段），留了新批注。`,
            customAppId: "reading",
            customAppName: "一起阅读",
            customAppLabel: "companion_reading",
        });
    }

    if (event.sharedComplete) {
        const { characterName, statsText } = event.sharedComplete;
        entries.push({
            id: `${ts}_complete_${now}`,
            sourceApp: "custom_app",
            sourceDetail: "custom_app_event",
            authorType: "character",
            timestamp: now,
            content: `我们一起读完了这本书：${statsText.slice(0, 200)}`,
            customAppId: "reading",
            customAppName: "一起阅读",
            customAppLabel: "shared_complete",
        });
    }

    return entries;
}

/** Keep newest entries that fit within a token budget. */
function truncateTimelineByTokenBudget(
    entries: NativeTimelineEntry[],
    budget: number,
): NativeTimelineEntry[] {
    if (budget <= 0) return entries;
    let total = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
        total += estimateTokens(entries[i].content) + 4;
        if (total > budget) return entries.slice(i + 1);
    }
    return entries;
}

/**
 * Unified interface for all modules to get short-term memory context.
 *
 * Returns `RecentBlock[]` + `truncatedHistory`.
 * All short-term content (timeline entries + history messages) is merged into one
 * timestamped pool and truncated from the oldest until total tokens ≤ shortTermTokenBudget.
 *
 * For history-style appIds, the current feature's block has empty content because
 * the actual content is the history turns (wrapped by the assembler).
 */
export function prepareShortTermContext(
    characterId: string,
    appId: string,
    options?: {
        userName?: string;
        history?: ChatMessage[];
        excludeGroupSessionId?: string;
        excludeOfflineSessionId?: string;
        includeNativeToolHistory?: boolean;
        includeDirectChatEntries?: boolean;
        timeAware?: boolean;
        promptTimestampOptions?: PromptTimestampOptions;
    },
): {
    recentBlocks: RecentBlock[];
    truncatedHistory: ChatMessage[];
    wbActivationContext: string;
    unifiedRecentItems: UnifiedRecentItem[];
} {
    const timeAware = resolvePromptTimeAware(options?.timeAware);
    const timeline = loadNativeTimeline(characterId, {
        userName: options?.userName,
        appId: appId as import("./settings-types").ContentAppId,
        excludeOfflineSessionId: options?.excludeOfflineSessionId,
        timeAware,
        promptTimestampOptions: options?.promptTimestampOptions,
    });
    // Activation context: full timeline for keyword matching (not truncated)
    const wbActivationContext = timeline.slice(-10).map(e => e.content).join("\n");

    const memConfig = loadMemoryConfig();
    const budget = memConfig.shortTermTokenBudget;
    const currentTag = getFeatureTag(appId);
    const history = options?.history ?? [];
    const characterName = loadCharacters().find(c => c.id === characterId)?.name ?? "角色";
    const wrapsCurrentHistory = appId === "chat" || appId === "group_chat" || appId === "story";
    const skipDirectChatEntries = appId === "chat" && !options?.includeDirectChatEntries;

    // ── Collect non-history entries per block ──
    const raw: { tag: string; order: number; entries: NativeTimelineEntry[] }[] = [];

    if (appId !== "story") {
        const storyEntries = timeline.filter(e =>
            e.sourceApp === "story"
            && !isChatOfflineEntry(e)
        );
        if (storyEntries.length > 0) {
            raw.push({ tag: "recent_events", order: FEATURE_ORDER.story, entries: storyEntries });
        }
    }

    const gameEventEntries = timeline.filter(e => e.sourceApp === "game");
    if (gameEventEntries.length > 0) {
        raw.push({ tag: "recent_game", order: FEATURE_ORDER.game, entries: gameEventEntries });
    }

    const checkPhoneEntries = timeline.filter(e => e.sourceApp === "checkphone");
    if (checkPhoneEntries.length > 0) {
        raw.push({ tag: "recent_checkphone", order: FEATURE_ORDER.checkphone, entries: checkPhoneEntries });
    }

    const customAppEntries = timeline.filter(e => e.sourceApp === "custom_app");
    if (customAppEntries.length > 0) {
        raw.push({ tag: "recent_custom_app", order: FEATURE_ORDER.custom_app, entries: customAppEntries });
    }

    const groupChatEntries = timeline.filter(e =>
        e.sourceApp === "chat"
        && e.sourceDetail === "group"
        && e.groupSessionId !== options?.excludeGroupSessionId
    );
    if (groupChatEntries.length > 0) {
        raw.push({ tag: "recent_group_chat", order: FEATURE_ORDER.group_chat, entries: groupChatEntries });
    }

    // Direct chat from timeline — skipped only when the current history already comes from chat/group_chat.
    if (!skipDirectChatEntries) {
        const chatEntries = timeline.filter(e => e.sourceApp === "chat" && e.sourceDetail === "direct");
        if (chatEntries.length > 0) {
            raw.push({ tag: "recent_chat", order: FEATURE_ORDER.chat, entries: chatEntries });
        }
    }

    const offlineGroupChatEntries = timeline.filter(e => isChatOfflineEntry(e) && e.groupSessionId);
    if (offlineGroupChatEntries.length > 0) {
        raw.push({ tag: "recent_group_chat", order: FEATURE_ORDER.group_chat, entries: offlineGroupChatEntries });
    }

    const offlineDirectChatEntries = timeline.filter(e => isChatOfflineEntry(e) && !e.groupSessionId);
    if (offlineDirectChatEntries.length > 0) {
        raw.push({ tag: "recent_chat", order: FEATURE_ORDER.chat, entries: offlineDirectChatEntries });
    }

    const coReadingEntries = buildCoReadingBoundaryEntries(history, {
        characterName,
        userName: options?.userName ?? "用户",
        timeAware,
        timestampOptions: options?.promptTimestampOptions,
    });
    if (coReadingEntries.length > 0) {
        raw.push({ tag: "recent_chat", order: FEATURE_ORDER.chat, entries: coReadingEntries });
    }

    // Sort blocks: by order ascending, current feature always last
    raw.sort((a, b) => {
        const aCur = a.tag === currentTag ? 1 : 0;
        const bCur = b.tag === currentTag ? 1 : 0;
        if (aCur !== bCur) return aCur - bCur;
        return a.order - b.order;
    });

    // ── Unified truncation: merge entries + history by timestamp, truncate from oldest ──
    type PoolItem =
        | { kind: "entry"; timestamp: string; tokens: number; entryId: string; sourceTag: string }
        | { kind: "history"; timestamp: string; tokens: number; msgIdx: number };

    const pool: PoolItem[] = [];
    const entryMeta = new Map<string, { entry: NativeTimelineEntry; sourceTag: string }>();
    for (const r of raw) {
        for (const e of r.entries) {
            entryMeta.set(e.id, { entry: e, sourceTag: r.tag });
            pool.push({ kind: "entry", timestamp: e.timestamp, tokens: estimateTokens(e.content) + 4, entryId: e.id, sourceTag: r.tag });
        }
    }
    for (let i = 0; i < history.length; i++) {
        if (isPromptHiddenChatMessage(history[i], { includeNativeToolHistory: options?.includeNativeToolHistory })) continue;
        pool.push({ kind: "history", timestamp: history[i].createdAt, tokens: estimateTokens(history[i].content) + 4, msgIdx: i });
    }

    pool.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Truncate from oldest until within budget
    let total = pool.reduce((sum, p) => sum + p.tokens, 0);
    let startIdx = 0;
    if (budget > 0) {
        while (total > budget && startIdx < pool.length) {
            total -= pool[startIdx].tokens;
            startIdx++;
        }
    }

    // Determine survivors
    const survivingEntryIds = new Set<string>();
    const survivingMsgIndices = new Set<number>();
    for (let i = startIdx; i < pool.length; i++) {
        const p = pool[i];
        if (p.kind === "entry") survivingEntryIds.add(p.entryId);
        else survivingMsgIndices.add(p.msgIdx);
    }

    // Build truncated history (preserve original order)
    const truncatedHistoryWithOrigIdx = history
        .map((msg, idx) => ({ msg, idx }))
        .filter(item => survivingMsgIndices.has(item.idx));
    const truncatedHistory = truncatedHistoryWithOrigIdx.map(item => item.msg);
    const historyIndexMap = new Map<number, number>();
    truncatedHistoryWithOrigIdx.forEach((item, idx) => {
        historyIndexMap.set(item.idx, idx);
    });

    // Build recentBlocks from surviving entries
    const recentBlocks: RecentBlock[] = [];
    for (const r of raw) {
        const surviving = r.entries.filter(e => survivingEntryIds.has(e.id));
        if (surviving.length === 0) continue;
        recentBlocks.push({ tag: r.tag, content: surviving.map(e => e.content).join("\n\n") });
    }

    // History-style apps use an empty wrapper block around the real history turns.
    if (wrapsCurrentHistory && truncatedHistory.length > 0) {
        recentBlocks.push({ tag: currentTag, content: "" });
    }

    const unifiedRecentItems: UnifiedRecentItem[] = [];
    for (let i = startIdx; i < pool.length; i++) {
        const item = pool[i];
        if (item.kind === "entry") {
            const meta = entryMeta.get(item.entryId);
            if (!meta) continue;
            unifiedRecentItems.push({
                kind: "event",
                timestamp: item.timestamp,
                sourceApp: meta.entry.sourceApp,
                sourceTag: meta.sourceTag,
                text: meta.entry.content,
            });
            continue;
        }

        const historyIndex = historyIndexMap.get(item.msgIdx);
        if (historyIndex === undefined) continue;
        unifiedRecentItems.push({
            kind: "history",
            timestamp: item.timestamp,
            historyIndex,
        });
    }

    return { recentBlocks, truncatedHistory, wbActivationContext, unifiedRecentItems };
}

function buildNativeTimelineKey(entry: NativeTimelineEntry): string {
    return [entry.sourceApp, entry.sourceDetail ?? "", entry.groupSessionId ?? "", entry.id].join(":");
}

export function prepareGroupShortTermContext(
    characterIds: string[],
    history: ChatMessage[],
    options?: {
        userName?: string;
        excludeGroupSessionId?: string;
        excludeOfflineSessionId?: string;
        includeNativeToolHistory?: boolean;
        timeAware?: boolean;
        promptTimestampOptions?: PromptTimestampOptions;
    },
): {
    truncatedHistory: ChatMessage[];
    wbActivationContext: string;
    unifiedRecentItems: UnifiedRecentItem[];
} {
    const uniqueCharacterIds = [...new Set(characterIds)];
    const timelineByKey = new Map<string, NativeTimelineEntry>();
    const timeAware = resolvePromptTimeAware(options?.timeAware);

    for (const characterId of uniqueCharacterIds) {
        const timeline = loadNativeTimeline(characterId, {
            userName: options?.userName,
            appId: "group_chat",
            excludeOfflineSessionId: options?.excludeOfflineSessionId,
            timeAware,
            promptTimestampOptions: options?.promptTimestampOptions,
        });
        for (const entry of timeline) {
            if (entry.sourceApp === "chat" && entry.sourceDetail === "group" && entry.groupSessionId === options?.excludeGroupSessionId) {
                continue;
            }
            timelineByKey.set(buildNativeTimelineKey(entry), entry);
        }
    }

    const timeline = [...timelineByKey.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const activationPool = [
        ...timeline.map(entry => ({ timestamp: entry.timestamp, content: entry.content })),
        ...history.filter(msg => msg.mediaType !== "tool_notice").map(msg => ({ timestamp: msg.createdAt, content: msg.content })),
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const wbActivationContext = activationPool.slice(-10).map(item => item.content).join("\n");

    const memConfig = loadMemoryConfig();
    const budget = memConfig.shortTermTokenBudget;

    const raw: { tag: string; order: number; entries: NativeTimelineEntry[] }[] = [];

    const storyEntries = timeline.filter(e =>
        e.sourceApp === "story"
        && !isChatOfflineEntry(e)
    );
    if (storyEntries.length > 0) {
        raw.push({ tag: "recent_events", order: FEATURE_ORDER.story, entries: storyEntries });
    }

    const gameEntries = timeline.filter(e => e.sourceApp === "game");
    if (gameEntries.length > 0) {
        raw.push({ tag: "recent_game", order: FEATURE_ORDER.game, entries: gameEntries });
    }

    const checkPhoneEntries = timeline.filter(e => e.sourceApp === "checkphone");
    if (checkPhoneEntries.length > 0) {
        raw.push({ tag: "recent_checkphone", order: FEATURE_ORDER.checkphone, entries: checkPhoneEntries });
    }

    const customAppEntries = timeline.filter(e => e.sourceApp === "custom_app");
    if (customAppEntries.length > 0) {
        raw.push({ tag: "recent_custom_app", order: FEATURE_ORDER.custom_app, entries: customAppEntries });
    }

    const groupChatEntries = timeline.filter(e => e.sourceApp === "chat" && e.sourceDetail === "group");
    if (groupChatEntries.length > 0) {
        raw.push({ tag: "recent_group_chat", order: FEATURE_ORDER.group_chat, entries: groupChatEntries });
    }

    const directChatEntries = timeline.filter(e => e.sourceApp === "chat" && e.sourceDetail === "direct");
    if (directChatEntries.length > 0) {
        raw.push({ tag: "recent_chat", order: FEATURE_ORDER.chat, entries: directChatEntries });
    }

    const offlineGroupChatEntries = timeline.filter(e => isChatOfflineEntry(e) && e.groupSessionId);
    if (offlineGroupChatEntries.length > 0) {
        raw.push({ tag: "recent_group_chat", order: FEATURE_ORDER.group_chat, entries: offlineGroupChatEntries });
    }

    const offlineDirectChatEntries = timeline.filter(e => isChatOfflineEntry(e) && !e.groupSessionId);
    if (offlineDirectChatEntries.length > 0) {
        raw.push({ tag: "recent_chat", order: FEATURE_ORDER.chat, entries: offlineDirectChatEntries });
    }

    type PoolItem =
        | { kind: "entry"; timestamp: string; tokens: number; entryId: string }
        | { kind: "history"; timestamp: string; tokens: number; msgIdx: number };

    const pool: PoolItem[] = [];
    const entryMeta = new Map<string, NativeTimelineEntry>();
    for (const block of raw) {
        for (const entry of block.entries) {
            const key = buildNativeTimelineKey(entry);
            entryMeta.set(key, entry);
            pool.push({
                kind: "entry",
                timestamp: entry.timestamp,
                tokens: estimateTokens(entry.content) + 4,
                entryId: key,
            });
        }
    }
    for (let i = 0; i < history.length; i++) {
        if (isPromptHiddenChatMessage(history[i], { includeNativeToolHistory: options?.includeNativeToolHistory })) continue;
        pool.push({
            kind: "history",
            timestamp: history[i].createdAt,
            tokens: estimateTokens(history[i].content) + 4,
            msgIdx: i,
        });
    }

    pool.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    let total = pool.reduce((sum, item) => sum + item.tokens, 0);
    let startIdx = 0;
    if (budget > 0) {
        while (total > budget && startIdx < pool.length) {
            total -= pool[startIdx].tokens;
            startIdx++;
        }
    }

    const survivingMsgIndices = new Set<number>();
    for (let i = startIdx; i < pool.length; i++) {
        const item = pool[i];
        if (item.kind === "history") {
            survivingMsgIndices.add(item.msgIdx);
        }
    }
    const truncatedHistoryWithOrigIdx = history
        .map((msg, idx) => ({ msg, idx }))
        .filter((item) => survivingMsgIndices.has(item.idx));
    const truncatedHistory = truncatedHistoryWithOrigIdx.map(item => item.msg);
    const historyIndexMap = new Map<number, number>();
    truncatedHistoryWithOrigIdx.forEach((item, idx) => {
        historyIndexMap.set(item.idx, idx);
    });

    const unifiedRecentItems: UnifiedRecentItem[] = [];
    for (let i = startIdx; i < pool.length; i++) {
        const item = pool[i];
        if (item.kind === "entry") {
            const entry = entryMeta.get(item.entryId);
            if (!entry) continue;
            unifiedRecentItems.push({
                kind: "event",
                timestamp: item.timestamp,
                sourceApp: entry.sourceApp,
                sourceTag: entry.sourceDetail === "group" ? "recent_group_chat" : (
                    entry.sourceApp === "game" ? "recent_game" :
                        entry.sourceApp === "checkphone" ? "recent_checkphone" :
                            entry.sourceApp === "custom_app" ? "recent_custom_app" :
                                entry.sourceApp === "chat" ? "recent_chat" : "recent_events"
                ),
                text: entry.content,
            });
            continue;
        }

        const historyIndex = historyIndexMap.get(item.msgIdx);
        if (historyIndex === undefined) continue;
        unifiedRecentItems.push({
            kind: "history",
            timestamp: item.timestamp,
            historyIndex,
        });
    }

    return { truncatedHistory, wbActivationContext, unifiedRecentItems };
}

/**
 * Format timeline entries for the summarization pipeline.
 * Returns the formatted event text and time range.
 */
export function formatTimelineForSummarization(
    entries: NativeTimelineEntry[],
    options?: { timeAware?: boolean },
): { eventsText: string; earliest: string; latest: string; count: number } | null {
    if (entries.length === 0) return null;

    const timeAware = resolvePromptTimeAware(options?.timeAware);
    const eventsText = entries
        .map(e => `- ${timeAware ? e.content : formatStoredPromptEventContent(e.content, {
            label: "事件",
            timestamp: e.timestamp,
            timeAware,
        })}`)
        .join("\n");
    return {
        eventsText,
        earliest: entries[0].timestamp,
        latest: entries[entries.length - 1].timestamp,
        count: entries.length,
    };
}
