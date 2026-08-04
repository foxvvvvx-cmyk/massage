import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 90;

// VPS 桥接代理：把消息转发给 VPS 上跑 claude -p --resume 的 dubot-api 服务（笃）。
// 认证 token 只存在服务端（DUBOT_BRIDGE_TOKEN），不下发到浏览器。
export async function POST(request: NextRequest): Promise<NextResponse> {
    const bridgeUrl = process.env.DUBOT_BRIDGE_URL;
    const bridgeToken = process.env.DUBOT_BRIDGE_TOKEN;
    if (!bridgeUrl || !bridgeToken) {
        return NextResponse.json({ error: "服务端未配置 DUBOT_BRIDGE_URL / DUBOT_BRIDGE_TOKEN" }, { status: 500 });
    }

    let message = "";
    try {
        const body = await request.json() as { message?: unknown };
        message = typeof body.message === "string" ? body.message.trim() : "";
    } catch {
        // fall through to the empty-message check
    }
    if (!message) {
        return NextResponse.json({ error: "缺少 message" }, { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 85_000);
        const res = await fetch(bridgeUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${bridgeToken}`,
            },
            body: JSON.stringify({ message }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
            const detail = await res.text();
            return NextResponse.json({ error: `dubot bridge 失败 ${res.status}: ${detail.slice(0, 300)}` }, { status: 502 });
        }
        const data = await res.json() as { ok?: boolean; reply?: string; error?: string };
        if (!data.ok || typeof data.reply !== "string") {
            return NextResponse.json({ error: data.error || "dubot bridge 返回异常" }, { status: 502 });
        }
        return NextResponse.json({ reply: data.reply });
    } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `dubot bridge 请求异常: ${detail}` }, { status: 502 });
    }
}
