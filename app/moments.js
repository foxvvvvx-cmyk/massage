/* ============================================
   app/moments.js — 朋友圈
   ============================================ */

import { config, moments, personas, runtime } from './state.js'
import { saveMoments } from './storage.js'
import { getProvider, getActiveApiKey } from './provider.js'
import { emit, Events } from './events.js'

export function addMoment(text) {
  const m = { id: 'm_' + Date.now(), authorId: 'user', content: text.trim(), ts: Date.now(), likes: [], comments: [] }
  moments.unshift(m); saveMoments()
  emit(Events.MOMENT_ADDED, m)
  return m
}

export async function autoInteractMoment(moment) {
  if (!getActiveApiKey()) return
  const p = (await import('./persona.js')).activePersona()
  const provider = getProvider(); const api = provider.getConfig()

  // Active persona comments
  try {
    const res = await fetch(api.baseUrl, {
      method: 'POST', headers: api.headers,
      body: JSON.stringify({ model: config.apiProvider === 'deepseek' ? 'deepseek-chat' : api.model, messages: [{ role: 'system', content: `你是${p.name}。${config.userName || '对方'}发了一条朋友圈："${moment.content}"。请写一条简短评论（15字以内），表达你的感受或互动。` }], temperature: 0.9, max_tokens: 60, stream: false })
    })
    if (res.ok) {
      const j = await res.json(); const reply = j.choices?.[0]?.message?.content
      if (reply && reply.trim()) { moment.comments.push({ personaId: config.activePersonaId, content: reply.trim(), ts: Date.now() }); moment.likes.push(config.activePersonaId); saveMoments() }
    }
  } catch (e) { }

  // Other personas also interact
  const others = personas.filter(pp => pp.id !== config.activePersonaId)
  for (const op of others.slice(0, 1)) {
    try {
      const res2 = await fetch(api.baseUrl, {
        method: 'POST', headers: api.headers,
        body: JSON.stringify({ model: config.apiProvider === 'deepseek' ? 'deepseek-chat' : api.model, messages: [{ role: 'system', content: `你是${op.name}。${config.userName || '对方'}发了一条朋友圈："${moment.content}"。请写一条简短评论（15字以内），可以调侃或表达看法。` }], temperature: 0.9, max_tokens: 60, stream: false })
      })
      if (res2.ok) {
        const j2 = await res2.json(); const r2 = j2.choices?.[0]?.message?.content
        if (r2 && r2.trim()) { moment.comments.push({ personaId: op.id, content: r2.trim(), ts: Date.now() }); moment.likes.push(op.id) }
      }
    } catch (e) { }
  }
  saveMoments()
}

export function likeMoment(id) {
  const m = moments.find(x => x.id === id); if (!m) return
  if (m.likes.includes(config.activePersonaId)) m.likes = m.likes.filter(x => x !== config.activePersonaId)
  else m.likes.push(config.activePersonaId)
  saveMoments()
}

export async function commentMoment(id, text) {
  const m = moments.find(x => x.id === id); if (!m) return
  m.comments.push({ personaId: config.activePersonaId, content: text.trim(), ts: Date.now() })
  saveMoments()
  // AI auto-reply
  if (getActiveApiKey() && m.authorId !== 'user') {
    try {
      const p = personas.find(x => x.id === m.authorId); if (!p) return
      const api = getProvider().getConfig()
      const res = await fetch(api.baseUrl, {
        method: 'POST', headers: api.headers,
        body: JSON.stringify({ model: config.apiProvider === 'deepseek' ? 'deepseek-chat' : api.model, messages: [{ role: 'system', content: `你是${p.name}。有人评论了你的朋友圈："${m.content}"。评论是："${text}"。请用一句话简短回复这个评论（10字以内）。` }], temperature: 0.9, max_tokens: 80, stream: false })
      })
      if (res.ok) {
        const j = await res.json(); const reply = j.choices?.[0]?.message?.content
        if (reply) { m.comments.push({ personaId: m.authorId, content: reply.trim(), ts: Date.now() }); saveMoments() }
      }
    } catch (e) { }
  }
}
