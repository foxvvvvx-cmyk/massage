/* ============================================
   app/provider.js — Provider 抽象层
   统一 API 调用接口。新增 Provider 只需添加子类。
   send() 不包含任何 Provider 特定逻辑。
   ============================================ */

import { config } from './state.js'
import { DEEPSEEK_CHAT, DEEPSEEK_BALANCE, OPENROUTER_CHAT, OPENROUTER_BALANCE, ANTHROPIC_CHAT } from './consts.js'

// ===== Base Provider =====
class BaseProvider {
  /** 获取 API 配置（baseUrl, apiKey, headers） */
  getConfig() { throw new Error('Not implemented') }

  /** 获取余额 */
  async fetchBalance() { return null }

  /**
   * 解析模型名。每个 Provider 可覆盖此方法实现自己的模型选择逻辑。
   * @param {object} persona - 当前角色
   * @param {object} opts - { deepThink, matchedCount }
   * @returns {string} 模型名
   */
  resolveModel(persona, opts) {
    return this.getConfig().model
  }

  /**
   * 构建请求体。每个 Provider 可覆盖此方法。
   * @param {Array} messages - 消息列表 [{role, content}]
   * @param {object} opts - { persona, matchedCount }
   * @returns {object} fetch body
   */
  buildRequestBody(messages, opts) {
    const p = opts.persona || {}
    const temp = opts.matchedCount > 0
      ? Math.max(0.3, (p.temperature ?? 1.3) - 0.15)
      : (p.temperature ?? 1.3)
    return {
      model: this.resolveModel(p, opts),
      temperature: temp,
      max_tokens: 4096,
      stream: true,
      messages
    }
  }

  /**
   * 从 SSE 数据行解析出 delta 对象。每个 Provider 可覆盖此方法。
   * 默认：OpenAI 兼容格式 j.choices[0].delta
   * @param {object} json - 已解析的 JSON 对象
   * @returns {object|null} delta 对象或 null
   */
  extractDelta(json) {
    return json.choices?.[0]?.delta || null
  }

  /**
   * 从 delta 中提取内容文本。默认：OpenAI 格式 delta.content
   * @returns {string|null} 文本内容，null 表示无新内容
   */
  extractDeltaContent(delta) {
    if (typeof delta?.content === 'string') return delta.content
    return null
  }

  /**
   * 从 delta 中提取推理内容。默认：OpenAI 格式 delta.reasoning_content
   * @returns {string|null}
   */
  extractDeltaReasoning(delta) {
    if (typeof delta?.reasoning_content === 'string') return delta.reasoning_content
    return null
  }

  /**
   * 从完整响应 JSON 中提取消息文本
   */
  extractResponseContent(json) {
    return json.choices?.[0]?.message?.content || ''
  }
}

// ===== DeepSeek Provider =====
class DeepSeekProvider extends BaseProvider {
  getConfig() {
    return {
      baseUrl: DEEPSEEK_CHAT,
      apiKey: config.apiKey || '',
      model: 'deepseek-chat',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (config.apiKey || '')
      }
    }
  }

  resolveModel(persona, opts) {
    const useReasoner = config.deepThink || !!persona.useReasoner
    return useReasoner ? 'deepseek-reasoner' : (persona.model || 'deepseek-chat')
  }

  buildRequestBody(messages, opts) {
    const body = super.buildRequestBody(messages, opts)
    body.top_p = (opts.persona?.topP ?? 0.9)
    return body
  }

  async fetchBalance() {
    if (!config.apiKey) return null
    try {
      const r = await fetch(DEEPSEEK_BALANCE, { headers: { 'Authorization': 'Bearer ' + config.apiKey } })
      const d = await r.json()
      const i = d.balance_infos?.[0]
      return i ? parseFloat(i.total_balance).toFixed(2) + ' ' + i.currency : null
    } catch (e) { return null }
  }

  getBalanceUrl() { return DEEPSEEK_BALANCE }
}

// ===== OpenRouter Provider =====
class OpenRouterProvider extends BaseProvider {
  getConfig() {
    return {
      baseUrl: OPENROUTER_CHAT,
      apiKey: config.openrouterKey || '',
      model: config.openrouterModel || 'anthropic/claude-sonnet-4.6',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (config.openrouterKey || ''),
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': '沈度'
      }
    }
  }

  // OpenRouter doesn't support top_p in the same way — omit it
  buildRequestBody(messages, opts) {
    const body = super.buildRequestBody(messages, opts)
    // No top_p for OpenRouter
    return body
  }

  async fetchBalance() {
    if (!config.openrouterKey) return null
    try {
      const r = await fetch(OPENROUTER_BALANCE, { headers: { 'Authorization': 'Bearer ' + config.openrouterKey } })
      const d = await r.json()
      return d.data?.credits !== undefined ? parseFloat(d.data.credits).toFixed(2) + ' USD' : null
    } catch (e) { return null }
  }

  getBalanceUrl() { return OPENROUTER_BALANCE }
}

// ===== Custom OpenAI-compatible Provider =====
class CustomProvider extends BaseProvider {
  getConfig() {
    const base = (config.customBaseUrl || '').replace(/\/+$/, '')
    return {
      baseUrl: base + '/chat/completions',
      apiKey: config.customApiKey || '',
      model: config.customModel || 'gpt-4o',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (config.customApiKey || '')
      }
    }
  }

  async fetchBalance() { return '自定义API' }
}

// ===== Anthropic Claude Provider =====
class ClaudeProvider extends BaseProvider {
  getConfig() {
    return {
      baseUrl: ANTHROPIC_CHAT,
      apiKey: config.claudeKey || '',
      model: config.claudeModel || 'claude-sonnet-5-20251001',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.claudeKey || '',
        'anthropic-version': '2023-06-01'
      }
    }
  }

  resolveModel(persona, opts) {
    return config.claudeModel || 'claude-sonnet-5-20251001'
  }

  buildRequestBody(messages, opts) {
    const p = opts.persona || {}
    const temp = opts.matchedCount > 0
      ? Math.max(0.3, (p.temperature ?? 1.3) - 0.15)
      : (p.temperature ?? 1.3)
    // Anthropic: system is a top-level field, not a message
    const systemMsg = messages.find(m => m.role === 'system')
    const chatMsgs = messages.filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content || '' }))
    const body = {
      model: this.resolveModel(p, opts),
      max_tokens: 4096,
      temperature: temp,
      stream: true,
      messages: chatMsgs
    }
    if (systemMsg) body.system = systemMsg.content
    return body
  }

  // Anthropic SSE format: data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
  extractDelta(json) {
    if (!json) return null
    const type = json.type
    // content_block_delta carries the actual text
    if (type === 'content_block_delta' && json.delta) {
      return json.delta
    }
    // content_block_start for thinking
    if (type === 'content_block_start' && json.content_block) {
      return json.content_block
    }
    return null
  }

  extractDeltaContent(delta) {
    if (delta?.type === 'text_delta' && typeof delta.text === 'string') return delta.text
    return null
  }

  extractDeltaReasoning(delta) {
    if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') return delta.thinking
    if (delta?.type === 'thinking' && typeof delta.thinking === 'string') return delta.thinking
    return null
  }

  extractResponseContent(json) {
    // Anthropic non-streaming response format
    if (json.content && Array.isArray(json.content)) {
      return json.content.filter(b => b.type === 'text').map(b => b.text).join('')
    }
    return ''
  }

  async fetchBalance() {
    return 'Claude API (无余额接口)'
  }
}

// ===== Provider Factory =====
const providers = {
  deepseek: DeepSeekProvider,
  openrouter: OpenRouterProvider,
  custom: CustomProvider,
  claude: ClaudeProvider
}

/** 获取当前活动的 Provider 实例 */
export function getProvider() {
  const name = config.apiProvider || 'deepseek'
  const Cls = providers[name] || DeepSeekProvider
  return new Cls()
}

/** 获取当前有效的 API Key */
export function getActiveApiKey() {
  const p = config.apiProvider || 'deepseek'
  if (p === 'openrouter') return config.openrouterKey || ''
  if (p === 'custom') return config.customApiKey || ''
  if (p === 'claude') return config.claudeKey || ''
  return config.apiKey || ''
}

/** 获取 API 配置（兼容旧接口） */
export function getApiConfig() {
  return getProvider().getConfig()
}

/** 统一的余额查询入口 */
export async function fetchBalance() {
  return getProvider().fetchBalance()
}

// ===== Vision API (独立 Provider，用于图片识别) =====
export async function describeImages(images) {
  if (!config.visionEnabled || !config.visionBaseUrl || !config.visionApiKey || !config.visionModel) {
    return null
  }
  const baseUrl = config.visionBaseUrl.replace(/\/+$/, '')
  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : baseUrl + '/chat/completions'
  const contentParts = [{ type: 'text', text: '请用中文简短描述这张图片的内容（50字以内）。只描述你能看到的，不要猜测或补充。' }]
  for (const img of images) {
    contentParts.push({ type: 'image_url', image_url: { url: img.dataUrl } })
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.visionApiKey },
      body: JSON.stringify({ model: config.visionModel, messages: [{ role: 'user', content: contentParts }], max_tokens: 200, temperature: 0.3 })
    })
    if (!res.ok) throw new Error('Vision API error: ' + res.status)
    const j = await res.json()
    const desc = j.choices?.[0]?.message?.content || ''
    return desc.trim() || null
  } catch (e) {
    console.error('[Vision] 图片识别失败:', e.message)
    return null
  }
}
