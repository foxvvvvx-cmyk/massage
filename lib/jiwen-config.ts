// lib/jiwen-config.ts
// 积温参数配置 — 调整参数无需修改 Engine

export interface JiwenRuntimeConfig {
  tickIntervalMs: number;       // tick 间隔（毫秒）
  contactCooldownMs: number;    // 两次主动消息最小间隔
  maxDailyMessages: number;     // 每日主动消息上限
  userIdleThresholdMs: number;  // 用户最近 N 毫秒内有消息则不发主动消息
  contactThresholdOverride?: number;    // 覆盖 Engine 默认 contactThreshold
  prideBlockOverride?: number;         // 覆盖 Engine 默认 prideBlockThreshold
}

export function defaultRuntimeConfig(): JiwenRuntimeConfig {
  return {
    tickIntervalMs: 5 * 60 * 1000,    // 5 分钟
    contactCooldownMs: 30 * 60 * 1000, // 30 分钟冷却
    maxDailyMessages: 8,               // 每天最多 8 条
    userIdleThresholdMs: 5 * 60 * 1000, // 用户 5 分钟内有消息 → 不打扰
  };
}
