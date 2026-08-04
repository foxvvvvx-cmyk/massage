import { NextResponse } from "next/server";
import { SITE_PASSWORD_COOKIE } from "@/lib/site-password-cookie";

export async function POST(): Promise<NextResponse> {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SITE_PASSWORD_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
    return response;
}
