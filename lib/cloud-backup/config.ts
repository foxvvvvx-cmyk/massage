import { kvGet, kvSet, registerKvMigration } from "../kv-db";

/** Fixed bucket name — users never type this; created once via docs/cloud-backup-supabase.sql. */
export const CLOUD_BACKUP_BUCKET = "ai-phone-backup";

const CLOUD_BACKUP_CONFIG_KEY = "ai_phone_cloud_backup_config_v1";
registerKvMigration(CLOUD_BACKUP_CONFIG_KEY);

export type CloudBackupConfig = {
  /** User's Supabase project URL, e.g. https://xxxx.supabase.co */
  url: string;
  /** User's Supabase anon / publishable key. service_role keys are rejected —
   *  管理员钥匙不能放进浏览器（一旦被 XSS 拿到等于交出整个项目）。 */
  key: string;
  /** Auto-backup on/off (engine wired in a later step). */
  enabled: boolean;
  /** Auto-backup interval in hours. */
  intervalHours: number;
  /** How many healthy backups to keep (rolling). */
  keepCount: number;
  /** Strip images/multimedia from backups (local + cloud) to keep them small. */
  excludeMedia: boolean;
};

export const DEFAULT_CLOUD_BACKUP_CONFIG: CloudBackupConfig = {
  url: "",
  key: "",
  enabled: false,
  intervalHours: 6,
  keepCount: 3,
  excludeMedia: true,
};

/** Strip trailing slashes; tolerate a pasted URL with or without protocol. */
export function normalizeBackupUrl(url: string): string {
  const trimmed = (url || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * 粗略识别 Supabase key 的角色：新格式看前缀（sb_secret_/sb_publishable_），
 * 旧格式 JWT 解 payload 里的 role 字段。识别不了返回 "unknown"（放行）。
 */
export function detectSupabaseKeyRole(key: string): "service" | "anon" | "unknown" {
  const trimmed = (key || "").trim();
  if (!trimmed) return "unknown";
  if (/^sb_secret_/i.test(trimmed)) return "service";
  if (/^sb_publishable_/i.test(trimmed)) return "anon";
  const parts = trimmed.split(".");
  if (parts.length === 3) {
    try {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64)) as { role?: unknown };
      if (payload.role === "service_role") return "service";
      if (payload.role === "anon") return "anon";
    } catch { /* 非标准 JWT，按 unknown 处理 */ }
  }
  return "unknown";
}

export function loadCloudBackupConfig(): CloudBackupConfig {
  try {
    const raw = kvGet(CLOUD_BACKUP_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CLOUD_BACKUP_CONFIG };
    const parsed = JSON.parse(raw) as Partial<CloudBackupConfig>;
    return {
      url: typeof parsed.url === "string" ? parsed.url : "",
      key: typeof parsed.key === "string" ? parsed.key : "",
      enabled: Boolean(parsed.enabled),
      intervalHours: clampInterval(parsed.intervalHours),
      keepCount: clampKeepCount(parsed.keepCount),
      excludeMedia: parsed.excludeMedia !== false,
    };
  } catch {
    return { ...DEFAULT_CLOUD_BACKUP_CONFIG };
  }
}

export function saveCloudBackupConfig(config: CloudBackupConfig): void {
  kvSet(CLOUD_BACKUP_CONFIG_KEY, JSON.stringify({
    ...config,
    url: normalizeBackupUrl(config.url),
    key: (config.key || "").trim(),
    intervalHours: clampInterval(config.intervalHours),
    keepCount: clampKeepCount(config.keepCount),
    excludeMedia: config.excludeMedia !== false,
  }));
}

export function isCloudBackupConfigured(config: CloudBackupConfig): boolean {
  return Boolean(normalizeBackupUrl(config.url) && config.key.trim());
}

function clampInterval(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CLOUD_BACKUP_CONFIG.intervalHours;
  // Floor at 0.5h to avoid hammering; cap at a week.
  return Math.min(168, Math.max(0.5, n));
}

function clampKeepCount(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_CLOUD_BACKUP_CONFIG.keepCount;
  return Math.min(5, Math.max(2, n));
}
