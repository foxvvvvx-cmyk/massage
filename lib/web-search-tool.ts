import type { ApiConfig } from "./settings-types";
import type { LlmToolCall, LlmToolDefinition } from "./llm-provider-adapter";
import { getCachedResult, setCachedResult } from "./web-search-cache";

// DeepSeek 版联网搜索：通过 OpenAI function calling 声明 web_search 工具，
// 模型发起 tool_call 后由 /api/web-search（Serper.dev）执行，结果以 tool 消息回传。
// 只在 provider=DeepSeek 时启用；Anthropic 官方 web_search（服务端工具）走
// buildAnthropicRequest 那条路，二者互不影响。

export const WEB_SEARCH_TOOL_NAME = "web_search";
const WEB_SEARCH_TIMEOUT_MS = 15_000;
/**
 * 搜索模式：
 * - "auto"（默认）：注入 web_search 工具，由模型自行决定是否调用
 * - "always"：与 auto 行为一致（预留扩展，未来可加 tool_choice 强制调用）
 * - "off"：不注入 web_search，完全关闭搜索功能
 */
export type WebSearchMode = "auto" | "always" | "off";

/** 读取用户配置的搜索模式，默认 auto */
export function getWebSearchMode(config: ApiConfig): WebSearchMode {
    if (!config.webSearchMode || config.webSearchMode === "auto") return "auto";
    if (config.webSearchMode === "always") return "always";
    if (config.webSearchMode === "off") return "off";
    return "auto";
}

export function isWebSearchEligible(config: ApiConfig): boolean {
    if (config.provider !== "DeepSeek") return false;
    if (config.enableNativeTools === false) return false;
    const mode = getWebSearchMode(config);
    if (mode === "off") return false;
    return true;
}

export const WEB_SEARCH_TOOL_DEFINITION: LlmToolDefinition = {
    name: WEB_SEARCH_TOOL_NAME,
    description: "搜索互联网获取实时信息，比如天气、新闻、当前时间、股价等。仅在需要最新信息时使用。",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "搜索关键词" },
        },
        required: ["query"],
    },
};

export function isWebSearchToolCall(call: LlmToolCall): boolean {
    return call.name === WEB_SEARCH_TOOL_NAME;
}

export function webSearchQueryFromCall(call: LlmToolCall): string {
    return typeof call.args.query === "string" ? call.args.query.trim() : "";
}

export type WebSearchPersonaContext = {
    /** 角色名称，用于引导模型用该角色的口吻整合搜索结果 */
    characterName?: string;
};

/**
 * 调用 /api/web-search 执行搜索，返回格式化的 tool message 内容。
 *
 * 容错设计：
 * - 搜索失败 / 超时 / 空结果 → 返回一段自然的"搜索不可用"消息，
 *   模型可以据此继续生成回复，不会中断整个聊天流程。
 * - 不抛出异常，始终返回字符串。
 *
 * 缓存策略：
 * - 成功结果缓存 5 分钟（同一 query 不重复请求 Serper）
 * - 失败/超时不缓存
 *
 * @param query        搜索关键词（已校验非空）
 * @param persona      可选的角色上下文，用于人格化融合引导
 * @param signal       外部 AbortSignal（聊天被取消时中止）
 */
export async function executeWebSearch(
    query: string,
    persona?: WebSearchPersonaContext,
    signal?: AbortSignal,
): Promise<string> {
    // ── 参数校验 ──
    if (!query) {
        return "[联网搜索不可用：搜索关键词为空。请基于已有知识如实回复，并告知用户暂无法查询实时信息。]";
    }

    // ── 缓存检查 ──
    const cached = getCachedResult(query);
    if (cached) return cached;

    // ── 超时控制（内层） ──
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), WEB_SEARCH_TIMEOUT_MS);

    // 合并外部 AbortSignal（用户取消）和内部超时
    const combinedSignal = signal
        ? combineAbortSignals(signal, timeoutController.signal)
        : timeoutController.signal;

    try {
        const res = await fetch("/api/web-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: query }),
            signal: combinedSignal,
        });

        // 尝试解析 JSON —— 即使 HTTP 错误，服务端也返回 JSON { error: "..." }
        const data = await res.json().catch<{ summary?: string; error?: string }>(() => ({}));

        if (!res.ok || data.error) {
            const reason = data.error || `HTTP ${res.status}`;
            return `[联网搜索暂时不可用（${reason}）。请基于已有知识如实回复用户的问题，并简要说明当前无法获取实时数据。]`;
        }

        const summary = typeof data.summary === "string" && data.summary.trim()
            ? data.summary.trim()
            : "";

        if (!summary) {
            return "[联网搜索未找到相关结果。请基于已有知识如实回复用户，并告知未查到实时信息。]";
        }

        // ── 人格化融合：在搜索结果前加入角色口吻引导 ──
        const personaHint = persona?.characterName
            ? `你正在扮演「${persona.characterName}」。请用这个角色的语气和风格整合以下信息回复用户，不要机械罗列搜索结果。`
            : "";

        const parts = [
            personaHint,
            `联网搜索「${query}」的结果：`,
            "",
            summary,
        ].filter(Boolean);

        // 如果内容太长，截断（DeepSeek context 有限）
        const full = parts.join("\n");
        const result = full.length > 3000 ? full.slice(0, 2997) + "..." : full;

        // ── 成功结果写入缓存 ──
        setCachedResult(query, result);

        return result;
    } catch (err: unknown) {
        // AbortError（用户取消或超时）→ 静默处理
        if (err instanceof DOMException && err.name === "AbortError") {
            if (signal?.aborted) {
                // 用户主动取消 —— 让外层 AbortError 继续传播
                throw err;
            }
            // 超时
            return "[联网搜索请求超时。请基于已有知识如实回复用户，并告知搜索暂时不可用。]";
        }
        // 网络异常
        const detail = err instanceof Error ? err.message : String(err);
        return `[联网搜索失败（网络异常：${detail}）。请基于已有知识如实回复用户的问题。]`;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** 合并两个 AbortSignal —— 任意一个 abort 都会触发合并后的 signal */
function combineAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
    if (a.aborted || b.aborted) return AbortSignal.abort("pre-aborted");
    const controller = new AbortController();
    const onAbort = () => controller.abort((a.aborted ? a.reason : b.reason) || "combined-abort");
    a.addEventListener("abort", onAbort, { once: true });
    b.addEventListener("abort", onAbort, { once: true });
    return controller.signal;
}
