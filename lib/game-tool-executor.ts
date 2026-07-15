import type { LlmToolCall } from "./llm-provider-adapter";
import type { ToolResult } from "./tool-executor";
import type { GameManifest } from "./game-tool-definitions";
import { GAME_HTML_MAX_CHARS } from "./game-tool-definitions";
import {
    loadGameState,
    saveGameState,
    installGameTemplate,
    deleteInstalledGame,
} from "./game-storage";
import type { GameTemplate } from "./game-types";
import { kvGet, kvSet, registerKvMigration } from "./kv-db";

const VERSION_HISTORY_KEY = "ai_phone_game_ai_versions_v1";
registerKvMigration(VERSION_HISTORY_KEY);
const MAX_VERSION_HISTORY = 10;

type VersionRecord = {
    version: number;
    title: string;
    gameHtml: string;
    manifest?: GameManifest;
    changeDescription?: string;
    savedAt: string;
};

type VersionHistoryMap = Record<string, VersionRecord[]>;

function loadVersionHistory(): VersionHistoryMap {
    if (typeof window === "undefined") return {};
    try {
        const raw = kvGet(VERSION_HISTORY_KEY);
        return raw ? JSON.parse(raw) as VersionHistoryMap : {};
    } catch {
        return {};
    }
}

function saveVersionHistory(history: VersionHistoryMap): void {
    if (typeof window === "undefined") return;
    kvSet(VERSION_HISTORY_KEY, JSON.stringify(history));
}

function pushVersion(localId: string, record: VersionRecord): void {
    const history = loadVersionHistory();
    const entries = history[localId] ?? [];
    entries.push(record);
    history[localId] = entries.slice(-MAX_VERSION_HISTORY);
    saveVersionHistory(history);
}

const EMPTY_PICKER_HTML =
    "<!doctype html>" +
    "<html><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "</head><body></body></html>";

function createId(prefix: string): string {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function cleanText(value: unknown, maxLength: number): string {
    return String(value ?? "").trim().slice(0, maxLength);
}

function parseManifest(value: unknown): GameManifest | undefined {
    if (!value || typeof value !== "object") return undefined;
    const r = value as Record<string, unknown>;
    const title = cleanText(r.title, 80);
    const type = cleanText(r.type, 40);
    if (!title || !type) return undefined;
    return {
        title,
        type,
        features: Array.isArray(r.features)
            ? r.features.map(f => cleanText(f, 40)).filter(Boolean).slice(0, 10)
            : [],
        description: cleanText(r.description, 600),
    };
}

export async function executeGameToolCall(
    call: LlmToolCall,
    _signal?: AbortSignal,
): Promise<{ result: ToolResult; formattedContent: string }> {
    switch (call.name) {
        case "game_create": return handleGameCreate(call);
        case "game_update": return handleGameUpdate(call);
        case "game_list":   return handleGameList();
        case "game_delete": return handleGameDelete(call);
        case "game_run":    return handleGameRun(call);
        default:
            return {
                result: {
                    name: call.name,
                    success: false,
                    error: "unknown game tool: " + call.name,
                    continueConversation: true,
                },
                formattedContent: "unknown game tool: " + call.name,
            };
    }
}

async function handleGameCreate(
    call: LlmToolCall,
): Promise<{ result: ToolResult; formattedContent: string }> {
    const title = cleanText(call.args.title, 80);
    const gameHtml = typeof call.args.game_html === "string"
        ? call.args.game_html.trim()
        : "";

    if (!title) {
        return {
            result: { name: "game_create", success: false, error: "no title" },
            formattedContent: "game_create failed: no title",
        };
    }
    if (!gameHtml) {
        return {
            result: { name: "game_create", success: false, error: "no html" },
            formattedContent: "game_create failed: no html",
        };
    }
    if (gameHtml.length > GAME_HTML_MAX_CHARS) {
        return {
            result: { name: "game_create", success: false, error: "html too large" },
            formattedContent:
                "game_create failed: html too large (" +
                gameHtml.length + " > " + GAME_HTML_MAX_CHARS + ")",
        };
    }

    const manifest = parseManifest(call.args.manifest);

    const template: GameTemplate = {
        id: createId("ai_game"),
        title,
        codeName:
            title.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 40) || "AI_GAME",
        subtitle: manifest?.description?.slice(0, 160) ?? "",
        synopsis: manifest?.description?.slice(0, 600) ?? "",
        playNote: manifest?.description ?? "AI: " + title,
        coverImage: "",
        tags: manifest
            ? [manifest.type, ...manifest.features].filter(Boolean).slice(0, 8)
            : ["ai_created"],
        authorId: "ai_creator",
        authorName: "AI",
        authorAvatar: "",
        source: "local" as const,
        version: 1,
        roleSlots: [],
        pickerHtml: EMPTY_PICKER_HTML,
        gameHtml,
        allowExternalControl: false,
        purchaseCount: 0,
        rating: 0,
        likeCount: 0,
        favoriteCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const ir = installGameTemplate(template);
    if (!ir.ok) {
        return {
            result: {
                name: "game_create",
                success: false,
                error: ir.error || "install failed",
                continueConversation: true,
            },
            formattedContent: "game_create failed: " + (ir.error || "unknown"),
        };
    }

    pushVersion(ir.installedGame!.localId, {
        version: 1,
        title,
        gameHtml,
        manifest,
        changeDescription: "created",
        savedAt: new Date().toISOString(),
    });

    return {
        result: {
            name: "game_create",
            success: true,
            data: "id=" + ir.installedGame!.localId,
            userNotice: "game created: " + title,
            continueConversation: true,
        },
        formattedContent:
            "ok: " + title +
            " id=" + ir.installedGame!.localId +
            " source=ai_created",
    };
}

async function handleGameUpdate(
    call: LlmToolCall,
): Promise<{ result: ToolResult; formattedContent: string }> {
    const gameId = cleanText(call.args.game_id, 160);
    if (!gameId) {
        return {
            result: {
                name: "game_update",
                success: false,
                error: "no id",
                continueConversation: true,
            },
            formattedContent: "game_update failed: no game_id",
        };
    }

    const state = loadGameState();
    const installed = state.installedGames.find(g => g.localId === gameId);
    if (!installed) {
        return {
            result: {
                name: "game_update",
                success: false,
                error: "not found",
                continueConversation: true,
            },
            formattedContent: "game_update failed: game not found",
        };
    }

    if (installed.templateSnapshot.source === "builtin") {
        return {
            result: {
                name: "game_update",
                success: false,
                error: "cannot modify builtin",
                continueConversation: true,
            },
            formattedContent: "game_update failed: cannot modify builtin game",
        };
    }

    const newTitle =
        typeof call.args.title === "string"
            ? cleanText(call.args.title, 80)
            : installed.templateSnapshot.title;

    const newGameHtml =
        typeof call.args.game_html === "string"
            ? call.args.game_html.trim()
            : installed.templateSnapshot.gameHtml;

    if (newGameHtml.length > GAME_HTML_MAX_CHARS) {
        return {
            result: {
                name: "game_update",
                success: false,
                error: "html too large",
                continueConversation: true,
            },
            formattedContent: "game_update failed: html too large",
        };
    }

    const changeDesc = cleanText(call.args.change_description, 200) || "modified";
    const oldV = installed.templateSnapshot.version;
    const newV = oldV + 1;

    pushVersion(gameId, {
        version: oldV,
        title: installed.templateSnapshot.title,
        gameHtml: installed.templateSnapshot.gameHtml,
        changeDescription: changeDesc,
        savedAt: new Date().toISOString(),
    });

    const updated: GameTemplate = {
        ...installed.templateSnapshot,
        title: newTitle,
        gameHtml: newGameHtml,
        version: newV,
        updatedAt: new Date().toISOString(),
    };

    if (newTitle !== installed.templateSnapshot.title) {
        updated.codeName = newTitle
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "_")
            .slice(0, 40);
    }

    const newManifest = call.args.manifest
        ? parseManifest(call.args.manifest)
        : undefined;
    if (newManifest) {
        updated.subtitle =
            newManifest.description?.slice(0, 160) ?? updated.subtitle;
        updated.synopsis =
            newManifest.description?.slice(0, 600) ?? updated.synopsis;
        updated.playNote = newManifest.description ?? updated.playNote;
    }

    saveGameState({
        ...state,
        installedGames: state.installedGames.map(g =>
            g.localId === gameId
                ? { ...g, templateSnapshot: updated }
                : g
        ),
    });

    return {
        result: {
            name: "game_update",
            success: true,
            data: "v" + oldV + " to v" + newV,
            userNotice: "game updated: " + newTitle,
            continueConversation: true,
        },
        formattedContent:
            "ok: " + newTitle +
            " v" + oldV + " to v" + newV +
            " (" + changeDesc + ")",
    };
}

async function handleGameList(): Promise<{ result: ToolResult; formattedContent: string }> {
    const state = loadGameState();
    const games = state.installedGames.filter(g => g.status === "installed");

    if (games.length === 0) {
        return {
            result: {
                name: "game_list",
                success: true,
                data: "[]",
                continueConversation: true,
            },
            formattedContent: "no games installed",
        };
    }

    const lines = games.map((g, i) => {
        const t = g.templateSnapshot;
        const src =
            t.source === "builtin" ? "builtin" :
            t.authorName === "AI" ? "ai_created" :
            "imported";
        return (
            (i + 1) + ". " + t.title +
            " | id=" + g.localId +
            " | src=" + src +
            " | v" + t.version +
            " | plays=" + g.playCount
        );
    });

    return {
        result: {
            name: "game_list",
            success: true,
            data: JSON.stringify(
                games.map(g => ({
                    id: g.localId,
                    title: g.templateSnapshot.title,
                    source: g.templateSnapshot.source,
                }))
            ),
            userNotice: games.length + " games",
            continueConversation: true,
        },
        formattedContent: lines.join("\n"),
    };
}

async function handleGameDelete(
    call: LlmToolCall,
): Promise<{ result: ToolResult; formattedContent: string }> {
    const gameId = cleanText(call.args.game_id, 160);
    if (!gameId) {
        return {
            result: {
                name: "game_delete",
                success: false,
                error: "no id",
                continueConversation: true,
            },
            formattedContent: "game_delete failed: no game_id",
        };
    }

    const state = loadGameState();
    const installed = state.installedGames.find(g => g.localId === gameId);
    if (!installed) {
        return {
            result: {
                name: "game_delete",
                success: false,
                error: "not found",
                continueConversation: true,
            },
            formattedContent: "game_delete failed: game not found",
        };
    }

    if (installed.templateSnapshot.source === "builtin") {
        return {
            result: {
                name: "game_delete",
                success: false,
                error: "cannot delete builtin",
                continueConversation: true,
            },
            formattedContent: "game_delete failed: cannot delete builtin game",
        };
    }

    const title = installed.templateSnapshot.title;
    const dr = deleteInstalledGame(gameId);
    if (!dr.ok) {
        return {
            result: {
                name: "game_delete",
                success: false,
                error: dr.error,
                continueConversation: true,
            },
            formattedContent: "game_delete failed: " + (dr.error || "unknown"),
        };
    }

    return {
        result: {
            name: "game_delete",
            success: true,
            data: "deleted: " + title,
            userNotice: "game deleted: " + title,
            continueConversation: true,
        },
        formattedContent: "ok: deleted " + title,
    };
}

async function handleGameRun(
    call: LlmToolCall,
): Promise<{ result: ToolResult; formattedContent: string }> {
    const gameId = cleanText(call.args.game_id, 160);
    if (!gameId) {
        return {
            result: {
                name: "game_run",
                success: false,
                error: "no id",
                continueConversation: true,
            },
            formattedContent: "game_run failed: no game_id",
        };
    }

    const state = loadGameState();
    const installed = state.installedGames.find(g => g.localId === gameId);
    if (!installed) {
        return {
            result: {
                name: "game_run",
                success: false,
                error: "not found",
                continueConversation: true,
            },
            formattedContent: "game_run failed: game not found",
        };
    }

    const title = installed.templateSnapshot.title;
    return {
        result: {
            name: "game_run",
            success: true,
            data: title,
            userNotice: "ready: " + title,
            continueConversation: true,
        },
        formattedContent: "game ready: " + title + " - open Game Center to play",
    };
}
