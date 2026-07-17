const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export function isSelfHostedModeEnabled(): boolean {
  // 强制开启自托管模式 — 跳过登录页，直接进入主界面。
  return true;
}
