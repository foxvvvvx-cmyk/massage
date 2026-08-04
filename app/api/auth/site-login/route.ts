import { NextRequest, NextResponse } from "next/server";
import { createSitePasswordCookieValue, isSitePasswordGateEnabled, SITE_PASSWORD_COOKIE, SITE_PASSWORD_MAX_AGE_SECONDS } from "@/lib/site-password-cookie";

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!isSitePasswordGateEnabled()) {
        return NextResponse.json({ ok: false, error: "未配置访问密码。" }, { status: 400 });
    }

    let password = "";
    try {
        const body = await request.json() as { password?: unknown };
        password = typeof body.password === "string" ? body.password : "";
    } catch {
        // fall through to the empty-password check
    }
    if (!password) {
        return NextResponse.json({ ok: false, error: "请输入密码。" }, { status: 400 });
    }

    if (password !== process.env.SITE_ACCESS_PASSWORD) {
        return NextResponse.json({ ok: false, error: "密码不正确。" }, { status: 401 });
    }

    const cookieValue = await createSitePasswordCookieValue(SITE_PASSWORD_MAX_AGE_SECONDS);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SITE_PASSWORD_COOKIE, cookieValue, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SITE_PASSWORD_MAX_AGE_SECONDS,
    });
    return response;
}
