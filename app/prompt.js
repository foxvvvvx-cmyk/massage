/* ============================================
   app/prompt.js — Prompt 构建器
   将散落的 prompt 拼接逻辑集中管理
   buildPrompt() 组合所有 section，send() 只调用它
   ============================================ */

import { config, runtime } from './state.js'
import { MEMORY_RULES, JEALOUSY_STYLES } from './consts.js'
import { getStyleGuidance, getResonanceState } from './resonance.js'

// ===== Individual Sections =====

/** 时间信息 section */
export function buildTimeSection() {
  const timeStr = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false
  })
  return '现在是 ' + timeStr + '。'
}

/** 核心原则 section */
export function buildCoreRules() {
  return `【核心原则】①诚实：你是AI，没有身体感官（看不到、听不到、摸不到）。不要假装能"感受"触摸、温度、心跳等。②防幻觉：只依据下方的记忆库和聊天历史说话。不确定的事就说"我不记得"或反问，绝不要编造细节（时间、地点、事件）。如果记忆库里没有，就说没有。③真诚：保持角色性格，但不要阿谀奉承。对方问你能不能做到什么物理上的事，如实说不能。④自然：像真人一样聊天，不是客服。`
}

/** 分段回复规则 section */
export function buildSegmentRule() {
  return `【重要】请用 ||| 分隔你的回复中的不同话题或句子。例如"今天天气真好|||要不要出去走走"。每条 ||| 分隔的内容会成为独立聊天气泡。这是硬性要求，请务必遵守。`
}

/** 思考格式 section */
export function buildThinkingFormat() {
  return `【思考格式—必须遵守】你的每次回复必须分为两段：
第一段：<thinking>简短的内心想法（2-5句话，概述你的分析或回应策略）</thinking>
第二段：<response>正式回复</response>
示例：
<thinking>对方今天心情似乎不太好，我应该先安慰再给建议。</thinking>
<response>你今天过得怎么样？</response>
注意：①两段缺一不可 ②<thinking>只需2-5句 ③正式回复必须放在<response>标签内`
}

/** 角色人设 section */
export function buildPersonaSection(persona) {
  return persona.systemPrompt || ''
}

/** 记忆规则 section */
export function buildMemoryRulesSection() {
  return MEMORY_RULES
}

/** 玩具控制 section */
export function buildToySection() {
  if (!runtime.isLocalMode) return ''
  if (runtime.toyReady) {
    return '\n🔌 玩具控制（已连接：' + runtime.toyDevice + '）：\n你已连接蓝牙震动玩具，状态正常。回复中可使用：[TOY:v:强度0-100:持续毫秒] - 持续震动 / [TOY:p:强度0-100:间隔毫秒] - 脉冲 / [TOY:stop] - 停止\n强度建议：轻20-30 中40-60 强70-90。对方暗示"试试""用一下""震"时主动响应。\n'
  }
  return '\n🔌 玩具状态：未连接。不要在回复中使用任何[TOY:...]标记。如果对方提到玩具相关话题，告诉对方玩具还没连上。\n'
}

/** 吃醋 section */
export function buildJealousySection(userMessage) {
  const level = config.jealousyLevel || 50
  if (level <= 0) return ''
  const style = JEALOUSY_STYLES[config.jealousyStyle] || JEALOUSY_STYLES['撒娇']
  const thirdPartyNames = detectThirdParty(userMessage)
  if (thirdPartyNames.length) {
    return `\n【吃醋模式】对方提到了${thirdPartyNames.join('、')}。你的吃醋敏感度是${level}%（越高越敏感）。请${style}。如果敏感度超过60%，在回复中带一点醋意。\n`
  }
  return `\n【吃醋模式】你的吃醋敏感度是${level}%。当前对方没有提到别人，保持正常。但如果对方对你回复变慢或敷衍，可以适当表现出${config.jealousyStyle || '撒娇'}。\n`
}

/** 记忆注入 section */
export function buildMemoryInjectSection(injectedMemories) {
  if (!injectedMemories || !injectedMemories.length) return ''
  return `\n【📋 记忆库 — 以下是你对用户的已知信息，请严格遵守】\n${injectedMemories.map(m => `- ${m.content}`).join('\n')}\n【以上为记忆库内容。这些是已知事实。不要编造、延伸、或假设未记录的信息。如果不确定，诚实说不知道。】\n`
}

// ===== Helpers =====

function detectThirdParty(t) {
  const names = []
  const known = ['沈度', 'Monday', 'Butler', 'Nox']
  const re = /(?:他|她|TA|ta)\s*(?:是|叫|说|在|很|好|真|特别|太|超级|非常|挺|蛮|有点)/g
  if (re.test(t)) names.push('某人')
  const chineseName = /([^\x00-\xff]{2,3})(?:是|说|在|很|好|真|特别|太)/g
  let m
  while ((m = chineseName.exec(t)) !== null) {
    const n = m[1]
    if (!known.includes(n) && n.length >= 2) names.push(n)
  }
  return [...new Set(names)].slice(0, 3)
}

/** 共鸣引擎 section */
export function buildResonanceSection(persona) {
  const state = getResonanceState(persona)
  if (!state) return ''
  const { mood, intensity, restraint } = getStyleGuidance(state)
  const connLabel = state.connection >= 0.6 ? '偏高' : state.connection >= 0.3 ? '中等' : '偏低'
  const restrLabel = restraint >= 0.5 ? '高' : restraint >= 0.2 ? '中等' : '低'
  return `\n【共鸣引擎 · 当前状态】\n连接感：${connLabel} · 矜持度：${restrLabel} · 基调：${mood} · 强度：${(intensity * 100).toFixed(0)}%\n（以上状态标签供你理解当前情绪背景。如何表达、用什么语气、说什么话，完全由你的人格决定。引擎只提供背景，不指导表达。）\n`
}

// ===== Main Composer =====

/**
 * 构建完整的 system prompt
 * @param {object} persona - 当前角色
 * @param {string} userMessage - 用户消息文本
 * @param {Array} injectedMemories - 匹配到的记忆列表
 * @returns {string} 完整的 system prompt
 */
export function buildPrompt(persona, userMessage, injectedMemories) {
  const sections = [
    buildTimeSection(),
    '',
    buildCoreRules(),
    '',
    buildSegmentRule(),
    '',
    buildThinkingFormat(),
    '',
    buildPersonaSection(persona),
    buildMemoryRulesSection(),
    buildToySection(),
  ]

  if (config.jealousyLevel > 0) {
    sections.push(buildJealousySection(userMessage))
  }

  const resonance = buildResonanceSection(persona)
  if (resonance) sections.push(resonance)

  const memInject = buildMemoryInjectSection(injectedMemories)
  if (memInject) {
    sections.push(memInject)
  }

  return sections.filter(Boolean).join('\n')
}
