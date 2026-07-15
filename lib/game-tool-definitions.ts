import type { ApiConfig } from "./settings-types";
import type { LlmToolCall, LlmToolDefinition } from "./llm-provider-adapter";

// ── 通用游戏工具层 —— Provider 无关 ──
// 任何支持 native function calling 的 provider 均可使用。
// 与 web_search 相同的"请求层注入"模式：不进 getEnabledTools() 体系，
// 不污染用户工具配置界面。

export const GAME_TOOL_PREFIX = "game_";
export const GAME_HTML_MAX_CHARS = 50_000;

// ── game_manifest 结构化清单 ──
// 为复杂游戏后续通过模板系统扩展预留接口。
// 简单游戏可以直接在 manifest 里描述类型和功能，
// 同时通过 game_html 提供可运行的 HTML。
export type GameManifest = {
    /** 游戏标题 */
    title: string;
    /** 游戏类型，如 "card" / "board" / "puzzle" / "quiz" / "rpg" / "simulation" */
    type: string;
    /** 功能列表，如 ["multiplayer", "ai_opponent", "scoring", "save"] */
    features: string[];
    /** 游戏玩法描述，供后续模板选择/推荐使用 */
    description: string;
};

// ── 门控 ──

/** 任何支持 native tools 的 provider 均可使用游戏工具（不限 DeepSeek/Anthropic） */
export function isGameToolEligible(config: ApiConfig): boolean {
    if (config.enableNativeTools === false) return false;
    if (config.gameToolsEnabled === false) return false;
    return true;
}

// ── 工具判断 ──

export function isGameToolCall(call: LlmToolCall): boolean {
    return call.name.startsWith(GAME_TOOL_PREFIX);
}

// ── 工具定义 ──

export const GAME_TOOL_DEFINITIONS: LlmToolDefinition[] = [
    {
        name: "game_create",
        description:
            "创建一个新的小游戏。你需要提供完整的单文件 HTML 游戏代码（含 CSS/JS）。" +
            "HTML 会被保存到用户的游戏中心，用户随时可以打开游玩。" +
            "简单游戏直接生成 HTML 即可；同时通过 manifest 描述游戏的类型和功能，" +
            "方便后续扩展为更复杂的模板游戏。",
        parameters: {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "游戏名称，4-20 个字符",
                },
                game_html: {
                    type: "string",
                    description:
                        "完整的单文件 HTML 游戏代码。必须包含 <html><head><style>...</style></head>" +
                        "<body>...<script>...</script></body></html>。最大 50000 字符。",
                },
                manifest: {
                    type: "object",
                    description: "结构化游戏清单：类型、功能、描述。用于存储和未来模板扩展。",
                    properties: {
                        title: { type: "string", description: "游戏标题（与顶层 title 一致）" },
                        type: {
                            type: "string",
                            description:
                                "游戏类型：card（卡牌）/ board（棋盘）/ puzzle（解谜）/ quiz（问答）" +
                                "/ rpg（角色扮演）/ simulation（模拟）/ arcade（街机）/ other（其他）",
                        },
                        features: {
                            type: "array",
                            items: { type: "string" },
                            description: "功能标签，如 multiplayer, ai_opponent, scoring, save, timer",
                        },
                        description: {
                            type: "string",
                            description: "游戏玩法简介，供游戏中心展示和模板匹配用",
                        },
                    },
                    required: ["title", "type", "features"],
                },
            },
            required: ["title", "game_html"],
        },
    },
    {
        name: "game_update",
        description:
            "修改一个已有的游戏。你需要提供 game_id 和要修改的字段。" +
            "修改会创建新版本，旧版本会保留在版本历史中（最多 10 个版本）。" +
            "注意：不能修改系统内置游戏（builtin 来源）。",
        parameters: {
            type: "object",
            properties: {
                game_id: {
                    type: "string",
                    description: "要修改的游戏 ID（localId，从 game_list 获取）",
                },
                title: {
                    type: "string",
                    description: "新标题（可选）",
                },
                game_html: {
                    type: "string",
                    description:
                        "新的完整 HTML 代码（可选）。最大 50000 字符。",
                },
                manifest: {
                    type: "object",
                    description: "更新后的 manifest（可选）",
                    properties: {
                        type: { type: "string" },
                        features: { type: "array", items: { type: "string" } },
                        description: { type: "string" },
                    },
                },
                change_description: {
                    type: "string",
                    description: "本次修改的简要说明（如[修复了一个 bug]、[增加了新关卡]），用于版本历史记录",
                },
            },
            required: ["game_id"],
        },
    },
    {
        name: "game_list",
        description: "列出当前已安装的所有游戏的摘要信息（名称、ID、来源、游玩次数等）。",
        parameters: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "game_delete",
        description:
            "删除一个游戏。请在对话中先向用户确认。不能删除系统内置游戏。",
        parameters: {
            type: "object",
            properties: {
                game_id: {
                    type: "string",
                    description: "要删除的游戏 ID",
                },
            },
            required: ["game_id"],
        },
    },
    {
        name: "game_run",
        description:
            "获取游戏的启动指引。用户需要打开手机游戏中心，找到对应游戏点击开始。" +
            "你无法直接替用户启动游戏，但可以告诉用户游戏名称和位置。",
        parameters: {
            type: "object",
            properties: {
                game_id: {
                    type: "string",
                    description: "要启动的游戏 ID",
                },
            },
            required: ["game_id"],
        },
    },
];
