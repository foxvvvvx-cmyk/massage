"use client";

// components/reading/reading-note-thread.tsx — "聊这句"讨论浮窗。
// 持久化讨论串到 ReadingNoteThread（不进聊天历史），关闭时留留言 + 推卡片。

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { SendHorizontal, X } from "lucide-react";
import {
    loadNoteThreads,
    saveNoteThread,
    loadNotes,
    saveNote,
} from "@/lib/reading-storage";
import {
    generateSentenceDiscuss,
    generateCompanionNote,
    type SentenceDiscussParams,
} from "@/lib/reading-engine";
import { pushReadingDiscussCard, loadChatContacts, loadChatSessions } from "@/lib/chat-storage";
import type { Book, ReadingNoteThread, ReadingNote, ReadingSentenceAnchor, ReadingNoteThreadMessage } from "@/lib/reading-types";
import type { Character } from "@/lib/character-types";

export type NoteThreadProps = {
    book: Book;
    companion: { id: string; name: string; characterId: string };
    target: {
        anchor: ReadingSentenceAnchor;
        sentenceText: string;
        chapterTitle: string;
        contextParagraphs: string[];
    };
    onClose: () => void;
    onNotesChanged: () => void;
    onCardPushed: (bookId: string, threadId: string) => void;
};

function generateId(prefix: string): string {
    return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function ReadingNoteThreadPanel({
    book,
    companion,
    target,
    onClose,
    onNotesChanged,
    onCardPushed,
}: NoteThreadProps) {
    const [thread, setThread] = useState<ReadingNoteThread | null>(null);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [closing, setClosing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const anchor = target.anchor;

    // 载入或创建讨论串
    useEffect(() => {
        (async () => {
            const threads = await loadNoteThreads(book.id);
            const open = threads.find((t) =>
                t.status === "open" &&
                t.characterId === companion.id &&
                t.anchor.chapterIndex === anchor.chapterIndex &&
                t.anchor.paragraphIndex === anchor.paragraphIndex &&
                t.anchor.sentenceIndex === anchor.sentenceIndex
            );
            if (open) {
                setThread(open);
            } else {
                const now = new Date().toISOString();
                const newThread: ReadingNoteThread = {
                    id: generateId("reading_thread_"),
                    bookId: book.id,
                    characterId: companion.id,
                    characterName: companion.name,
                    anchor,
                    messages: [],
                    status: "open",
                    createdAt: now,
                    updatedAt: now,
                };
                await saveNoteThread(newThread);
                setThread(newThread);
            }
        })();
    }, [book.id, anchor, companion.id, companion.name]);

    // 滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [thread?.messages]);

    const buildParams = useCallback(
        (messages: ReadingNoteThreadMessage[]): SentenceDiscussParams => ({
            quote: target.sentenceText,
            chapterTitle: target.chapterTitle,
            contextParagraphs: target.contextParagraphs,
            threadMessages: messages,
        }),
        [target.chapterTitle, target.contextParagraphs, target.sentenceText],
    );

    const handleSend = useCallback(async () => {
        if (!input.trim() || !thread || sending) return;
        const userMsg: ReadingNoteThreadMessage = {
            role: "user",
            content: input.trim(),
            createdAt: new Date().toISOString(),
        };
        const updated: ReadingNoteThread = {
            ...thread,
            messages: [...thread.messages, userMsg],
            updatedAt: new Date().toISOString(),
        };
        setThread(updated);
        setInput("");
        setSending(true);

        const raw = await generateSentenceDiscuss(book, companion.id, buildParams(updated.messages)).catch(() => null);
        if (raw) {
            const aiMsg: ReadingNoteThreadMessage = {
                role: "assistant",
                content: raw,
                createdAt: new Date().toISOString(),
            };
            const final: ReadingNoteThread = {
                ...updated,
                messages: [...updated.messages, aiMsg],
                updatedAt: new Date().toISOString(),
            };
            setThread(final);
            await saveNoteThread(final);
        } else {
            await saveNoteThread(updated);
        }
        setSending(false);
    }, [input, thread, sending, book, companion.id, buildParams]);

    const handleCloseAndNote = useCallback(async () => {
        if (!thread || closing) return;
        setClosing(true);

        // 用户留言（最后一条用户消息或提示用户输入，这里取最后一条）
        const lastUserTurn = [...thread.messages].reverse().find((m) => m.role === "user");
        const userNoteText = lastUserTurn?.content.trim() || target.sentenceText.slice(0, 60);
        const userNote: ReadingNote = {
            id: generateId("reading_note_"),
            bookId: book.id,
            authorType: "user",
            content: userNoteText.length > 120 ? userNoteText.slice(0, 120) : userNoteText,
            threadId: thread.id,
            createdAt: new Date().toISOString(),
            ...anchor,
        };
        await saveNote(userNote);

        // Companion 留言
        const companionRaw = await generateCompanionNote(book, companion.id, buildParams(thread.messages)).catch(() => null);
        if (companionRaw) {
            const companionNote: ReadingNote = {
                id: generateId("reading_note_"),
                bookId: book.id,
                authorType: "companion",
                characterId: companion.id,
                characterName: companion.name,
                content: companionRaw,
                threadId: thread.id,
                createdAt: new Date().toISOString(),
                ...anchor,
            };
            await saveNote(companionNote);
        }

        // 推卡片到聊天（幂等：thread.readingCardMessageId 已存在时跳过）
        let readingCardMessageId = thread.readingCardMessageId;
        if (!readingCardMessageId) {
            const contacts = loadChatContacts();
            const contact = contacts.find((c) => c.characterId === companion.id);
            if (contact) {
                const sessions = loadChatSessions();
                const session = sessions.find((s) => !s.isGroup && s.contactId === contact.id);
                if (session) {
                    const snippet = target.sentenceText.length > 60 ? `${target.sentenceText.slice(0, 60)}…` : target.sentenceText;
                    const cardMsg = pushReadingDiscussCard({
                        sessionId: session.id,
                        bookInfo: { id: book.id, title: book.title },
                        threadId: thread.id,
                        snippet,
                        noteCount: thread.messages.length,
                    });
                    readingCardMessageId = cardMsg.id;
                    onCardPushed(book.id, thread.id);
                }
            }
        }

        const closed: ReadingNoteThread = {
            ...thread,
            status: "closed",
            readingCardMessageId,
            updatedAt: new Date().toISOString(),
        };
        await saveNoteThread(closed);
        setThread(closed);

        onNotesChanged();
        // 不自动关闭面板；用户可看到关闭结果后手动关
    }, [thread, closing, book, companion, target, anchor, buildParams, onNotesChanged, onCardPushed]);

    const snippetPreview = useMemo(
        () => target.sentenceText.length > 50 ? `${target.sentenceText.slice(0, 50)}…` : target.sentenceText,
        [target.sentenceText],
    );

    return (
        <div className="reading-note-thread reading-note-thread--open" data-no-nav="true">
            <div className="reading-note-thread-header">
                <span className="reading-note-thread-title">
                    📖 聊这句：{snippetPreview}
                </span>
                <button type="button" className="reading-note-thread-close-btn" onClick={onClose} aria-label="关闭">
                    <X size={16} />
                </button>
            </div>
            <div className="reading-note-thread-messages">
                {thread && thread.messages.length === 0 && (
                    <div className="reading-note-thread-empty">
                        和 {companion.name} 聊聊这句话
                    </div>
                )}
                {thread?.messages.map((m) => (
                    <div key={m.createdAt} className={`reading-note-thread-msg reading-note-thread-msg--${m.role}`}>
                        <div className="reading-note-thread-msg-bubble">{m.content}</div>
                    </div>
                ))}
                {sending && (
                    <div className="reading-note-thread-msg reading-note-thread-msg--assistant">
                        <div className="reading-note-thread-msg-bubble reading-note-thread-msg-bubble--typing">…</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="reading-note-thread-footer">
                <textarea
                    className="reading-note-thread-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                    placeholder={sending ? "……" : "说点什么..."}
                    rows={2}
                    disabled={sending || closing || thread?.status === "closed"}
                />
                <div className="reading-note-thread-actions">
                    <button
                        type="button"
                        className="ctx-menu-btn"
                        onClick={handleSend}
                        disabled={sending || closing || !input.trim() || thread?.status === "closed"}
                    >
                        <SendHorizontal size={14} /> 发送
                    </button>
                    {thread && thread.status === "open" && thread.messages.length > 0 && (
                        <button
                            type="button"
                            className="ctx-menu-btn ctx-menu-btn-outline"
                            onClick={() => { void handleCloseAndNote(); }}
                            disabled={closing}
                        >
                            {closing ? "……" : "结束并留言"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
