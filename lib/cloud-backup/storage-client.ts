import { CLOUD_BACKUP_BUCKET, detectSupabaseKeyRole, normalizeBackupUrl, type CloudBackupConfig } from "./config";

/**
 * Thin client for the user's OWN Supabase Storage (REST), using their anon key
 * directly from the browser. Scoped entirely to the ai-phone-backup bucket.
 * No @supabase/supabase-js dependency — plain fetch against /storage/v1.
 *
 * 安全边界：service_role key 一律拒收（管理员钥匙不进浏览器）。
 * 桶与访问策略由用户在 Supabase SQL Editor 一次性运行
 * docs/cloud-backup-supabase.sql 创建。
 */

type Creds = { url: string; key: string };

const SERVICE_KEY_ERROR = "检测到 service_role/secret key：出于安全考虑，浏览器端只能使用 anon（publishable）key。请到 Supabase → Project Settings → API 复制 anon key，并在 SQL Editor 运行 docs/cloud-backup-supabase.sql 完成一次性初始化。";
const SETUP_HINT = "请在 Supabase SQL Editor 运行 docs/cloud-backup-supabase.sql（创建备份桶和访问策略，一次即可）。";

function resolveCreds(config: CloudBackupConfig): Creds | null {
  const url = normalizeBackupUrl(config.url);
  const key = (config.key || "").trim();
  if (!url || !key) return null;
  if (detectSupabaseKeyRole(key) === "service") throw new Error(SERVICE_KEY_ERROR);
  return { url, key };
}

function authHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function objectUrl(creds: Creds, path: string): string {
  return `${creds.url}/storage/v1/object/${CLOUD_BACKUP_BUCKET}/${path.replace(/^\/+/, "")}`;
}

/** Upload (overwrites if present). Body can be a Blob/ArrayBuffer/string. */
export async function putObject(config: CloudBackupConfig, path: string, body: BlobPart, contentType = "application/octet-stream"): Promise<void> {
  const creds = resolveCreds(config);
  if (!creds) throw new Error("未配置 Supabase 地址或 key。");
  const res = await fetch(objectUrl(creds, path), {
    method: "POST",
    headers: { ...authHeaders(creds.key), "Content-Type": contentType, "x-upsert": "true" },
    body: body instanceof Blob ? body : new Blob([body], { type: contentType }),
  });
  if (!res.ok) throw new Error(await describeError(res));
}

/** Download an object's bytes. Returns null on 404. */
export async function getObject(config: CloudBackupConfig, path: string): Promise<Blob | null> {
  const creds = resolveCreds(config);
  if (!creds) throw new Error("未配置 Supabase 地址或 key。");
  const res = await fetch(objectUrl(creds, path), { headers: authHeaders(creds.key), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await describeError(res));
  return await res.blob();
}

export async function removeObject(config: CloudBackupConfig, path: string): Promise<void> {
  const creds = resolveCreds(config);
  if (!creds) throw new Error("未配置 Supabase 地址或 key。");
  const res = await fetch(objectUrl(creds, path), { method: "DELETE", headers: authHeaders(creds.key) });
  if (res.ok || res.status === 404) return;
  const error = await describeError(res);
  if (res.status === 400 && /object not found|not found/i.test(error)) return;
  throw new Error(error);
}

export type StorageObject = { name: string; size: number; updatedAt?: string };

/** List objects under a prefix (e.g. "manifests/"). */
export async function listObjects(config: CloudBackupConfig, prefix = "", limit = 100): Promise<StorageObject[]> {
  const creds = resolveCreds(config);
  if (!creds) throw new Error("未配置 Supabase 地址或 key。");
  const res = await fetch(`${creds.url}/storage/v1/object/list/${CLOUD_BACKUP_BUCKET}`, {
    method: "POST",
    headers: { ...authHeaders(creds.key), "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit, offset: 0, sortBy: { column: "name", order: "asc" } }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await describeError(res));
  const rows = (await res.json().catch(() => [])) as Array<Record<string, unknown>>;
  return (Array.isArray(rows) ? rows : []).map(row => ({
    name: String(row.name ?? ""),
    size: Number((row.metadata as Record<string, unknown> | undefined)?.size ?? 0),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
  })).filter(item => item.name);
}

/**
 * Fail fast if the backup bucket isn't reachable. anon key 无法建桶（那是
 * 管理员操作，不进浏览器），桶由 docs/cloud-backup-supabase.sql 一次性创建；
 * 这里只探测桶是否存在，缺失时给出可操作的提示。
 */
export async function ensureBucket(config: CloudBackupConfig): Promise<void> {
  const creds = resolveCreds(config);
  if (!creds) throw new Error("未配置 Supabase 地址或 key。");
  const res = await fetch(`${creds.url}/storage/v1/object/list/${CLOUD_BACKUP_BUCKET}`, {
    method: "POST",
    headers: { ...authHeaders(creds.key), "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 1, offset: 0 }),
    cache: "no-store",
  });
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  if (/bucket not found/i.test(text) || res.status === 404) {
    throw new Error(`备份桶不存在：${SETUP_HINT}`);
  }
  throw new Error(`${res.status} ${text || res.statusText}`.trim());
}

/**
 * Validate the full path the backup engine needs: check the bucket exists,
 * then write a tiny probe object and delete it. Proves the URL + anon key work
 * and the RLS policies from docs/cloud-backup-supabase.sql are in place.
 */
export async function testCloudBackupConnection(config: CloudBackupConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  const creds = resolveCreds(config);
  if (!creds) return { ok: false, error: "请先填写 Supabase 地址和 key。" };
  try {
    await ensureBucket(config);
  } catch (err) {
    return { ok: false, error: mapStorageError(err instanceof Error ? err.message : String(err)) };
  }
  const probePath = `.healthcheck/${Date.now()}.txt`;
  try {
    await putObject(config, probePath, "ok", "text/plain");
  } catch (err) {
    return { ok: false, error: mapStorageError(err instanceof Error ? err.message : String(err)) };
  }
  // Best-effort cleanup; failure here doesn't fail the test.
  try { await removeObject(config, probePath); } catch { /* ignore */ }
  return { ok: true };
}

async function describeError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  let message = text;
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    message = String(data.message ?? data.error ?? text);
  } catch { /* keep raw text */ }
  return `${res.status} ${message || res.statusText}`.trim();
}

function mapStorageError(error: string): string {
  if (/403|not authorized|permission|new row violates row-level security/i.test(error)) {
    return `权限不足：${SETUP_HINT}`;
  }
  if (/401|invalid.*(jwt|key|token)|JWSError|signature/i.test(error)) {
    return "key 无效或不匹配该项目：请检查 Supabase 地址和 anon key 是否对应同一个项目。";
  }
  if (/getaddrinfo|ENOTFOUND|fetch failed|Failed to fetch|networkerror/i.test(error)) {
    return "连不上该 Supabase 地址：请检查 URL 是否正确、网络是否可达。";
  }
  return error;
}
