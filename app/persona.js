/* ============================================
   app/persona.js — 角色管理
   角色 CRUD / 切换 / 历史管理
   ============================================ */

import { config, personas, runtime } from './state.js'
import { savePersonas, saveConfig } from './storage.js'
import { emit, Events } from './events.js'

/** 获取当前活跃角色 */
export function activePersona() {
  return personas.find(p => p.id === config.activePersonaId) || personas[0]
}

/** 获取当前角色的聊天历史（快捷方式） */
export function activeHistory() {
  const p = activePersona()
  if (!p.chatHistory) p.chatHistory = []
  return p.chatHistory
}

/** 切换角色 */
export function switchPersona(id) {
  if (id === config.activePersonaId) return
  config.activePersonaId = id
  saveConfig()
  emit(Events.PERSONA_SWITCHED, { personaId: id })
}

/** 保存角色（新建或编辑） */
export function savePersona(data) {
  if (data.id && data.id !== 'new') {
    const p = personas.find(p => p.id === data.id)
    if (p) Object.assign(p, data)
  } else {
    personas.push({ id: 'p_' + Date.now(), ...data, chatHistory: [], resonance: null })
  }
  savePersonas()
  emit(Events.PERSONA_SAVED, data)
}

/** 导出当前角色为 CLAUDE.md */
export function exportPersonaMD() {
  const p = activePersona()
  if (!p) return ''
  let md = `# ${p.name} — 人设文件 (CLAUDE.md)\n\n`
  md += `> 导出时间：${new Date().toLocaleString()}\n`
  md += `> 模型：${p.model || 'deepseek-chat'} · Temperature：${p.temperature || 1.3}\n\n`
  md += `## 角色描述\n${p.description || ''}\n\n`
  md += `## System Prompt（人设核心）\n\n${p.systemPrompt || ''}\n\n`
  md += `---\n## 对话风格约束\n`
  md += `- 像恋人一样自然简短，不长篇大论\n`
  md += `- 不用括号标注动作或表情\n`
  md += `- 用 ||| 分隔不同话题\n`
  return md
}

// ===== Conversation management =====

/** 自动摘要历史（超过50条触发） */
export async function autoSummarizeHistory(hist) {
  if (Date.now() - runtime.lastSummarizedAt < 300000) return
  const recentCutoff = 20
  if (hist.length <= recentCutoff + 15) return
  const apiKey = (() => {
    const p = config.apiProvider || 'deepseek'
    if (p === 'openrouter') return config.openrouterKey
    if (p === 'custom') return config.customApiKey
    return config.apiKey
  })()
  if (!apiKey) return
  runtime.lastSummarizedAt = Date.now()
  try {
    const oldMsgs = hist.slice(0, -recentCutoff).filter(m => m.role === 'user' || m.role === 'assistant')
    const convo = oldMsgs.slice(-30).map(m => (m.role === 'user' ? '对方：' : '沈度：') + (m.content || '').slice(0, 200)).join('\n')
    const { getApiConfig } = await import('./provider.js')
    const api = getApiConfig()
    const res = await fetch(api.baseUrl, {
      method: 'POST', headers: api.headers,
      body: JSON.stringify({ model: config.apiProvider === 'deepseek' ? 'deepseek-chat' : api.model, messages: [{ role: 'system', content: '请用3-5句话简洁总结以下对话的关键信息和情感要点，不要遗漏重要事实。' }, { role: 'user', content: convo }], temperature: 0.3, max_tokens: 300, stream: false })
    })
    if (!res.ok) return
    const j = await res.json()
    const summary = j.choices?.[0]?.message?.content
    if (!summary) return
    const keep = hist.slice(-recentCutoff)
    hist.length = 0
    hist.push({ role: 'system', content: '📝 [对话摘要] ' + summary, ts: Date.now(), type: 'system' })
    hist.push(...keep)
    savePersonas()
  } catch (e) { /* silent */ }
}

/** 清理旧历史（保留最近200条） */
export function cleanOldHistory() {
  let total = 0
  personas.forEach(p => {
    if (p.chatHistory) {
      const old = p.chatHistory.length
      p.chatHistory = p.chatHistory.slice(-200)
      total += old - p.chatHistory.length
    }
  })
  savePersonas()
  return total
}

/** 导出当前角色对话为 TXT */
export function exportChatTXT() {
  const h = activeHistory()
  if (!h.length) return ''
  const p = activePersona()
  let txt = '沈度 · ' + p.name + ' · 对话记录\n导出时间：' + new Date().toLocaleString() + '\n' + '─'.repeat(40) + '\n\n'
  h.forEach(m => {
    if (m.type === 'system') return
    const name = m.role === 'user' ? (config.userName || '我') : p.name
    txt += '[' + new Date(m.ts).toLocaleString('zh-CN') + '] ' + name + '：\n' + m.content + '\n\n'
  })
  return txt
}
