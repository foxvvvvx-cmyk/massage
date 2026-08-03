"use client";

import { useState, useEffect, useRef, useSyncExternalStore, useMemo, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { getDebugChatState, getDebugPromptSnapshot, subscribeDebugChatState, subscribeDebugPromptSnapshot, type DebugPromptSnapshot } from "@/lib/debug-store";
import { previewPromptRequestSnapshot, ChatEngineError } from "@/lib/chat-engine";
import { previewGroupPromptRequestSnapshot } from "@/lib/group-chat-engine";
import { FileText, X } from "lucide-react";
import { previewCalendarPromptPayload } from "@/lib/calendar-engine";
import { CHAT_APP_SETTINGS_UPDATED_EVENT, loadChatAppSettings, loadChatContacts, loadChatMessages, loadChatSessions, type ChatSession } from "@/lib/chat-storage";
import { loadCharacters } from "@/lib/character-storage";
import type { LLMMessage } from "@/lib/llm-prompt-assembler";
import { getWeekStartIso } from "@/lib/calendar-utils";
import { loadStorySessions, loadStoryMessages } from "@/lib/story-storage";
import { previewStoryPromptPayload } from "@/lib/story-engine";
import { EXTRA_PROMPT_APPS, type ExtraPromptAppId } from "@/components/debug-prompt-registry";
import { hydrateReadingStorage, loadBooks, loadChapters, loadAnnotations } from "@/lib/reading-storage";
import { previewReadingAnnotationPrompt, previewReadingDiscussPrompt } from "@/lib/reading-engine";
import type { BookChapter } from "@/lib/reading-types";


type CoreDebugMode = "chat" | "calendar" | "story";
type DebugMode = CoreDebugMode | ExtraPromptAppId;

type UnifiedMessage = {
    role: string;
    content: string | import("@/lib/llm-prompt-assembler").LLMContentPart[];
    marker?: string;
    depth?: number;
    order?: number;
};

type PromptPreviewResult = {
    messages: LLMMessage[];
    characterName: string;
    model: string;
    presetName: string;
};

type FloatingPosition = {
    left: number;
    top: number;
};

type FloatingDragState = FloatingPosition & {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    maxLeft: number;
    maxTop: number;
    moved: boolean;
};

function stringifyContent(content: UnifiedMessage["content"]): string {
    if (typeof content === "string") return content;
    return content.map(p => p.type === "text" ? p.text : "[图片]").join("\n");
}

function splitMarkerBadges(marker?: string): string[] {
    if (!marker) return [];
    return marker.split(" + ").map(part => part.trim()).filter(Boolean);
}

function isExtraPromptMode(mode: DebugMode): mode is ExtraPromptAppId {
    return EXTRA_PROMPT_APPS.some(app => app.id === mode);
}

export function DebugPromptPanel() {
    const chatState = useSyncExternalStore(subscribeDebugChatState, getDebugChatState, () => null);
    const promptSnapshot = useSyncExternalStore(subscribeDebugPromptSnapshot, getDebugPromptSnapshot, () => null);
    const [collapsed, setCollapsed] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [mode, setMode] = useState<DebugMode>("chat");
    const [floatingPosition, setFloatingPosition] = useState<FloatingPosition | null>(null);
    const [draggingFloatingButton, setDraggingFloatingButton] = useState(false);
    const floatingDragRef = useRef<FloatingDragState | null>(null);
    const suppressFloatingClickRef = useRef(false);
    const [selectedChatSessionId, setSelectedChatSessionId] = useState("");
    const [followUpMode, setFollowUpMode] = useState(false);

    // Calendar state
    const [calendarResult, setCalendarResult] = useState<{
        messages: LLMMessage[];
        characterName: string;
        model: string;
        presetName: string;
    } | null>(null);
    const [calendarOwnerId, setCalendarOwnerId] = useState<string>("");
    const [calendarWeekStart, setCalendarWeekStart] = useState<string>(() => getWeekStartIso(new Date()));

    // Story state
    const [storyResult, setStoryResult] = useState<{
        messages: LLMMessage[];
        characterName: string;
        model: string;
        presetName: string;
    } | null>(null);
    const [storyCharacterId, setStoryCharacterId] = useState<string>("");

    // Extra app state (reading)
    const [extraResult, setExtraResult] = useState<PromptPreviewResult | null>(null);
    const [extraAppId, setExtraAppId] = useState<ExtraPromptAppId>("reading");
    const [extraCharacterId, setExtraCharacterId] = useState<string>("");
    const [readingBookId, setReadingBookId] = useState<string>("");
    const [readingChapterIndex, setReadingChapterIndex] = useState<string>("");
    const [readingChapters, setReadingChapters] = useState<BookChapter[]>([]);
    const [readingStorageVersion, setReadingStorageVersion] = useState(0);
    const [readingMode, setReadingMode] = useState<"annotate" | "discuss">("annotate");

    // Shared
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);
    const chatSessionOptions = useMemo(() => {
        if (typeof window === "undefined") return [] as { session: ChatSession; label: string }[];
        const sessions = loadChatSessions();
        const chars = loadCharacters();
        const charNameById = new Map(chars.map(c => [c.id, c.name]));
        return sessions.map(session => {
            if (session.isGroup) {
                const fallbackName = (session.participantIds || [])
                    .map(id => charNameById.get(id) || id)
                    .slice(0, 3)
                    .join("、");
                return {
                    session,
                    label: `群聊 · ${session.groupName || fallbackName || "未命名群聊"}`,
                };
            }
            return {
                session,
                label: charNameById.get(session.contactId) || session.alias || session.contactId,
            };
        });
    }, [enabled, chatState?.session?.id]);
    const activeChatSession = chatSessionOptions.find(option => option.session.id === selectedChatSessionId)?.session
        ?? chatState?.session
        ?? null;
    const activeChatSnapshot: DebugPromptSnapshot | null = (() => {
        if (!activeChatSession) return null;
        if (!promptSnapshot) return null;
        const appTags = promptSnapshot.appTags || [];
        const isChatRequest = promptSnapshot.appId === "chat"
            || promptSnapshot.appId === "group_chat"
            || appTags.includes("chat")
            || appTags.includes("group_chat");
        if (!isChatRequest) return null;
        if (promptSnapshot.sessionId !== activeChatSession.id) return null;
        return promptSnapshot;
    })();

    // Clear on mode/session change
    useEffect(() => {
        setCalendarResult(null);
        setStoryResult(null);
        setExtraResult(null);
        setError(null);
        setExpandedIdx(new Set());
    }, [activeChatSession?.id, mode, extraAppId, readingMode]);

    useEffect(() => {
        if (selectedChatSessionId && chatSessionOptions.some(option => option.session.id === selectedChatSessionId)) return;
        const nextSessionId = chatState?.session?.id
            ?? chatSessionOptions[0]?.session.id
            ?? "";
        if (nextSessionId !== selectedChatSessionId) setSelectedChatSessionId(nextSessionId);
    }, [chatSessionOptions, chatState?.session?.id, selectedChatSessionId]);

    useEffect(() => {
        const syncEnabled = (event?: Event) => {
            const detail = (event as CustomEvent | undefined)?.detail;
            const nextEnabled = typeof detail?.promptViewerEnabled === "boolean"
                ? detail.promptViewerEnabled
                : loadChatAppSettings().promptViewerEnabled === true;
            setEnabled(nextEnabled);
            if (!nextEnabled) setCollapsed(true);
        };
        syncEnabled();
        window.addEventListener(CHAT_APP_SETTINGS_UPDATED_EVENT, syncEnabled);
        return () => window.removeEventListener(CHAT_APP_SETTINGS_UPDATED_EVENT, syncEnabled);
    }, []);

    useEffect(() => {
        if (mode !== "chat" || !activeChatSnapshot) return;
        setError(null);
        setExpandedIdx(new Set());
        requestAnimationFrame(() => { scrollRef.current?.scrollTo(0, 0); });
    }, [activeChatSnapshot?.id, mode]);

    // Get unified messages for display.
    const displayMessages: UnifiedMessage[] = (() => {
        if (mode === "chat" && activeChatSnapshot) {
            return activeChatSnapshot.messages.map(m => ({
                role: m.role,
                content: m.content,
                marker: m.marker,
            }));
        }
        if (mode === "calendar" && calendarResult) {
            return calendarResult.messages.map(m => ({
                role: m.role,
                content: m.content,
                marker: m._debugMeta?.marker,
                depth: m._debugMeta?.depth,
                order: m._debugMeta?.order,
            }));
        }
        if (mode === "story" && storyResult) {
            return storyResult.messages.map(m => ({
                role: m.role,
                content: m.content,
                marker: m._debugMeta?.marker,
                depth: m._debugMeta?.depth,
                order: m._debugMeta?.order,
            }));
        }
        if (isExtraPromptMode(mode) && extraResult) {
            return extraResult.messages.map(m => ({
                role: m.role,
                content: m.content,
                marker: m._debugMeta?.marker,
                depth: m._debugMeta?.depth,
                order: m._debugMeta?.order,
            }));
        }
        return [];
    })();

    const resultMeta = mode === "chat"
        ? activeChatSnapshot
        : mode === "calendar"
            ? calendarResult
            : mode === "story"
                ? storyResult
                : extraResult;

    // ── Chat Preview ──
    async function handleChatPreview() {
        if (!activeChatSession) return;
        setError(null);
        setLoading(true);
        try {
            const latestMessages = loadChatMessages(activeChatSession.id);
            if (activeChatSession.isGroup) {
                await previewGroupPromptRequestSnapshot(activeChatSession, latestMessages);
            } else {
                await previewPromptRequestSnapshot(
                    activeChatSession,
                    latestMessages,
                    followUpMode
                        ? { followUpAuto: true, appTags: ["chat", "text", "followup"] }
                        : { appTags: ["chat", "text"] }
                );
            }
            setExpandedIdx(new Set());
            requestAnimationFrame(() => { scrollRef.current?.scrollTo(0, 0); });
        } catch (e) {
            setError(e instanceof ChatEngineError ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    // ── Calendar Preview ──
    async function handleCalendarPreview() {
        setError(null);
        setLoading(true);
        try {
            const result = await previewCalendarPromptPayload("character", calendarOwnerId, calendarWeekStart);
            setCalendarResult(result);
            setExpandedIdx(new Set());
            requestAnimationFrame(() => { scrollRef.current?.scrollTo(0, 0); });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setCalendarResult(null);
        } finally {
            setLoading(false);
        }
    }

    async function handleStoryPreview() {
        if (!storyCharacterId) return;
        setError(null);
        setLoading(true);
        try {
            const session = loadStorySessions().find(s => s.characterId === storyCharacterId);
            const history = session ? loadStoryMessages(session.id) : [];
            const result = await previewStoryPromptPayload(storyCharacterId, history, {
                sessionContextExcludedTags: session?.contextExcludedTags,
            });
            setStoryResult(result);
            setExpandedIdx(new Set());
            requestAnimationFrame(() => { scrollRef.current?.scrollTo(0, 0); });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStoryResult(null);
        } finally {
            setLoading(false);
        }
    }

    async function handleExtraPreview() {
        if (!extraCharacterId) return;
        setError(null);
        setLoading(true);
        try {
            let result: PromptPreviewResult;
            const book = loadBooks().find(item => item.id === readingBookId);
            const chapter = readingChapters.find(item => String(item.index) === readingChapterIndex);
            if (!book || !chapter) throw new Error("请先选择书籍与章节");
            const annotations = await loadAnnotations(book.id, chapter.index);
            if (readingMode === "discuss") {
                const session = chatSessionOptions.find(option => !option.session.isGroup && option.session.contactId === extraCharacterId)?.session;
                if (!session) throw new Error("没有找到这个角色的聊天会话，无法预览阅读对话");
                result = await previewReadingDiscussPrompt(session, book, {
                    chapterTitle: chapter.title,
                    chapterContent: [
                        "当前阅读中心：整章",
                        "本次上下文范围：整章",
                        "",
                        chapter.paragraphs.map((paragraph, index) => `[${index + 1}] ${paragraph}`).join("\n\n"),
                    ].join("\n"),
                    annotations,
                }, extraCharacterId);
            } else {
                result = await previewReadingAnnotationPrompt(book, chapter, annotations, extraCharacterId);
            }
            setExtraResult(result);
            setExpandedIdx(new Set());
            requestAnimationFrame(() => { scrollRef.current?.scrollTo(0, 0); });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setExtraResult(null);
        } finally {
            setLoading(false);
        }
    }

    // ── Expand/Collapse ──
    function toggleExpand(idx: number) {
        setExpandedIdx(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    }
    function expandAll() { setExpandedIdx(new Set(displayMessages.map((_, i) => i))); }
    function collapseAll() { setExpandedIdx(new Set()); }
    const allMessagesExpanded = displayMessages.length > 0 && expandedIdx.size === displayMessages.length;

    function clampFloatingPosition(value: number, max: number): number {
        return Math.min(Math.max(value, 12), max);
    }

    function getFloatingButtonBounds(button: HTMLButtonElement) {
        const parent = button.offsetParent instanceof HTMLElement ? button.offsetParent : null;
        const parentRect = parent?.getBoundingClientRect() ?? {
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight,
        };
        const rect = button.getBoundingClientRect();
        return {
            left: rect.left - parentRect.left,
            top: rect.top - parentRect.top,
            maxLeft: Math.max(12, parentRect.width - rect.width - 12),
            maxTop: Math.max(12, parentRect.height - rect.height - 12),
        };
    }

    function handleFloatingPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
        event.stopPropagation();
        const button = event.currentTarget;
        const bounds = getFloatingButtonBounds(button);
        floatingDragRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            left: bounds.left,
            top: bounds.top,
            maxLeft: bounds.maxLeft,
            maxTop: bounds.maxTop,
            moved: false,
        };
        setDraggingFloatingButton(true);
        button.setPointerCapture(event.pointerId);
    }

    function handleFloatingPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
        const drag = floatingDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.stopPropagation();
        const deltaX = event.clientX - drag.startClientX;
        const deltaY = event.clientY - drag.startClientY;
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            drag.moved = true;
        }
        setFloatingPosition({
            left: clampFloatingPosition(drag.left + deltaX, drag.maxLeft),
            top: clampFloatingPosition(drag.top + deltaY, drag.maxTop),
        });
    }

    function handleFloatingPointerEnd(event: ReactPointerEvent<HTMLButtonElement>) {
        const drag = floatingDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.stopPropagation();
        if (drag.moved) suppressFloatingClickRef.current = true;
        floatingDragRef.current = null;
        setDraggingFloatingButton(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    function handleFloatingButtonClick(event: ReactMouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        if (suppressFloatingClickRef.current) {
            suppressFloatingClickRef.current = false;
            return;
        }
        setCollapsed(false);
    }

    function handleModeChange(nextMode: DebugMode) {
        if (isExtraPromptMode(nextMode)) {
            setExtraAppId(nextMode);
        }
        setMode(nextMode);
    }

    const totalChars = displayMessages.reduce((sum, m) => sum + stringifyContent(m.content).length, 0);
    const estimatedTokens = Math.round(totalChars / 2);

    const debugTabs: [DebugMode, string][] = [
        ["chat", activeChatSession?.isGroup ? "群聊" : "聊天"],
        ["calendar", "日历"],
        ["story", "剧情"],
        ...EXTRA_PROMPT_APPS.map(app => [app.id, app.label] as [DebugMode, string]),
    ];

    // ── Character options (memoized) ──
    const charOptions = useMemo(() => {
        if (typeof window === "undefined") return [];
        const contacts = loadChatContacts();
        const chars = loadCharacters();
        const map = new Map<string, string>();
        contacts.forEach(c => {
            map.set(c.characterId, chars.find(ch => ch.id === c.characterId)?.name ?? c.characterId);
        });
        chars.forEach(c => map.set(c.id, c.name));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, []);

    const readingBookOptions = useMemo(() => {
        if (typeof window === "undefined") return [];
        return loadBooks().map(book => ({ id: book.id, title: book.title }));
    }, [enabled, extraAppId, readingStorageVersion]);

    useEffect(() => {
        if (calendarOwnerId || charOptions.length === 0) return;
        setCalendarOwnerId(charOptions[0].id);
    }, [calendarOwnerId, charOptions]);

    useEffect(() => {
        if (extraCharacterId || charOptions.length === 0) return;
        setExtraCharacterId(charOptions[0].id);
    }, [extraCharacterId, charOptions]);

    useEffect(() => {
        let cancelled = false;
        hydrateReadingStorage().then(() => {
            if (!cancelled) setReadingStorageVersion(version => version + 1);
        }).catch(() => undefined);
        return () => { cancelled = true; };
    }, [extraAppId]);

    useEffect(() => {
        if (readingBookId || readingBookOptions.length === 0) return;
        setReadingBookId(readingBookOptions[0].id);
    }, [readingBookId, readingBookOptions]);

    useEffect(() => {
        let cancelled = false;
        if (!readingBookId) {
            setReadingChapters([]);
            setReadingChapterIndex("");
            return;
        }
        loadChapters(readingBookId).then(chapters => {
            if (cancelled) return;
            setReadingChapters(chapters);
            const currentExists = readingChapterIndex && chapters.some(chapter => String(chapter.index) === readingChapterIndex);
            if (!currentExists) setReadingChapterIndex(chapters[0] ? String(chapters[0].index) : "");
        }).catch(() => {
            if (cancelled) return;
            setReadingChapters([]);
            setReadingChapterIndex("");
        });
        return () => { cancelled = true; };
    }, [readingBookId, readingChapterIndex]);

    if (!enabled) return null;

    if (collapsed) {
        return (
            <button
                type="button"
                className="prompt-viewer-float-button"
                aria-label="打开提示词查看器"
                data-positioned={floatingPosition ? "" : undefined}
                data-dragging={draggingFloatingButton ? "" : undefined}
                onPointerDown={handleFloatingPointerDown}
                onPointerMove={handleFloatingPointerMove}
                onPointerUp={handleFloatingPointerEnd}
                onPointerCancel={handleFloatingPointerEnd}
                onClick={handleFloatingButtonClick}
                style={floatingPosition ? { left: floatingPosition.left, top: floatingPosition.top } : undefined}
            >
                <FileText size={24} strokeWidth={1.9} />
            </button>
        );
    }

    const renderCharSelect = (value: string, onChange: (v: string) => void) => (
        <select value={value} onChange={e => onChange(e.target.value)} className="pv-select">
            <option value="">选择角色...</option>
            {charOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
    );

    const renderPreviewBtn = (onClick: () => void, disabled: boolean) => (
        <button onClick={onClick} disabled={disabled} className="pv-btn pv-btn-primary">
            {loading ? "加载中..." : "预览"}
        </button>
    );

    const getExtraPreviewWarning = () => {
        if (extraAppId === "reading") {
            return "实际上下文以阅读实际场景注入，不按章节注入，此处仅为模拟";
        }
        return null;
    };

    const renderExtraPreviewWarning = () => {
        const warning = getExtraPreviewWarning();
        return warning ? <span className="pv-context-warning">{warning}</span> : null;
    };

    const renderExtraControls = () => (
        <>
            {renderCharSelect(extraCharacterId, setExtraCharacterId)}
            {extraAppId === "reading" && (
                <>
                    <select value={readingMode} onChange={e => setReadingMode(e.target.value as "annotate" | "discuss")} className="pv-select">
                        <option value="annotate">批注</option>
                        <option value="discuss">对话</option>
                    </select>
                    <select value={readingBookId} onChange={e => setReadingBookId(e.target.value)} className="pv-select">
                        <option value="">选择书籍...</option>
                        {readingBookOptions.map(book => <option key={book.id} value={book.id}>{book.title}</option>)}
                    </select>
                    <select value={readingChapterIndex} onChange={e => setReadingChapterIndex(e.target.value)} className="pv-select">
                        <option value="">选择章节...</option>
                        {readingChapters.map(chapter => (
                            <option key={chapter.id} value={String(chapter.index)}>{chapter.title}</option>
                        ))}
                    </select>
                </>
            )}
            {renderPreviewBtn(handleExtraPreview, loading || !extraCharacterId)}
            {renderExtraPreviewWarning()}
        </>
    );

    return (
        <div className="pv-panel" onPointerDown={e => e.stopPropagation()}>
            {/* Header */}
            <div className="pv-header">
                <span className="pv-header-title">提示词查看器</span>
                {resultMeta && <span className="pv-header-meta">{resultMeta.characterName}</span>}
                <span style={{ flex: 1 }} />
                <button type="button" className="pv-close-btn" aria-label="关闭" onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}>
                    <X size={18} strokeWidth={2} />
                </button>
            </div>

            {/* Tabs */}
            <div className="pv-tabs">
                {debugTabs.map(([key, label]) => (
                    <button key={key} className="pv-tab" onClick={() => handleModeChange(key)} {...(mode === key ? { "data-active": "" } : {})}>
                        {label}
                    </button>
                ))}
            </div>
            <div className="pv-divider" />

            {/* Toolbar */}
            <div className="pv-toolbar">
                {mode === "chat" && (
                    <>
                        <select
                            value={activeChatSession?.id || ""}
                            onChange={e => setSelectedChatSessionId(e.target.value)}
                            className="pv-select"
                        >
                            <option value="">选择聊天...</option>
                            {chatSessionOptions.map(option => (
                                <option key={option.session.id} value={option.session.id}>{option.label}</option>
                            ))}
                        </select>
                        <button onClick={handleChatPreview} disabled={loading || !activeChatSession} className="pv-btn pv-btn-primary">
                            {loading ? "加载中..." : "预览 Prompt"}
                        </button>
                        {activeChatSession && !activeChatSession.isGroup && (
                            <button onClick={() => setFollowUpMode(f => !f)} className="pv-toggle" {...(followUpMode ? { "data-active": "" } : {})}>
                                {followUpMode ? "追发 ON" : "追发 OFF"}
                            </button>
                        )}
                    </>
                )}
                {mode === "calendar" && (
                    <>
                        {renderCharSelect(calendarOwnerId, setCalendarOwnerId)}
                        <input type="date" value={calendarWeekStart} onChange={e => setCalendarWeekStart(e.target.value || getWeekStartIso(new Date()))} className="pv-select" />
                        {renderPreviewBtn(handleCalendarPreview, loading || !calendarOwnerId)}
                    </>
                )}
                {mode === "story" && (
                    <>
                        {renderCharSelect(storyCharacterId, setStoryCharacterId)}
                        {renderPreviewBtn(handleStoryPreview, loading || !storyCharacterId)}
                    </>
                )}
                {isExtraPromptMode(mode) && renderExtraControls()}
                {displayMessages.length > 0 && (
                    <button onClick={allMessagesExpanded ? collapseAll : expandAll} className="pv-btn pv-btn-ghost">
                        {allMessagesExpanded ? "全部折叠" : "全部展开"}
                    </button>
                )}
                {resultMeta && (
                    <span className="pv-toolbar-meta">{resultMeta.model} · {resultMeta.presetName}</span>
                )}
            </div>
            <div className="pv-divider" />

            {/* Body */}
            <div ref={scrollRef} className="pv-body">
                {error && <div className="pv-error">{error}</div>}

                {displayMessages.map((msg, idx) => {
                    const isExpanded = expandedIdx.has(idx);
                    const textContent = stringifyContent(msg.content);
                    const preview = textContent.slice(0, 120);
                    const needsTruncation = textContent.length > 120;
                    const markerBadges = splitMarkerBadges(msg.marker);

                    return (
                        <div key={idx} className="pv-msg">
                            <div className="pv-msg-header" onClick={() => toggleExpand(idx)}>
                                <span className="pv-msg-role" data-role={msg.role}>{msg.role}</span>
                                {markerBadges.map((badge, bi) => (
                                    <span key={`${idx}-${bi}`} className="pv-msg-badge">{badge}</span>
                                ))}
                                {msg.depth !== undefined && (
                                    <span className="pv-msg-depth">D:{msg.depth} O:{msg.order}</span>
                                )}
                                <span style={{ flex: 1 }} />
                                <span className="pv-msg-toggle">
                                    {isExpanded ? "▼" : "▶"} {textContent.length}c
                                </span>
                            </div>
                            <div className="pv-msg-body" style={{
                                maxHeight: isExpanded ? undefined : 60,
                                overflow: isExpanded ? undefined : "hidden",
                            }}>
                                {isExpanded ? textContent : (needsTruncation ? preview + "..." : preview)}
                            </div>
                        </div>
                    );
                })}

                {displayMessages.length === 0 && !error && (
                    <div className="pv-empty">
                        {mode === "chat"
                            ? (activeChatSession ? "点击「预览 Prompt」查看下一轮会发送的真实提示词" : "选择聊天对象后点击「预览 Prompt」")
                            : mode === "calendar" ? "选择角色与日期后点击「预览」"
                            : mode === "story" ? "选择角色后点击「预览」查看剧情 Prompt"
                            : isExtraPromptMode(mode)
                                ? EXTRA_PROMPT_APPS.find(app => app.id === mode)?.emptyText ?? "选择 APP 后点击「预览」"
                                : "选择 APP 后点击「预览」"
                        }
                    </div>
                )}
            </div>

            {/* Footer */}
            {displayMessages.length > 0 && (
                <>
                    <div className="pv-divider" />
                    <div className="pv-footer">
                        <span>{displayMessages.length} 条消息</span>
                        <span>{totalChars.toLocaleString()} 字符</span>
                        <span>~{estimatedTokens.toLocaleString()} tokens</span>
                    </div>
                </>
            )}
        </div>
    );
}
