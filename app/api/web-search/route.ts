import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// Serper.dev 联网搜索代理。key 只存在服务端（SERPER_API_KEY），
// 客户端 chat-engine 在 DeepSeek 走 web_search tool_call 时调用本路由。
type SerperOrganicItem = {
    title?: string;
    link?: string;
    snippet?: string;
    date?: string;
};

type SerperResponse = {
    answerBox?: { title?: string; answer?: string; snippet?: string };
    knowledgeGraph?: { title?: string; type?: string; description?: string };
    organic?: SerperOrganicItem[];
};

function formatSearchSummary(data: SerperResponse): string {
    const lines: string[] = [];
    if (data.answerBox) {
        const answer = data.answerBox.answer || data.answerBox.snippet;
        if (answer) lines.push(`【直接答案】${data.answerBox.title ? `${data.answerBox.title}：` : ""}${answer}`);
    }
    if (data.knowledgeGraph?.description) {
        lines.push(`【知识卡片】${data.knowledgeGraph.title ?? ""}${data.knowledgeGraph.type ? `（${data.knowledgeGraph.type}）` : ""}：${data.knowledgeGraph.description}`);
    }
    const organic = (data.organic ?? []).slice(0, 5);
    organic.forEach((item, index) => {
        const parts = [
            `${index + 1}. ${item.title ?? "(无标题)"}`,
            item.date ? `（${item.date}）` : "",
            item.snippet ? `\n${item.snippet}` : "",
            item.link ? `\n来源：${item.link}` : "",
        ];
        lines.push(parts.filter(Boolean).join(""));
    });
    return lines.join("\n\n");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "服务端未配置 SERPER_API_KEY" }, { status: 500 });
    }

    let query = "";
    try {
        const body = await request.json() as { q?: unknown };
        query = typeof body.q === "string" ? body.q.trim() : "";
    } catch {
        // fall through to the empty-query check
    }
    if (!query) {
        return NextResponse.json({ error: "缺少搜索关键词 q" }, { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20_000);
        const res = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: query, gl: "cn", hl: "zh-cn" }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
            const detail = await res.text();
            return NextResponse.json({ error: `Serper 搜索失败 ${res.status}: ${detail.slice(0, 300)}` }, { status: 502 });
        }
        const data = await res.json() as SerperResponse;
        const summary = formatSearchSummary(data);
        if (!summary) {
            return NextResponse.json({ summary: "（没有搜索到相关结果）" });
        }
        return NextResponse.json({ summary });
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `Serper 请求异常: ${detail}` }, { status: 502 });
    }
}
