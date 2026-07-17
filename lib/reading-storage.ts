// lib/reading-storage.ts — Dexie IndexedDB persistence for Reading feature.

import Dexie from "dexie";
import type {
    Book,
    BookChapter,
    ReadingProgress,
    ReadingAnnotation,
    ReadingHighlight,
    ReadingNote,
    ReadingNoteThread,
} from "./reading-types";
import { kvGet, kvSet, registerKvMigration } from "./kv-db";
import { DEFAULT_READING_BILINGUAL_PROMPT } from "./bilingual-prompt-defaults";

// ── Database ──

class ReadingDB extends Dexie {
    books!: Dexie.Table<Book, string>;
    chapters!: Dexie.Table<BookChapter, string>;
    progress!: Dexie.Table<ReadingProgress, string>;
    annotations!: Dexie.Table<ReadingAnnotation, string>;
    rawFiles!: Dexie.Table<{ bookId: string; data: Blob }, string>;
    highlights!: Dexie.Table<ReadingHighlight, string>;
    notes!: Dexie.Table<ReadingNote, string>;
    noteThreads!: Dexie.Table<ReadingNoteThread, string>;

    constructor() {
        super("reading-db");
        this.version(1).stores({
            books: "id",
            chapters: "id, bookId, [bookId+index]",
            progress: "bookId",
            annotations: "id, [bookId+chapterIndex]",
        });
        this.version(2).stores({
            books: "id, createdAt",
            chapters: "id, bookId, [bookId+index]",
            progress: "bookId",
            annotations: "id, [bookId+chapterIndex]",
        });
        this.version(3).stores({
            books: "id, createdAt",
            chapters: "id, bookId, [bookId+index]",
            progress: "bookId",
            annotations: "id, [bookId+chapterIndex]",
            rawFiles: "bookId",
        });
        // v4：共读（Shared Reading）——划线/页边留言/聊这句讨论串
        this.version(4).stores({
            books: "id, createdAt",
            chapters: "id, bookId, [bookId+index]",
            progress: "bookId",
            annotations: "id, [bookId+chapterIndex]",
            rawFiles: "bookId",
            highlights: "id, bookId, [bookId+chapterIndex]",
            notes: "id, bookId, [bookId+chapterIndex]",
            noteThreads: "id, bookId",
        });
    }
}

const db = new ReadingDB();

// ── In-memory cache ──

let _booksCache: Book[] | null = null;
const _chaptersCache: Map<string, BookChapter[]> = new Map();
const _progressCache: Map<string, ReadingProgress> = new Map();
const _annotationsCache: Map<string, ReadingAnnotation[]> = new Map(); // key: bookId:chapterIndex
const _highlightsCache: Map<string, ReadingHighlight[]> = new Map(); // key: bookId:chapterIndex
const _notesCache: Map<string, ReadingNote[]> = new Map(); // key: bookId:chapterIndex
const _noteThreadsCache: Map<string, ReadingNoteThread[]> = new Map(); // key: bookId

const READING_INTERACTION_CONFIG_KEY = "ai_phone_reading_interaction_config_v1";
registerKvMigration(READING_INTERACTION_CONFIG_KEY);
const RAW_FILE_DB_NAME = "reading-raw-files";
const RAW_FILE_STORE_NAME = "files";

export type ReadingInteractionConfig = {
    bilingualTranslationEnabled: boolean;
    collapseBilingualTranslation: boolean;
    bilingualTranslationPrompt: string;
    /** Phase 2: 允许 Companion 主动阅读（默认关，按用户费用考量显式开启） */
    sharedReadingEnabled: boolean;
};

export const DEFAULT_READING_INTERACTION_CONFIG: ReadingInteractionConfig = {
    bilingualTranslationEnabled: true,
    collapseBilingualTranslation: true,
    bilingualTranslationPrompt: DEFAULT_READING_BILINGUAL_PROMPT,
    sharedReadingEnabled: false,
};

export async function hydrateReadingStorage(): Promise<void> {
    _booksCache = await db.books.toArray();
    _booksCache.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ── Books ──

export function loadBooks(): Book[] {
    return _booksCache || [];
}

export async function addBook(book: Book): Promise<void> {
    await db.books.put(book);
    _booksCache = null;
    _booksCache = await db.books.orderBy("createdAt").reverse().toArray();
}

export async function updateBook(book: Book): Promise<void> {
    await db.books.put(book);
    _booksCache = null;
    _booksCache = await db.books.orderBy("createdAt").reverse().toArray();
}

export async function deleteBook(bookId: string): Promise<void> {
    await db.books.delete(bookId);
    await db.chapters.where("bookId").equals(bookId).delete();
    await db.progress.delete(bookId);
    await db.annotations.where("[bookId+chapterIndex]").between([bookId, Dexie.minKey], [bookId, Dexie.maxKey]).delete();
    await db.highlights.where("bookId").equals(bookId).delete();
    await db.notes.where("bookId").equals(bookId).delete();
    await db.noteThreads.where("bookId").equals(bookId).delete();
    await deleteRawFile(bookId).catch(() => {});
    _booksCache = null;
    _booksCache = await db.books.orderBy("createdAt").reverse().toArray();
    _chaptersCache.delete(bookId);
    _progressCache.delete(bookId);
    // Clear annotation cache for this book
    for (const key of _annotationsCache.keys()) {
        if (key.startsWith(bookId + ":")) _annotationsCache.delete(key);
    }
    for (const key of _highlightsCache.keys()) {
        if (key.startsWith(bookId + ":")) _highlightsCache.delete(key);
    }
    for (const key of _notesCache.keys()) {
        if (key.startsWith(bookId + ":")) _notesCache.delete(key);
    }
    _noteThreadsCache.delete(bookId);
}

// ── Chapters ──

export async function saveChapters(bookId: string, chapters: BookChapter[]): Promise<void> {
    await db.chapters.bulkPut(chapters);
    const existing = _chaptersCache.get(bookId) ?? await db.chapters.where("bookId").equals(bookId).toArray();
    const merged = new Map(existing.map((chapter) => [chapter.id, chapter]));
    for (const chapter of chapters) {
        merged.set(chapter.id, chapter);
    }
    const next = [...merged.values()].sort((a, b) => a.index - b.index);
    _chaptersCache.set(bookId, next);
}

export async function loadChapters(bookId: string): Promise<BookChapter[]> {
    if (_chaptersCache.has(bookId)) return _chaptersCache.get(bookId)!;
    const chapters = await db.chapters.where("bookId").equals(bookId).sortBy("index");
    _chaptersCache.set(bookId, chapters);
    return chapters;
}

// ── Progress ──

export async function loadProgress(bookId: string): Promise<ReadingProgress | null> {
    if (_progressCache.has(bookId)) return _progressCache.get(bookId)!;
    const p = await db.progress.get(bookId);
    if (p) _progressCache.set(bookId, p);
    return p || null;
}

export async function saveProgress(progress: ReadingProgress): Promise<void> {
    await db.progress.put(progress);
    _progressCache.set(progress.bookId, progress);
}

// ── Annotations ──

function annotationKey(bookId: string, chapterIndex: number): string {
    return `${bookId}:${chapterIndex}`;
}

export async function loadAnnotations(bookId: string, chapterIndex: number): Promise<ReadingAnnotation[]> {
    const key = annotationKey(bookId, chapterIndex);
    if (_annotationsCache.has(key)) return _annotationsCache.get(key)!;
    const annots = await db.annotations.where("[bookId+chapterIndex]").equals([bookId, chapterIndex]).toArray();
    _annotationsCache.set(key, annots);
    return annots;
}

export async function saveAnnotation(annotation: ReadingAnnotation): Promise<void> {
    await db.annotations.put(annotation);
    const key = annotationKey(annotation.bookId, annotation.chapterIndex);
    const cached = _annotationsCache.get(key) || [];
    const existingIndex = cached.findIndex((item) => item.id === annotation.id);
    if (existingIndex >= 0) cached[existingIndex] = annotation;
    else cached.push(annotation);
    _annotationsCache.set(key, cached);
}

export async function saveAnnotations(annotations: ReadingAnnotation[]): Promise<void> {
    if (annotations.length === 0) return;
    await db.annotations.bulkPut(annotations);
    // Refresh cache for affected chapters
    const affected = new Set(annotations.map(a => annotationKey(a.bookId, a.chapterIndex)));
    for (const key of affected) {
        const [bookId, chapterIdx] = key.split(":");
        _annotationsCache.set(key, await db.annotations.where("[bookId+chapterIndex]").equals([bookId, Number(chapterIdx)]).toArray());
    }
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
    const existing = await db.annotations.get(annotationId);
    if (!existing) return;

    await db.annotations.delete(annotationId);
    const key = annotationKey(existing.bookId, existing.chapterIndex);
    const cached = _annotationsCache.get(key);
    if (cached) {
        _annotationsCache.set(key, cached.filter((annotation) => annotation.id !== annotationId));
    }
}

// ── Shared Reading: Highlights（划线/收藏）──

export async function loadHighlights(bookId: string, chapterIndex: number): Promise<ReadingHighlight[]> {
    const key = annotationKey(bookId, chapterIndex);
    if (_highlightsCache.has(key)) return _highlightsCache.get(key)!;
    const items = await db.highlights.where("[bookId+chapterIndex]").equals([bookId, chapterIndex]).toArray();
    _highlightsCache.set(key, items);
    return items;
}

export async function saveHighlight(highlight: ReadingHighlight): Promise<void> {
    await db.highlights.put(highlight);
    const key = annotationKey(highlight.bookId, highlight.chapterIndex);
    const cached = _highlightsCache.get(key) || [];
    const existingIndex = cached.findIndex((item) => item.id === highlight.id);
    if (existingIndex >= 0) cached[existingIndex] = highlight;
    else cached.push(highlight);
    _highlightsCache.set(key, cached);
}

export async function deleteHighlight(highlightId: string): Promise<void> {
    const existing = await db.highlights.get(highlightId);
    if (!existing) return;
    await db.highlights.delete(highlightId);
    const key = annotationKey(existing.bookId, existing.chapterIndex);
    const cached = _highlightsCache.get(key);
    if (cached) _highlightsCache.set(key, cached.filter((item) => item.id !== highlightId));
}

/** 同一句上已有的同作者划线（用于 toggle 与"共同停留"判断） */
export async function findHighlightAtSentence(
    bookId: string,
    chapterIndex: number,
    paragraphIndex: number,
    sentenceIndex: number,
): Promise<ReadingHighlight[]> {
    const items = await loadHighlights(bookId, chapterIndex);
    return items.filter((item) => item.paragraphIndex === paragraphIndex && item.sentenceIndex === sentenceIndex);
}

// ── Shared Reading: Notes（页边留言）──

export async function loadNotes(bookId: string, chapterIndex: number): Promise<ReadingNote[]> {
    const key = annotationKey(bookId, chapterIndex);
    if (_notesCache.has(key)) return _notesCache.get(key)!;
    const items = await db.notes.where("[bookId+chapterIndex]").equals([bookId, chapterIndex]).toArray();
    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    _notesCache.set(key, items);
    return items;
}

export async function saveNote(note: ReadingNote): Promise<void> {
    await db.notes.put(note);
    const key = annotationKey(note.bookId, note.chapterIndex);
    const cached = _notesCache.get(key) || [];
    const existingIndex = cached.findIndex((item) => item.id === note.id);
    if (existingIndex >= 0) cached[existingIndex] = note;
    else cached.push(note);
    _notesCache.set(key, cached);
}

export async function deleteNote(noteId: string): Promise<void> {
    const existing = await db.notes.get(noteId);
    if (!existing) return;
    await db.notes.delete(noteId);
    const key = annotationKey(existing.bookId, existing.chapterIndex);
    const cached = _notesCache.get(key);
    if (cached) _notesCache.set(key, cached.filter((item) => item.id !== noteId));
}

// ── Shared Reading: Note Threads（"聊这句"讨论串）──

export async function loadNoteThreads(bookId: string): Promise<ReadingNoteThread[]> {
    if (_noteThreadsCache.has(bookId)) return _noteThreadsCache.get(bookId)!;
    const items = await db.noteThreads.where("bookId").equals(bookId).toArray();
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    _noteThreadsCache.set(bookId, items);
    return items;
}

export async function getNoteThread(threadId: string): Promise<ReadingNoteThread | null> {
    for (const list of _noteThreadsCache.values()) {
        const hit = list.find((item) => item.id === threadId);
        if (hit) return hit;
    }
    return (await db.noteThreads.get(threadId)) || null;
}

export async function saveNoteThread(thread: ReadingNoteThread): Promise<void> {
    await db.noteThreads.put(thread);
    const cached = _noteThreadsCache.get(thread.bookId) || [];
    const existingIndex = cached.findIndex((item) => item.id === thread.id);
    if (existingIndex >= 0) cached[existingIndex] = thread;
    else cached.unshift(thread);
    _noteThreadsCache.set(thread.bookId, cached);
}

export async function deleteNoteThread(threadId: string): Promise<void> {
    const existing = await db.noteThreads.get(threadId);
    if (!existing) return;
    await db.noteThreads.delete(threadId);
    const cached = _noteThreadsCache.get(existing.bookId);
    if (cached) _noteThreadsCache.set(existing.bookId, cached.filter((item) => item.id !== threadId));
}

// ── Shared Reading: 书架聚合 ──

export type SharedReadingSummary = {
    userFraction: number;
    companionFraction: number | null;
    companionName: string | null;
    myHighlightCount: number;
    favoriteCount: number;
    companionHighlightCount: number;
    companionNoteCount: number;
    latestCompanionNotes: ReadingNote[];
};

export async function loadSharedReadingSummary(bookId: string): Promise<SharedReadingSummary> {
    const progress = await loadProgress(bookId);
    const [highlights, notes] = await Promise.all([
        db.highlights.where("bookId").equals(bookId).toArray(),
        db.notes.where("bookId").equals(bookId).toArray(),
    ]);
    const companionNotes = notes
        .filter((note) => note.authorType === "companion")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
        userFraction: progress?.progressFraction ?? 0,
        companionFraction: progress?.companion?.fraction ?? null,
        companionName: companionNotes[0]?.characterName
            ?? highlights.find((h) => h.authorType === "companion")?.characterName
            ?? null,
        myHighlightCount: highlights.filter((h) => h.authorType === "user" && h.kind === "underline").length,
        favoriteCount: highlights.filter((h) => h.authorType === "user" && h.kind === "favorite").length,
        companionHighlightCount: highlights.filter((h) => h.authorType === "companion").length,
        companionNoteCount: companionNotes.length,
        latestCompanionNotes: companionNotes.slice(0, 3),
    };
}

// ── Reading Interaction Config ──

export function loadReadingInteractionConfig(): ReadingInteractionConfig {
    if (typeof window === "undefined") return DEFAULT_READING_INTERACTION_CONFIG;
    try {
        const raw = kvGet(READING_INTERACTION_CONFIG_KEY);
        if (!raw) return DEFAULT_READING_INTERACTION_CONFIG;
        return {
            ...DEFAULT_READING_INTERACTION_CONFIG,
            ...JSON.parse(raw),
        };
    } catch {
        return DEFAULT_READING_INTERACTION_CONFIG;
    }
}

export function saveReadingInteractionConfig(config: ReadingInteractionConfig): void {
    if (typeof window === "undefined") return;
    kvSet(READING_INTERACTION_CONFIG_KEY, JSON.stringify(config));
}

// ── Raw Files (for PDF native rendering) ──

function openRawFileDatabaseAt(version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        let request: IDBOpenDBRequest;
        try {
            request = version ? indexedDB.open(RAW_FILE_DB_NAME, version) : indexedDB.open(RAW_FILE_DB_NAME);
        } catch (err) {
            reject(err);
            return;
        }

        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(RAW_FILE_STORE_NAME)) {
                request.result.createObjectStore(RAW_FILE_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(request.error);
    });
}

async function openRawFileDatabase(): Promise<IDBDatabase> {
    let idb: IDBDatabase;
    try {
        idb = await openRawFileDatabaseAt(1);
    } catch (err) {
        if (err instanceof DOMException && err.name === "VersionError") {
            idb = await openRawFileDatabaseAt(undefined);
        } else {
            throw err;
        }
    }

    if (!idb.objectStoreNames.contains(RAW_FILE_STORE_NAME)) {
        const nextVersion = idb.version + 1;
        idb.close();
        idb = await openRawFileDatabaseAt(nextVersion);
    }

    return idb;
}

export async function saveRawFile(bookId: string, data: ArrayBuffer | Blob): Promise<void> {
    const idb = await openRawFileDatabase();
    await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(RAW_FILE_STORE_NAME, "readwrite");
        tx.objectStore(RAW_FILE_STORE_NAME).put(data instanceof Blob ? data : new Blob([data]), bookId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    idb.close();
}

export async function deleteRawFile(bookId: string): Promise<void> {
    const idb = await openRawFileDatabase();
    await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(RAW_FILE_STORE_NAME, "readwrite");
        tx.objectStore(RAW_FILE_STORE_NAME).delete(bookId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    idb.close();
}

export async function loadRawFile(bookId: string): Promise<ArrayBuffer | null> {
    const blob = await loadRawFileBlob(bookId);
    if (!blob) return null;
    return blob.arrayBuffer();
}

export async function loadRawFileBlob(bookId: string): Promise<Blob | null> {
    try {
        const idb = await openRawFileDatabase();
        const blob = await new Promise<Blob | null>((resolve, reject) => {
            const tx = idb.transaction(RAW_FILE_STORE_NAME, "readonly");
            const req = tx.objectStore(RAW_FILE_STORE_NAME).get(bookId);
            req.onsuccess = () => resolve(req.result as Blob || null);
            req.onerror = () => reject(req.error);
        });
        idb.close();
        return blob;
    } catch {
        return null;
    }
}
