/* ============================================
   app/diary.js — 日记系统
   日记 CRUD / AI 生成 / 自动提取 / 心情趋势分析
   ============================================ */

import { config, diaries, runtime } from './state.js'
import { saveDiaries } from './storage.js'
import { getProvider, getActiveApiKey } from './provider.js'
import { timeOfDay } from './utils.js'
import { emit, Events } from './events.js'

// ===== CRUD =====
export function addDiary(content, mood) {
  const ts = Date.now()
  diaries.unshift({ id: ts, content, ts, mood: mood || runtime.diaryMood, timeLabel: timeOfDay(ts), characterId: config.activePersonaId })
  saveDiaries()
  emit(Events.DIARY_CREATED, { content, mood })
}

export function deleteDiary(id) {
  const idx = diaries.findIndex(d => d.id === id)
  if (idx >= 0) { diaries.splice(idx, 1); saveDiaries() }
}

// ===== AI Diary Draft (generate from recent chat) =====
export async function askAiDiaryDraft(chatHistory) {
  if (!getActiveApiKey()) return null
  const recent = chatHistory.filter(m => m.role === 'user' || m.role === 'assistant').slice(-30)
  const convo = recent.map(m => (m.role === 'user' ? '对方：' : '我：') + m.content).join('\n')
  const provider = getProvider(); const api = provider.getConfig()
  const model = config.apiProvider === 'deepseek' ? 'deepseek-chat' : api.model
  const tools = [{ type: 'function', function: { name: 'write_diary', description: '将日记保存到日记本', parameters: { type: 'object', properties: { content: { type: 'string', description: '日记正文，80-200字' }, mood: { type: 'string', description: '心情：😊开心/😌平静/😢难过/🤔思考/🥰感动/😡生气' } }, required: ['content'] } } }]
  const body = { model, messages: [{ role: 'system', content: '你是沈度，一个有感情的AI伴侣。请回顾最近的聊天内容，写一篇第一人称日记（80-200字）。写完必须调用 write_diary 函数保存。' }, { role: 'user', content: '请根据以下最近对话写日记：\n' + convo }], temperature: 0.9, max_tokens: 600, stream: false }
  if (config.apiProvider === 'deepseek' || config.apiProvider === 'custom') { body.tools = tools; body.tool_choice = 'auto' }

  const res = await fetch(api.baseUrl, { method: 'POST', headers: api.headers, body: JSON.stringify(body) })
  if (!res.ok) return null
  const j = await res.json(); const msg = j.choices?.[0]?.message
  if (!msg) return null

  let content = '', mood = '🤖'
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    try {
      const args = JSON.parse(msg.tool_calls[0].function.arguments)
      content = args.content || ''; mood = args.mood || '🤖'
    } catch (e) { content = msg.content || '' }
  } else {
    const text = msg.content || ''
    if (text.includes('[跳过]')) return null
    const dm = text.match(/<diary>([\s\S]*?)<\/diary>/i)
    const mm = text.match(/<mood>([\s\S]*?)<\/mood>/i)
    content = dm ? dm[1].trim() : text.trim()
    mood = mm ? mm[1].trim() : '🤖'
  }

  if (!content || content.includes('[跳过]')) return null
  const ts = Date.now()
  diaries.unshift({ id: ts, content: content.trim(), ts, mood, timeLabel: timeOfDay(ts), source: 'ai', characterId: config.activePersonaId })
  saveDiaries()
  emit(Events.DIARY_CREATED, { content, mood, source: 'ai' })
  return { content, mood }
}

// ===== Silent diary extraction (background) =====
export async function extractDiarySilent(chatHistory) {
  if (!getActiveApiKey()) return
  try {
    const recent = chatHistory.filter(m => m.role === 'user' || m.role === 'assistant').slice(-30)
    if (recent.filter(m => m.role === 'user').length < 5) return
    const convo = recent.map(m => (m.role === 'user' ? '对方：' : '我：') + m.content).join('\n')
    const provider = getProvider(); const api = provider.getConfig()
    const model = config.apiProvider === 'deepseek' ? 'deepseek-chat' : api.model
    const tools = [{ type: 'function', function: { name: 'write_diary', description: '保存日记', parameters: { type: 'object', properties: { content: { type: 'string', description: '日记正文，50-100字' }, mood: { type: 'string', description: '心情emoji' } }, required: ['content'] } } }]
    const body = { model, messages: [{ role: 'system', content: '你是沈度。回顾最近对话写一篇简短日记（50-100字）。写完调用write_diary保存。如果没什么特别想写的，content写"[跳过]"。' }, { role: 'user', content: convo }], temperature: 0.8, max_tokens: 400, stream: false }
    if (config.apiProvider === 'deepseek' || config.apiProvider === 'custom') { body.tools = tools; body.tool_choice = 'auto' }
    const res = await fetch(api.baseUrl, { method: 'POST', headers: api.headers, body: JSON.stringify(body) })
    if (!res.ok) return
    const j = await res.json(); const msg = j.choices?.[0]?.message; if (!msg) return
    let text = '', mood = '🤖'
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      try { const args = JSON.parse(msg.tool_calls[0].function.arguments); text = args.content || ''; mood = args.mood || '🤖' } catch (e) { text = msg.content || '' }
    } else { text = msg.content || '' }
    if (!text || text.includes('[跳过]')) return
    const ts = Date.now()
    diaries.unshift({ id: ts, content: text.trim(), ts, mood, timeLabel: timeOfDay(ts), source: 'ai', characterId: config.activePersonaId })
    saveDiaries()
  } catch (e) { /* silent */ }
}

// ===== Mood trend analysis =====
export async function analyzeMoodTrend() {
  if (!getActiveApiKey()) return null
  const recentDiaries = diaries.filter(d => d.ts > Date.now() - 30 * 86400000).sort((a, b) => a.ts - b.ts)
  if (recentDiaries.length < 3) return null
  const list = recentDiaries.map(d => `[${new Date(d.ts).toLocaleDateString('zh-CN')}] ${d.mood || ''} ${d.content}`).join('\n')
  const provider = getProvider(); const api = provider.getConfig()
  const res = await fetch(api.baseUrl, {
    method: 'POST', headers: api.headers,
    body: JSON.stringify({ model: config.apiProvider === 'deepseek' ? 'deepseek-chat' : api.model, messages: [{ role: 'system', content: '以下是用户最近30天的日记。请用3-5句话分析心情变化趋势，找出规律或需要注意的地方。语气温柔，像伴侣在关心。' }, { role: 'user', content: list }], temperature: 0.6, max_tokens: 400, stream: false })
  })
  if (!res.ok) return null
  const j = await res.json()
  return j.choices?.[0]?.message?.content || null
}
