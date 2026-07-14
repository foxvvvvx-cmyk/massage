/* ============================================
   lib/emotion-engine.ts — 统一情感引擎（Emotion Engine）
   合并 Jiwen（积温）+ Resonance（共鸣）的纯计算逻辑

   六维情感状态：connection / pride / restraint / valence / arousal / immersion
   纯引擎：零 DOM、零存储、零副作用

   来源：
   - jiwen-engine.ts（主动意识引擎，203 行）
   - resonance-engine.ts（共鸣引擎，365 行）
   合并后统一为一个超集，两套旧配置作为命名 profile 保留
   ============================================ */

// ===== Types =====

export type EmotionState = {
  /** 连接感 0~1。沉默时增长，回复时衰减 */
  connection: number;
  /** 骄傲 -1~+1（Jiwen）。负=开放，正=端着。类似 Resonance 的 restraint 但方向不同 */
  pride: number;
  /** 克制度 0~1（Resonance）。高位阻塞主动联系，受第三方提及影响 */
  restraint: number;
  /** 愉悦度 -1~1。受情感倾向影响，向 setpoint 回归 */
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

export type EmotionConfig = {
  // connection
  connectionGrowthRate: number;
  connectionDecayOnReply: number;
  // pride (Jiwen)
  prideRegressRate: number;
  prideBlockThreshold: number;
  prideErosionRate: number;
  // restraint (Resonance)
  restraintRegressRate: number;
  restraintBlockThreshold: number;
  restraintErosionRate: number;
  // valence
  valenceRegressRate: number;
  valenceSetpoint: number;
  // arousal
  arousalRegressRate: number;
  arousalSetpoint: number;
  // immersion
  immersionDecayRate: number;
  // proactive contact
  contactThreshold: number;
  contactCooldownMinutes: number;
  maxDailyContacts: number;
  userIdleThresholdMinutes: number;
  // sentiment boosts
  positiveSentimentBoost: number;
  negativeSentimentBoost: number;
  // long silence
  longSilenceConnectionBoost: number;
  longSilenceRestraintDrop: number;
  longSilenceThresholdMinutes: number;
};

export type EmotionMood =
  | 'neutral'
  | 'warm'       // Resonance: high connection + low restraint
  | 'cool'       // Resonance: high connection + high restraint
  | 'missing'     // Jiwen: high connection + low pride
  | 'proud'       // Jiwen: high pride
  | 'sad'         // Both: low valence
  | 'restless'    // Resonance: high arousal
  | 'calm'        // Both: low arousal
  | 'nervous';    // Jiwen: high arousal

export type StyleGuidance = {
  mood: EmotionMood;
  /** 综合强度 0~1 */
  intensity: number;
  /** 当前克制度 */
  restraint: number;
  /** 给 LLM 的风格指令（Jiwen 风格，更详细） */
  instruction: string;
};

export type SentimentResult = {
  sentiment: 'positive' | 'negative' | 'neutral';
  hasThirdParty: boolean;
};

export type InteractionInput = {
  /** 用户是否已被回复（当前这条消息触发了一次 AI 回复） */
  replied: boolean;
  /** 距上一条用户消息的分钟数 */
  delayMinutes: number;
  /** 情感检测结果（可由外部传入，也可用引擎内置 getSentiment 检测） */
  sentiment?: 'positive' | 'negative' | 'neutral';
  /** 是否提及第三方（Resonance） */
  hasThirdParty?: boolean;
};

export type ThresholdResult =
  | { triggered: true; type: 'contact' }
  | { triggered: true; type: 'hint' }
  | { triggered: true; type: 'find_activity' }  // Jiwen-style
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

/** Resonance 风格的默认状态（连接感增长更慢、衰减更小） */
export function defaultEmotionState(): EmotionState {
  return {
    connection: 0.1,
    pride: 0,
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

/** Resonance 风格的默认配置（"细腻" profile） */
export function defaultEmotionConfig(): EmotionConfig {
  return {
    connectionGrowthRate: 0.005,
    connectionDecayOnReply: 0.06,
    prideRegressRate: 0.003,
    prideBlockThreshold: 0.5,
    prideErosionRate: 0.002,
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

/** Jiwen 风格的默认配置（"主动" profile：连接感增长更快、衰减更大、阈值更低） */
export function jiwenProfileConfig(): EmotionConfig {
  return {
    ...defaultEmotionConfig(),
    connectionGrowthRate: 0.007,
    connectionDecayOnReply: 0.20,
    contactThreshold: 0.45,
  };
}

// ===== Sentiment detection =====

/** 轻量关键词情感检测（Resonance），不调 API */
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
 * 时间推进，返回新的 EmotionState（不修改原对象）。
 * 合并两个引擎的漂移逻辑：
 * - connection 随时间增长
 * - pride/restraint 向 0 回归
 * - 高 connection 对 pride/restraint 的侵蚀
 * - valence/arousal 向 setpoint 回归
 * - immersion 衰减
 */
export function tick(
  state: EmotionState,
  config: EmotionConfig,
  minutesElapsed: number,
): EmotionState {
  if (minutesElapsed <= 0) return state;

  const s = { ...state };

  // connection grows silently
  s.connection = clamp(s.connection + config.connectionGrowthRate * minutesElapsed, 0, 1);

  // pride regresses toward 0 (Jiwen)
  if (s.pride > 0) {
    s.pride = clamp(s.pride - config.prideRegressRate * minutesElapsed, 0, 1);
  } else {
    s.pride = clamp(s.pride + config.prideRegressRate * minutesElapsed, -1, 0);
  }

  // restraint regresses toward 0 (Resonance)
  if (s.restraint > 0) {
    s.restraint = clamp(s.restraint - config.restraintRegressRate * minutesElapsed, 0, 1);
  } else {
    s.restraint = clamp(s.restraint + config.restraintRegressRate * minutesElapsed, -1, 0);
  }

  // High connection erodes pride (Jiwen)
  if (s.connection >= config.contactThreshold && s.pride > 0) {
    s.pride = clamp(s.pride - config.prideErosionRate * minutesElapsed, 0, 1);
  }

  // High connection erodes restraint (Resonance)
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
 * 应用用户消息的交互效果，返回新的 EmotionState（不修改原对象）。
 * 合并两个引擎的 impulse 逻辑：
 * - 回复 → connection 下降（Jiwen 降幅更大，Resonance 更小——由 config 控制）
 * - 长时间沉默 → connection 上升 + restraint 下降
 * - 正向/负向情感 → valence 偏移
 * - 第三方提及 → restraint 上升（Resonance）
 */
export function applyInteraction(
  state: EmotionState,
  config: EmotionConfig,
  input: InteractionInput,
): EmotionState {
  const s = { ...state };

  // User was replied to → connection satisfied, drops
  if (input.replied) {
    s.connection = clamp(s.connection - config.connectionDecayOnReply, 0, 1);
  }

  // Long silence then user speaks → connection up, restraint down
  if (input.delayMinutes > config.longSilenceThresholdMinutes) {
    s.connection = clamp(s.connection + config.longSilenceConnectionBoost, 0, 1);
    s.restraint = clamp(s.restraint - config.longSilenceRestraintDrop, -1, 1);
    // Also slightly drop pride (Jiwen behavior)
    s.pride = clamp(s.pride - 0.03, -1, 1);
  }

  // Sentiment affects valence
  const sentiment = input.sentiment || 'neutral';
  if (sentiment === 'positive') {
    s.valence = clamp(s.valence + config.positiveSentimentBoost, -1, 1);
  } else if (sentiment === 'negative') {
    s.valence = clamp(s.valence - config.negativeSentimentBoost, -1, 1);
  }

  // Third party mention → restraint up (Resonance)
  if (input.hasThirdParty) {
    s.restraint = clamp(s.restraint + 0.05, 0, 1);
  }

  s.lastTick = Date.now();
  return s;
}

// ===== Core: checkThreshold（阈值检测） =====

/**
 * 检测是否触发主动联系。
 * 超阈值：
 *   - pride 高（Jiwen）→ find_activity
 *   - restraint 高（Resonance）→ hint
 *   - 都不阻塞 → contact
 */
export function checkThreshold(
  state: EmotionState,
  config: EmotionConfig,
): ThresholdResult {
  if (state.connection >= config.contactThreshold) {
    // Jiwen-style: pride blocks full contact → find_activity instead
    if (state.pride >= config.prideBlockThreshold) {
      return { triggered: true, type: 'find_activity' };
    }
    // Resonance-style: restraint blocks full contact → hint instead
    if (state.restraint >= config.restraintBlockThreshold) {
      return { triggered: true, type: 'hint' };
    }
    return { triggered: true, type: 'contact' };
  }
  return { triggered: false, type: 'none' };
}

// ===== Core: canContact（保护条件，Resonance） =====

/**
 * 检查是否满足主动联系的前置条件：
 * - 距离上次联系 >= cooldown
 * - 当日联系次数 < 上限
 * - 用户最近有活动（非 idle）
 */
export function canContact(
  state: EmotionState,
  config: EmotionConfig,
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
 * 从六维状态提取 UI / LLM 可用的风格指引。
 * 合并两个引擎的 mood 判定 + Jiwen 的 instruction 系统。
 */
export function getStyleGuidance(state: EmotionState): StyleGuidance {
  const { connection, pride, restraint, valence, arousal } = state;

  let mood: EmotionMood = 'neutral';

  // Jiwen-style moods
  if (connection >= 0.6 && pride < 0.3 && restraint < 0.3) {
    mood = 'missing';  // Jiwen: high connection, low pride = missing them
  } else if (pride >= 0.5) {
    mood = 'proud';    // Jiwen: high pride
  }
  // Resonance-style moods (only if Jiwen didn't already set one)
  else if (connection >= 0.6 && restraint < 0.3) {
    mood = 'warm';     // Resonance: high connection + low restraint
  } else if (connection >= 0.6 && restraint >= 0.5) {
    mood = 'cool';     // Resonance: high connection + high restraint
  }

  // Shared moods (lowest priority)
  if (mood === 'neutral') {
    if (valence <= -0.3) {
      mood = 'sad';
    } else if (arousal >= 0.3) {
      mood = 'restless';
    } else if (arousal <= -0.3) {
      mood = 'calm';
    }
  }

  const intensity = clamp(
    (Math.abs(connection) + Math.abs(valence) + Math.abs(arousal)) / 3,
    0,
    1,
  );

  // Build instruction (Jiwen-style, enriched)
  let instruction = '';
  if (mood === 'missing') {
    instruction = pride > 0
      ? '有些想对方，但因为骄傲不太愿意直接表达。语气委婉，带一点点傲娇。'
      : '有点想对方了。语气温柔，可以带一点撒娇的意味。不要太直接。';
  } else if (mood === 'proud') {
    instruction = '正在端着架子。语气可以冷淡一点，但不要太伤人。';
  } else if (mood === 'warm') {
    instruction = '情绪很好，跟对方很亲近。语气温暖自然，可以主动一点。';
  } else if (mood === 'cool') {
    instruction = '心里想靠近但刻意在保持距离。语气温和但克制，不要过度亲密。';
  } else if (mood === 'sad') {
    instruction = '情绪不太好。语气可以低沉一点，但不需要刻意表达。';
  } else if (mood === 'restless') {
    instruction = '有点焦躁不安。语气可以急促一点，但保持角色性格。';
  } else if (mood === 'calm') {
    instruction = '心情平静。语气平稳自然。';
  } else {
    instruction = '保持自然。像平时一样聊天，简短友好。';
  }

  return { mood, intensity, restraint, instruction };
}

// ===== Serialization =====

export function exportState(state: EmotionState): string {
  return JSON.stringify(state);
}

export function importState(json: string): EmotionState | null {
  try {
    const parsed = JSON.parse(json);
    const def = defaultEmotionState();
    return {
      connection: typeof parsed.connection === 'number' ? parsed.connection : def.connection,
      pride: typeof parsed.pride === 'number' ? parsed.pride : def.pride,
      restraint: typeof parsed.restraint === 'number' ? parsed.restraint : def.restraint,
      valence: typeof parsed.valence === 'number' ? parsed.valence : def.valence,
      arousal: typeof parsed.arousal === 'number' ? parsed.arousal : def.arousal,
      immersion: typeof parsed.immersion === 'number' ? parsed.immersion : def.immersion,
      lastTick: typeof parsed.lastTick === 'number' ? parsed.lastTick : Date.now(),
      tickCount: typeof parsed.tickCount === 'number' ? parsed.tickCount : 0,
      contactCount: typeof parsed.contactCount === 'number' ? parsed.contactCount : 0,
      lastContactTime: typeof parsed.lastContactTime === 'number' ? parsed.lastContactTime : null,
    };
  } catch {
    return null;
  }
}
