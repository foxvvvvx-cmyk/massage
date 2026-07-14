/** @deprecated 已合并到 emotion-engine.ts。请改用 import { getSentiment, tick, applyInteraction, checkThreshold, getStyleGuidance, EmotionState, EmotionConfig } from "./emotion-engine"。本文件保留以兼容旧引用，不再更新。 */
/* ============================================
   lib/resonance-engine.ts — 共鸣引擎（Resonance Engine）
   每个 Character 独立的五维情感状态模拟
   纯引擎：不操作 DOM、不读写存储、不触发副作用

   从沈度 (Shendu) app/resonance.js 移植
   翻译为 TypeScript，保持纯函数 + 不可变输出
   ============================================ */

// ===== Types =====

export type ResonanceState = {
  /** 连接感 0~1。回复时衰减，沉默时增长 */
  connection: number;
  /** 克制度 0~1。高频互动/第三方提及 → 上升；高位阻塞主动联系 */
  restraint: number;
  /** 愉悦度 -1~1。受用户情感倾向影响，向 setpoint 回归 */
  valence: number;
  /** 唤醒度 -1~1。互动强度驱动，向 setpoint 回归 */
  arousal: number;
  /** 沉浸度 0~1。随时间自然衰减 */
  immersion: number;
  /** 上次 tick 的时间戳 */
  lastTick: number;
  /** tick 累计次数 */
  tickCount: number;
  /** 当日主动联系次数 */
  contactCount: number;
  /** 上次主动联系的时间戳 */
  lastContactTime: number | null;
};

export type ResonanceConfig = {
  /** 沉默时每分钟连接感增长率 */
  connectionGrowthRate: number;
  /** 回复时连接感衰减量 */
  connectionDecayOnReply: number;
  /** 克制向 0 回归速率（每分钟） */
  restraintRegressRate: number;
  /** 克制阻塞阈值：克制度 >= 此值 → 仅触发 hint，不触发 contact */
  restraintBlockThreshold: number;
  /** 高连接感对克制的侵蚀速率（每分钟） */
  restraintErosionRate: number;
  /** 愉悦度回归速率（每分钟） */
  valenceRegressRate: number;
  /** 愉悦度回归目标 */
  valenceSetpoint: number;
  /** 唤醒度回归速率（每分钟） */
  arousalRegressRate: number;
  /** 唤醒度回归目标 */
  arousalSetpoint: number;
  /** 沉浸度衰减速率（每分钟） */
  immersionDecayRate: number;
  /** 连接感阈值：>= 此值触发主动联系 */
  contactThreshold: number;
  /** 两次主动联系的最小间隔（分钟） */
  contactCooldownMinutes: number;
  /** 每日最大主动联系次数 */
  maxDailyContacts: number;
  /** 用户空闲阈值：最近消息在 N 分钟内 → 不主动联系 */
  userIdleThresholdMinutes: number;
  /** 正向情感 boost */
  positiveSentimentBoost: number;
  /** 负向情感 boost */
  negativeSentimentBoost: number;
  /** 长时间沉默 → 连接感增加 */
  longSilenceConnectionBoost: number;
  /** 长时间沉默 → 克制下降 */
  longSilenceRestraintDrop: number;
  /** 多久算"长时间沉默"（分钟） */
  longSilenceThresholdMinutes: number;
};

export type ResonanceMood = 'neutral' | 'warm' | 'cool' | 'sad' | 'restless' | 'calm';

export type ResonanceStyleGuidance = {
  mood: ResonanceMood;
  /** 综合强度 0~1 */
  intensity: number;
  /** 当前克制度 */
  restraint: number;
};

export type SentimentResult = {
  sentiment: 'positive' | 'negative' | 'neutral';
  hasThirdParty: boolean;
};

export type InteractionInput = {
  /** 用户是否已被回复 */
  replied: boolean;
  /** 距上一条用户消息的分钟数 */
  delayMinutes: number;
  /** 情感检测结果 */
  sentiment: 'positive' | 'negative' | 'neutral';
  /** 是否提及第三方 */
  hasThirdParty: boolean;
};

export type ThresholdResult =
  | { triggered: true; type: 'contact' }
  | { triggered: true; type: 'hint' }
  | { triggered: false; type: 'none' };

// ===== Sentiment keywords =====

const POSITIVE_WORDS = [
  '爱', '喜欢', '想', '开心', '好', '棒', '谢谢', '抱', '吻', '亲',
  '温暖', '感动', '哈哈', '嘻嘻', '嘿嘿', '太棒了', '真好',
];

const NEGATIVE_WORDS = [
  '烦', '累', '难过', '哭', '怕', '担心', '讨厌', '生气',
  '无聊', '失望', '恨', '滚', '烦死了', '不开心',
];

const THIRD_PARTY_WORDS = [
  '他', '她', 'TA', '朋友', '同事', '同学', '别人', '那个人',
];

// ===== Utility =====

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ===== Defaults =====

export function defaultResonanceState(): ResonanceState {
  return {
    connection: 0.1,
    restraint: 0,
    valence: 0.1,
    arousal: -0.1,
    immersion: 0,
    lastTick: Date.now(),
    tickCount: 0,
    contactCount: 0,
    lastContactTime: null,
  };
}

export function defaultResonanceConfig(): ResonanceConfig {
  return {
    connectionGrowthRate: 0.005,
    connectionDecayOnReply: 0.06,
    restraintRegressRate: 0.003,
    restraintBlockThreshold: 0.5,
    restraintErosionRate: 0.001,
    valenceRegressRate: 0.005,
    valenceSetpoint: 0,
    arousalRegressRate: 0.005,
    arousalSetpoint: 0,
    immersionDecayRate: 0.010,
    contactThreshold: 0.55,
    contactCooldownMinutes: 30,
    maxDailyContacts: 8,
    userIdleThresholdMinutes: 5,
    positiveSentimentBoost: 0.08,
    negativeSentimentBoost: 0.06,
    longSilenceConnectionBoost: 0.05,
    longSilenceRestraintDrop: 0.03,
    longSilenceThresholdMinutes: 30,
  };
}

// ===== Sentiment detection =====

/** 轻量关键词情感检测，不调 API */
export function getSentiment(text: string | undefined | null): SentimentResult {
  if (!text) return { sentiment: 'neutral', hasThirdParty: false };

  let score = 0;
  for (const w of POSITIVE_WORDS) {
    if (text.includes(w)) score++;
  }
  for (const w of NEGATIVE_WORDS) {
    if (text.includes(w)) score--;
  }

  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score > 0) sentiment = 'positive';
  else if (score < 0) sentiment = 'negative';

  const hasThirdParty = THIRD_PARTY_WORDS.some(w => text.includes(w));

  return { sentiment, hasThirdParty };
}

// ===== Core: tick（时间流逝） =====

/**
 * 时间推进，返回新的 ResonanceState（不修改原对象）。
 * @param minutesElapsed 经过的分钟数
 */
export function tick(
  state: ResonanceState,
  config: ResonanceConfig,
  minutesElapsed: number,
): ResonanceState {
  if (minutesElapsed <= 0) return state;

  const s = { ...state };

  // connection grows silently
  s.connection = clamp(s.connection + config.connectionGrowthRate * minutesElapsed, 0, 1);

  // restraint regresses toward 0
  if (s.restraint > 0) {
    s.restraint = clamp(s.restraint - config.restraintRegressRate * minutesElapsed, 0, 1);
  } else {
    s.restraint = clamp(s.restraint + config.restraintRegressRate * minutesElapsed, -1, 0);
  }

  // High connection erodes restraint
  if (s.connection >= config.contactThreshold && s.restraint > 0) {
    s.restraint = clamp(s.restraint - config.restraintErosionRate * minutesElapsed, 0, 1);
  }

  // valence → setpoint
  if (s.valence > config.valenceSetpoint) {
    s.valence = clamp(s.valence - config.valenceRegressRate * minutesElapsed, config.valenceSetpoint, 1);
  } else {
    s.valence = clamp(s.valence + config.valenceRegressRate * minutesElapsed, -1, config.valenceSetpoint);
  }

  // arousal → setpoint
  if (s.arousal > config.arousalSetpoint) {
    s.arousal = clamp(s.arousal - config.arousalRegressRate * minutesElapsed, config.arousalSetpoint, 1);
  } else {
    s.arousal = clamp(s.arousal + config.arousalRegressRate * minutesElapsed, -1, config.arousalSetpoint);
  }

  // immersion decays
  s.immersion = clamp(s.immersion - config.immersionDecayRate * minutesElapsed, 0, 1);

  s.lastTick = Date.now();
  s.tickCount = (s.tickCount || 0) + 1;
  return s;
}

// ===== Core: applyInteraction（交互冲击） =====

/**
 * 应用用户消息的交互效果，返回新的 ResonanceState（不修改原对象）。
 */
export function applyInteraction(
  state: ResonanceState,
  config: ResonanceConfig,
  input: InteractionInput,
): ResonanceState {
  const s = { ...state };

  // User was replied to → connection satisfied, drops slightly
  if (input.replied) {
    s.connection = clamp(s.connection - config.connectionDecayOnReply, 0, 1);
  }

  // Long silence then user speaks → connection up, restraint down
  if (input.delayMinutes > config.longSilenceThresholdMinutes) {
    s.connection = clamp(s.connection + config.longSilenceConnectionBoost, 0, 1);
    s.restraint = clamp(s.restraint - config.longSilenceRestraintDrop, -1, 1);
  }

  // Sentiment affects valence
  if (input.sentiment === 'positive') {
    s.valence = clamp(s.valence + config.positiveSentimentBoost, -1, 1);
  } else if (input.sentiment === 'negative') {
    s.valence = clamp(s.valence - config.negativeSentimentBoost, -1, 1);
  }

  // Third party mention → restraint up
  if (input.hasThirdParty) {
    s.restraint = clamp(s.restraint + 0.05, 0, 1);
  }

  s.lastTick = Date.now();
  return s;
}

// ===== Core: checkThreshold（阈值检测） =====

/**
 * 检测是否触发主动联系。
 * 连接感超阈值 → contact；但如果克制过高 → 只发 hint。
 */
export function checkThreshold(
  state: ResonanceState,
  config: ResonanceConfig,
): ThresholdResult {
  if (state.connection >= config.contactThreshold) {
    if (state.restraint >= config.restraintBlockThreshold) {
      return { triggered: true, type: 'hint' };
    }
    return { triggered: true, type: 'contact' };
  }
  return { triggered: false, type: 'none' };
}

// ===== Core: canContact（保护条件） =====

/**
 * 检查是否满足主动联系的前置条件：
 * - 距离上次联系 >= cooldown
 * - 当日联系次数 < 上限
 * - 用户最近有活动（非 idle）
 */
export function canContact(
  state: ResonanceState,
  config: ResonanceConfig,
  lastUserMessageTime: number | null,
): boolean {
  const now = Date.now();

  if (
    state.lastContactTime &&
    now - state.lastContactTime < config.contactCooldownMinutes * 60 * 1000
  ) {
    return false;
  }

  if ((state.contactCount || 0) >= config.maxDailyContacts) {
    return false;
  }

  if (
    lastUserMessageTime &&
    now - lastUserMessageTime < config.userIdleThresholdMinutes * 60 * 1000
  ) {
    return false;
  }

  return true;
}

// ===== Core: getStyleGuidance（状态 → 风格指引） =====

/**
 * 从五维状态提取 UI 可用的风格指引（心情 + 强度 + 克制）。
 */
export function getStyleGuidance(state: ResonanceState): ResonanceStyleGuidance {
  const { connection, restraint, valence, arousal } = state;

  let mood: ResonanceMood = 'neutral';
  if (connection >= 0.6 && restraint < 0.3) {
    mood = 'warm';
  } else if (connection >= 0.6 && restraint >= 0.5) {
    mood = 'cool';
  } else if (valence <= -0.3) {
    mood = 'sad';
  } else if (arousal >= 0.3) {
    mood = 'restless';
  } else if (arousal <= -0.3) {
    mood = 'calm';
  }

  const intensity = clamp(
    (Math.abs(connection) + Math.abs(valence) + Math.abs(arousal)) / 3,
    0,
    1,
  );

  return { mood, intensity, restraint };
}
