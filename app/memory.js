/* ============================================
   app/memory.js — 记忆系统
   记忆 CRUD / AI自动提取 / 关键词匹配 / 上下文注入 / 云端同步
   ============================================ */

import { config, memories, runtime } from './state.js'
import { MEMORY_EXTRACT_PROMPT, CN_STOP_WORDS, SB_URL, SB_HEADERS } from './consts.js'
import { saveMemories, saveConfig } from './storage.js'
import { getProvider, getActiveApiKey } from './provider.js'
import { emit, Events } from './events.js'

// ===== Keyword Extraction =====
export function extractKeywords(text) {
  const cleaned = text.replace(/[^一-鿿㐀-䶿a-zA-Z0-9]/g, ' ').trim()
  const segments = cleaned.split(/\s+/).filter(s => s.length > 0)
  const keywords = []
  for (const seg of segments) {
    if (/^[a-zA-Z]+$/.test(seg) && seg.length >= 2) { keywords.push(seg.toLowerCase()); continue }
    if (/[一-鿿]/.test(seg)) {
      if (!CN_STOP_WORDS.has(seg) && seg.length >= 1) keywords.push(seg)
      if (seg.length >= 4) {
        for (let i = 0; i <= seg.length - 2; i++) {
          const bi = seg.slice(i, i + 2)
          if (!CN_STOP_WORDS.has(bi) && !CN_STOP_WORDS.has(bi[0]) && !CN_STOP_WORDS.has(bi[1])) keywords.push(bi)
        }
      }
    }
  }
  return [...new Set(keywords)]
}

// ===== Memory Scoring & Retrieval =====
export function scoreMemory(memory, keywords, now) {
  if (!memory) return 0
  const content = (memory.content || '').toLowerCase()
  const tags = (memory.tags || []).join(' ').toLowerCase()
  const cat = (memory.category || '').toLowerCase()
  let score = 0
  for (const kw of keywords) {
    const kl = kw.toLowerCase()
    if (content.includes(kl)) score += 2
    else if (tags.includes(kl)) score += 2
    else if (cat.includes(kl)) score += 1
  }
  if (memory.lastUsed && (now - memory.lastUsed) < 72 * 3600 * 1000) score += 1
  return score
}

export function getRelevantMemories(userMessage) {
  const myMemories = memories.filter(m => (m.characterId || 'shendu') === config.activePersonaId)
  if (!myMemories.length) return []
  const now = Date.now()
  const keywords = extractKeywords(userMessage)
  if (!keywords.length) return []
  return myMemories
    .map(m => ({ mem: m, score: scoreMemory(m, keywords, now) }))
    .filter(s => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.mem)
}

export function markMemoriesUsed(matched) {
  if (!matched || !matched.length) return
  const now = Date.now()
  let changed = false
  for (const m of matched) {
    const mem = memories.find(x => x.id === m.id)
    if (mem) { mem.usageCount = (mem.usageCount || 0) + 1; mem.lastUsed = now; changed = true }
  }
  if (changed) saveMemories()
}

// ===== Memory CRUD =====
export function addMemory(content, category, tags, source = 'manual') {
  const mem = {
    id: Date.now(), content, category: category || '默认',
    tags: tags || extractKeywords(content).slice(0, 5),
    usageCount: 0, lastUsed: null, source,
    createdAt: Date.now(), characterId: config.activePersonaId
  }
  memories.unshift(mem)
  saveMemories()
  emit(Events.MEMORY_ADDED, mem)
}

export function deleteMemory(id) {
  const idx = memories.findIndex(m => m.id === id)
  if (idx >= 0) { memories.splice(idx, 1); saveMemories() }
}

export function editMemoryContent(id, newContent) {
  const m = memories.find(m => m.id === id)
  if (m) { m.content = newContent; m.tags = extractKeywords(newContent).slice(0, 5); saveMemories() }
}

// ===== Auto Memory Extraction =====
export async function extractMemoriesFromChat(chatHistory) {
  if (runtime.isExtracting || !getActiveApiKey()) return
  runtime.isExtracting = true
  try {
    const recent = chatHistory.filter(m => m.role === 'user' || m.role === 'assistant').slice(-20)
    if (recent.filter(m => m.role === 'user').length < 3) return
    const convo = recent.map(m => (m.role === 'user' ? '用户：' : 'AI：') + m.content).join('\n')
    const provider = getProvider()
    const api = provider.getConfig()
    const model = config.apiProvider === 'deepseek' ? 'deepseek-chat' : api.model
    const res = await fetch(api.baseUrl, {
      method: 'POST', headers: api.headers,
      body: JSON.stringify({ model, messages: [{ role: 'system', content: MEMORY_EXTRACT_PROMPT }, { role: 'user', content: convo }], temperature: 0.3, max_tokens: 800, stream: false })
    })
    if (!res.ok) return
    const j = await res.json()
    const text = j.choices?.[0]?.message?.content || ''
    if (text.includes('[无]') || text.trim() === '[无]') return
    const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.includes('｜') && !l.startsWith('['))
    let added = 0
    for (const line of lines) {
      const parts = line.split('｜'), cat = (parts[0] || '').trim(), fact = (parts[1] || '').trim()
      const aiTags = (parts[2] || '').split(',').map(t => t.trim()).filter(Boolean)
      if (!fact || fact.length < 2) continue
      const exists = memories.some(m => {
        const overlap = m.content.replace(/[^一-鿿]/g, ''), nOverlap = fact.replace(/[^一-鿿]/g, '')
        if (overlap.length < 2 || nOverlap.length < 2) return false
        const shorter = overlap.length < nOverlap.length ? overlap : nOverlap
        const longer = overlap.length >= nOverlap.length ? overlap : nOverlap
        return longer.includes(shorter) || shorter.includes(longer)
      })
      if (!exists) {
        memories.unshift({ id: Date.now() + added, content: fact, category: cat || '默认', tags: aiTags.length ? aiTags : extractKeywords(fact).slice(0, 3), usageCount: 0, lastUsed: null, source: 'auto', createdAt: Date.now(), characterId: config.activePersonaId })
        added++
      }
    }
    if (added > 0) { saveMemories(); emit(Events.MEMORY_EXTRACTED, { count: added }) }
  } catch (e) { console.error('extractMemories:', e) }
  finally { runtime.isExtracting = false }
}

// ===== Cloud Sync =====
export async function syncMemoriesToCloud() {
  if (runtime.syncing) return
  runtime.syncing = true
  try {
    const myMemories = memories.filter(m => (m.characterId || 'shendu') === config.activePersonaId)
    if (!myMemories.length) return
    const rows = myMemories.map(m => ({
      id: m.id, content: m.content, category: m.category || '默认',
      tags: Array.isArray(m.tags) ? m.tags.join(',') : (m.tags || ''),
      usage_count: m.usageCount || 0, last_used: m.lastUsed ? new Date(m.lastUsed).toISOString() : null,
      source: m.source || 'manual', created_at: new Date(m.createdAt).toISOString(), character_id: m.characterId || 'shendu'
    }))
    const ids = rows.map(r => r.id).join(',')
    if (ids) { try { await fetch(SB_URL + '/memories?id=in.(' + ids + ')', { method: 'DELETE', headers: SB_HEADERS }) } catch (e) { } }
    const res = await fetch(SB_URL + '/memories', { method: 'POST', headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' }, body: JSON.stringify(rows) })
    if (!res.ok) throw new Error(await res.text())
    config.lastSyncTime = Date.now(); saveConfig()
  } catch (e) { console.error('syncMemoriesToCloud:', e) }
  finally { runtime.syncing = false }
}

export async function syncMemoriesFromCloud() {
  runtime.syncing = true
  try {
    const res = await fetch(SB_URL + '/memories?select=*&character_id=eq.' + encodeURIComponent(config.activePersonaId), { headers: SB_HEADERS })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    if (!data || !data.length) return
    let merged = 0
    for (const row of data) {
      if (!memories.find(m => m.id === row.id)) {
        memories.push({ id: row.id, content: row.content, category: row.category || '默认', tags: row.tags ? row.tags.split(',').filter(Boolean) : [], usageCount: row.usage_count || 0, lastUsed: row.last_used ? new Date(row.last_used).getTime() : null, source: row.source || 'manual', createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(), characterId: row.character_id || 'shendu' })
        merged++
      }
    }
    if (merged > 0) { saveMemories(); config.lastSyncTime = Date.now(); saveConfig() }
  } catch (e) { console.error('syncMemoriesFromCloud:', e) }
  finally { runtime.syncing = false }
}

export async function fullSync() {
  await syncMemoriesToCloud()
  await syncMemoriesFromCloud()
}
