// lib/jiwen-engine.ts
// 积温 主动意识引擎 — 纯状态机，不依赖任何项目模块
// 职责：tick / applyInteraction / checkThreshold / getStyleGuidance / import/export

// ── 状态类型 ──
export interface JiwenState {
  connection: number; // 0→1 连接需求（想念程度）
  pride: number;      // -1→+1 骄傲（负=开放 正=端着）
  valence: number;    // -1→+1 愉悦度（负=不好受 正=好受）
  arousal: number;    // -1→+1 唤醒度（负=平静 正=焦躁/兴奋）
  immersion: number;  // 0→1 沉浸度（做其他事的专注程度）
  lastTick: number;   // 上次 tick 时间戳
}

export interface JiwenConfig {
  connectionGrowthRate: number;    // 每分钟连接需求增长
  connectionDecayOnReply: number;  // 对方回复后 connection 降幅
  prideRegressRate: number;        // pride 向 0 回归速率
  valenceRegressRate: number;      // valence 向设定点回归速率
  valenceSetpoint: number;         // valence 自然状态设定点
  arousalRegressRate: number;      // arousal 回归速率
  arousalSetpoint: number;         // arousal 自然设定点
  immersionDecayRate: number;      // immersion 衰退速率
  contactThreshold: number;        // connection 超过此值触发主动联系
  prideBlockThreshold: number;     // pride 超过此值阻止主动联系
  prideErosionRate: number;        // connection 极高时 pride 被迫下降
}

export interface InteractionInput {
  replied: boolean;       // 对方是否回复了
  delayMinutes: number;   // 距上次消息的分钟数
  sentiment?: "positive" | "negative" | "neutral";
  messageLength?: number;
}

export interface ThresholdResult {
  triggered: boolean;
  type: "contact" | "find_activity" | "none";
}

export interface StyleGuidance {
  mood: string;          // "missing" | "proud" | "sad" | "calm" | "nervous" | "neutral"
  intensity: number;     // 0→1
  instruction: string;   // 给 LLM 的风格指令
}

// ── 默认配置 ──
export function defaultJiwenConfig(): JiwenConfig {
  return {
    connectionGrowthRate: 0.007,
    connectionDecayOnReply: 0.20,
    prideRegressRate: 0.003,
    valenceRegressRate: 0.005,
    valenceSetpoint: 0,
    arousalRegressRate: 0.005,
    arousalSetpoint: 0,
    immersionDecayRate: 0.010,
    contactThreshold: 0.45,
    prideBlockThreshold: 0.5,
    prideErosionRate: 0.002,
  };
}

// ── 默认状态 ──
export function defaultJiwenState(): JiwenState {
  return {
    connection: 0.1,
    pride: 0,
    valence: 0.1,
    arousal: -0.1,
    immersion: 0,
    lastTick: Date.now(),
  };
}

// ── 工具 ──
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Tick：数学漂移 ──
export function tick(state: JiwenState, config: JiwenConfig, minutesElapsed: number): JiwenState {
  if (minutesElapsed <= 0) return state;
  const s = { ...state };

  // connection 随时间增长
  s.connection = clamp(s.connection + config.connectionGrowthRate * minutesElapsed, 0, 1);

  // pride 向 0 回归
  if (s.pride > 0) s.pride = clamp(s.pride - config.prideRegressRate * minutesElapsed, 0, 1);
  else s.pride = clamp(s.pride + config.prideRegressRate * minutesElapsed, -1, 0);

  // pride 侵蚀：太想念时端不住了
  if (s.connection >= config.contactThreshold && s.pride > 0) {
    s.pride = clamp(s.pride - config.prideErosionRate * minutesElapsed, 0, 1);
  }

  // valence 向设定点回归
  if (s.valence > config.valenceSetpoint) s.valence = clamp(s.valence - config.valenceRegressRate * minutesElapsed, config.valenceSetpoint, 1);
  else s.valence = clamp(s.valence + config.valenceRegressRate * minutesElapsed, -1, config.valenceSetpoint);

  // arousal 向设定点回归
  if (s.arousal > config.arousalSetpoint) s.arousal = clamp(s.arousal - config.arousalRegressRate * minutesElapsed, config.arousalSetpoint, 1);
  else s.arousal = clamp(s.arousal + config.arousalRegressRate * minutesElapsed, -1, config.arousalSetpoint);

  // immersion 衰减
  s.immersion = clamp(s.immersion - config.immersionDecayRate * minutesElapsed, 0, 1);

  s.lastTick = Date.now();
  return s;
}

// ── applyInteraction：对话后更新状态 ──
export function applyInteraction(state: JiwenState, config: JiwenConfig, input: InteractionInput): JiwenState {
  const s = { ...state };

  if (input.replied) {
    // 对方回复 → 缓解连接需求
    s.connection = clamp(s.connection - config.connectionDecayOnReply, 0, 1);
  } else if (input.delayMinutes > 30) {
    // 长时间没回复 → 加速连接增长 + 略微降低 pride
    s.connection = clamp(s.connection + 0.05, 0, 1);
    s.pride = clamp(s.pride - 0.03, -1, 1);
  }

  // 情绪影响
  if (input.sentiment === "positive") {
    s.valence = clamp(s.valence + 0.08, -1, 1);
  } else if (input.sentiment === "negative") {
    s.valence = clamp(s.valence - 0.06, -1, 1);
  }

  s.lastTick = Date.now();
  return s;
}

// ── checkThreshold：判断是否触发主动行为 ──
export function checkThreshold(state: JiwenState, config: JiwenConfig): ThresholdResult {
  if (state.connection >= config.contactThreshold) {
    if (state.pride < config.prideBlockThreshold) {
      return { triggered: true, type: "contact" };
    }
    return { triggered: true, type: "find_activity" };
  }
  return { triggered: false, type: "none" };
}

// ── getStyleGuidance：数值 → 自然语言 ──
export function getStyleGuidance(state: JiwenState): StyleGuidance {
  const { connection, pride, valence, arousal } = state;

  // mood 判定
  let mood = "neutral";
  if (connection >= 0.6 && pride < 0.3) mood = "missing";
  else if (pride >= 0.5) mood = "proud";
  else if (valence <= -0.3) mood = "sad";
  else if (arousal >= 0.3) mood = "nervous";
  else if (arousal <= -0.3) mood = "calm";

  // intensity
  const intensity = clamp((Math.abs(connection) + Math.abs(valence) + Math.abs(arousal)) / 3, 0, 1);

  // instruction
  let instruction = "";
  if (mood === "missing") {
    instruction = pride > 0
      ? "有些想对方，但因为骄傲不太愿意直接表达。语气委婉，带一点点傲娇。"
      : "有点想对方了。语气温柔，可以带一点撒娇的意味。不要太直接。";
  } else if (mood === "proud") {
    instruction = "正在端着架子。语气可以冷淡一点，但不要太伤人。";
  } else if (mood === "sad") {
    instruction = "情绪不太好。语气可以低沉一点，但不需要刻意表达。";
  } else if (mood === "nervous") {
    instruction = "有点焦躁。语气可以急促一点，但保持角色性格。";
  } else {
    instruction = "保持自然。像平时一样聊天，简短友好。";
  }

  return { mood, intensity, instruction };
}

// ── import/export state ──
export function exportState(state: JiwenState): string {
  return JSON.stringify(state);
}

export function importState(json: string): JiwenState | null {
  try {
    const parsed = JSON.parse(json);
    const def = defaultJiwenState();
    return {
      connection: typeof parsed.connection === "number" ? parsed.connection : def.connection,
      pride: typeof parsed.pride === "number" ? parsed.pride : def.pride,
      valence: typeof parsed.valence === "number" ? parsed.valence : def.valence,
      arousal: typeof parsed.arousal === "number" ? parsed.arousal : def.arousal,
      immersion: typeof parsed.immersion === "number" ? parsed.immersion : def.immersion,
      lastTick: typeof parsed.lastTick === "number" ? parsed.lastTick : Date.now(),
    };
  } catch {
    return null;
  }
}
