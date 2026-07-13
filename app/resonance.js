/* ============================================
   app/resonance.js — 共鸣引擎（Resonance Engine）
   每个 Persona 独立的五维情感状态模拟
   纯引擎：不操作 DOM、不访问 localStorage、不保存数据
   ============================================ */

import { defaultResonanceConfig, defaultResonanceState, RESONANCE_VERSION, POSITIVE_WORDS, NEGATIVE_WORDS, THIRD_PARTY_WORDS } from './consts.js'

// ===== Utility =====
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// ===== Factory =====
export function createResonanceState() {
  return { ...defaultResonanceState(), lastTick: Date.now() }
}

export function createResonanceConfig(overrides) {
  return { ...defaultResonanceConfig(), ...(overrides || {}) }
}

// ===== Core: tick（时间流逝） =====
/** @returns {object} 新的 ResonanceState（不修改原对象） */
export function tick(state, config, minutesElapsed) {
  if (minutesElapsed <= 0) return state
  const s = { ...state }

  s.connection = clamp(s.connection + config.connectionGrowthRate * minutesElapsed, 0, 1)

  // restraint regresses toward 0
  if (s.restraint > 0) {
    s.restraint = clamp(s.restraint - config.restraintRegressRate * minutesElapsed, 0, 1)
  } else {
    s.restraint = clamp(s.restraint + config.restraintRegressRate * minutesElapsed, -1, 0)
  }

  // When connection is high and there's restraint, connection erodes restraint
  if (s.connection >= config.contactThreshold && s.restraint > 0) {
    s.restraint = clamp(s.restraint - config.restraintErosionRate * minutesElapsed, 0, 1)
  }

  // valence → setpoint
  if (s.valence > config.valenceSetpoint) {
    s.valence = clamp(s.valence - config.valenceRegressRate * minutesElapsed, config.valenceSetpoint, 1)
  } else {
    s.valence = clamp(s.valence + config.valenceRegressRate * minutesElapsed, -1, config.valenceSetpoint)
  }

  // arousal → setpoint
  if (s.arousal > config.arousalSetpoint) {
    s.arousal = clamp(s.arousal - config.arousalRegressRate * minutesElapsed, config.arousalSetpoint, 1)
  } else {
    s.arousal = clamp(s.arousal + config.arousalRegressRate * minutesElapsed, -1, config.arousalSetpoint)
  }

  // immersion decays
  s.immersion = clamp(s.immersion - config.immersionDecayRate * minutesElapsed, 0, 1)

  s.lastTick = Date.now()
  s.tickCount = (s.tickCount || 0) + 1
  return s
}

// ===== Core: applyInteraction（交互冲击） =====
/** @returns {object} 新的 ResonanceState（不修改原对象） */
export function applyInteraction(state, config, input) {
  const s = { ...state }

  // User was replied to → connection satisfied, drops slightly
  if (input.replied) {
    s.connection = clamp(s.connection - config.connectionDecayOnReply, 0, 1)
  }

  // Long silence then user speaks → connection up, restraint down
  if (input.delayMinutes > config.longSilenceThresholdMinutes) {
    s.connection = clamp(s.connection + config.longSilenceConnectionBoost, 0, 1)
    s.restraint = clamp(s.restraint - config.longSilenceRestraintDrop, -1, 1)
  }

  // Sentiment affects valence
  if (input.sentiment === 'positive') {
    s.valence = clamp(s.valence + config.positiveSentimentBoost, -1, 1)
  } else if (input.sentiment === 'negative') {
    s.valence = clamp(s.valence - config.negativeSentimentBoost, -1, 1)
  }

  // Third party mention → restraint up
  if (input.hasThirdParty) {
    s.restraint = clamp(s.restraint + 0.05, 0, 1)
  }

  s.lastTick = Date.now()
  return s
}

// ===== Core: checkThreshold（阈值检测） =====
export function checkThreshold(state, config) {
  if (state.connection >= config.contactThreshold) {
    if (state.restraint >= config.restraintBlockThreshold) {
      return { triggered: true, type: 'hint' }
    }
    return { triggered: true, type: 'contact' }
  }
  return { triggered: false, type: 'none' }
}

// ===== Core: canContact（保护条件） =====
export function canContact(state, config, lastUserMessageTime) {
  const now = Date.now()

  if (state.lastContactTime && (now - state.lastContactTime) < config.contactCooldownMinutes * 60 * 1000) {
    return false
  }
  if ((state.contactCount || 0) >= config.maxDailyContacts) {
    return false
  }
  if (lastUserMessageTime && (now - lastUserMessageTime) < config.userIdleThresholdMinutes * 60 * 1000) {
    return false
  }
  return true
}

// ===== Core: getStyleGuidance（状态输出） =====
export function getStyleGuidance(state) {
  const { connection, restraint, valence, arousal } = state

  let mood = 'neutral'
  if (connection >= 0.6 && restraint < 0.3) {
    mood = 'warm'
  } else if (connection >= 0.6 && restraint >= 0.5) {
    mood = 'cool'
  } else if (valence <= -0.3) {
    mood = 'sad'
  } else if (arousal >= 0.3) {
    mood = 'restless'
  } else if (arousal <= -0.3) {
    mood = 'calm'
  }

  const intensity = clamp((Math.abs(connection) + Math.abs(valence) + Math.abs(arousal)) / 3, 0, 1)

  return { mood, intensity, restraint }
}

// ===== Sentiment detection（轻量 NL） =====
export function getSentiment(text) {
  if (!text) return { sentiment: 'neutral', hasThirdParty: false }

  let score = 0
  POSITIVE_WORDS.forEach(w => { if (text.includes(w)) score++ })
  NEGATIVE_WORDS.forEach(w => { if (text.includes(w)) score-- })

  let sentiment = 'neutral'
  if (score > 0) sentiment = 'positive'
  else if (score < 0) sentiment = 'negative'

  const hasThirdParty = THIRD_PARTY_WORDS.some(w => text.includes(w))

  return { sentiment, hasThirdParty }
}

// ===== Per-persona state accessors =====
export function getResonanceState(persona) {
  if (!persona || !persona.resonance) return null
  return persona.resonance.state
}

export function ensureResonance(persona) {
  if (!persona.resonance) {
    persona.resonance = {
      version: RESONANCE_VERSION,
      state: createResonanceState(),
      config: createResonanceConfig(),
      interactions: []
    }
  }
  return persona.resonance
}

// ===== Record interaction =====
export function recordInteraction(persona, record) {
  ensureResonance(persona)
  persona.resonance.interactions.unshift({
    ts: Date.now(),
    ...record
  })
  // Keep last 50
  if (persona.resonance.interactions.length > 50) {
    persona.resonance.interactions.length = 50
  }
}

// ===== Batch tick（计算，不保存） =====
/**
 * 对活跃角色执行 tick，返回变更结果。
 * 调用方负责持久化保存。
 * @returns {Array} [{ persona, oldState, newState }]
 */
export function tickActiveResonances(personas, activePersonaId, now) {
  const results = []

  const targets = personas.filter(p => {
    if (p.id === activePersonaId) return true
    if (!p.chatHistory || !p.chatHistory.length) return false
    const lastMsg = p.chatHistory[p.chatHistory.length - 1]
    return (now - lastMsg.ts) < 24 * 3600 * 1000
  }).slice(0, 3)

  for (const p of targets) {
    ensureResonance(p)
    const state = p.resonance.state
    const config = p.resonance.config
    const minutes = Math.max(0, (now - state.lastTick) / 60000)
    if (minutes < 1) continue  // skip if less than 1 minute

    const newState = tick(state, config, minutes)
    const oldState = { ...state }

    // Apply state (caller saves persona)
    p.resonance.state = newState

    results.push({ persona: p, oldState, newState })
  }

  return results
}
