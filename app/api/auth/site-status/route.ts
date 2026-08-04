import { NextRequest, NextResponse } from "next/server";
import { isSitePasswordGateEnabled, SITE_PASSWORD_COOKIE, verifySitePasswordCookieValue } from "@/lib/site-password-cookie";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const required = isSitePasswordGateEnabled();
    if (!required) {
        return NextResponse.json({ required: false, unlocked: true });
    }
    const cookieValue = request.cookies.get(SITE_PASSWORD_COOKIE)?.value ?? "";
    const unlocked = await verifySitePasswordCookieValue(cookieValue);
    return NextResponse.json({ required: true, unlocked });
}
