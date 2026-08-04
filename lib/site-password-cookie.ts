// 简单访问密码门禁——用单个共享密码保护自托管部署，独立于（未使用的）Supabase 账号系统。
// 未设置 SITE_ACCESS_PASSWORD 时完全不生效，行为和现在一样（自托管模式全开）。
export const SITE_PASSWORD_COOKIE = "ai_phone_site_pw";
export const SITE_PASSWORD_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 天

const encoder = new TextEncoder();

export function isSitePasswordGateEnabled(): boolean {
    return Boolean(process.env.SITE_ACCESS_PASSWORD?.trim());
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
    const array = new Uint8Array(bytes);
    let binary = "";
    for (const byte of array) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacSha256(input: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
    return bytesToBase64Url(signature);
}

export async function createSitePasswordCookieValue(maxAgeSeconds: number): Promise<string> {
    const secret = process.env.SITE_ACCESS_PASSWORD?.trim() || "";
    if (!secret) return "";
    const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, Math.floor(maxAgeSeconds));
    const payload = `v1.${expiresAt}`;
    const signature = await hmacSha256(payload, secret);
    return `${payload}.${signature}`;
}

export async function verifySitePasswordCookieValue(value: string): Promise<boolean> {
    const secret = process.env.SITE_ACCESS_PASSWORD?.trim() || "";
    if (!secret || !value) return false;
    const [version, expiresAtRaw, signature, ...rest] = value.split(".");
    if (rest.length > 0 || version !== "v1" || !expiresAtRaw || !signature) return false;
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
    const expected = await hmacSha256(`v1.${expiresAtRaw}`, secret);
    return signature === expected;
}
