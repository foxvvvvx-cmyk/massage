/* ============================================
   app/chat.js — 聊天核心
   send() / 流式渲染 / 消息分段 / 搜索 / 收藏
   ============================================ */

import { config, personas, favorites, bookmarks, runtime } from './state.js'
import { savePersonas, saveFavorites, saveBookmarks } from './storage.js'
import { getProvider, getActiveApiKey, describeImages } from './provider.js'
import { buildPrompt } from './prompt.js'
import { getRelevantMemories, markMemoriesUsed } from './memory.js'
import { activePersona, activeHistory, autoSummarizeHistory } from './persona.js'
import { parseToyMarkers } from './toy.js'
import { parseReminder, addReminder } from './reminder.js'
import { renderMD, stripThinkingTags, escHtml, fmtTime, fmtDate, dayKey, aiAvatarHTML, userAvatarHTML, $ } from './utils.js'
import { emit, Events } from './events.js'
import { tick, applyInteraction, getSentiment, checkThreshold, canContact, ensureResonance, recordInteraction } from './resonance.js'

// ===== Message Rendering =====

export function buildMsgHTML(msg) {
  let reactionsHTML = ''
  if (msg.reactions && Object.keys(msg.reactions).length > 0) {
    reactionsHTML = '<div class="reactions-wrap">' + Object.entries(msg.reactions).map(([e, c]) => `<span class="reaction-chip${msg.myReaction === e ? ' mine' : ''}" onclick="event.stopPropagation();window.toggleMsgReaction(${msg.ts},'${e}')"><span class="rc-emoji">${e}</span><span class="rc-count">${c}</span></span>`).join('') + '</div>'
  }
  const isFav = favorites.some(f => f.ts === msg.ts)
  const favHTML = isFav ? '<span class="fav-star active" onclick="event.stopPropagation();window.toggleFavorite(' + msg.ts + ')">⭐</span>' : ''
  let imgHTML = ''
  if (msg.images && msg.images.length) {
    imgHTML = msg.images.map(img => `<img class="msg-image" src="${escHtml(img.dataUrl)}" onclick="event.stopPropagation();window.showLightbox('${escHtml(img.dataUrl)}')" loading="lazy">`).join('')
  }
  let displayContent = msg.role === 'user' ? msg.content : stripThinkingTags(msg.content)
  const contentHTML = msg.role === 'user' ? escHtml(displayContent) : renderMD(displayContent)
  return `${imgHTML}${contentHTML}<div class="time">${fmtTime(msg.ts)}</div>${favHTML}${reactionsHTML}`
}

export function appendMsgEl(msg) {
  const messagesEl = $('messages'); if (!messagesEl) return
  if (msg.type === 'system') { const e = document.createElement('div'); e.className = 'msg system'; e.textContent = msg.content; messagesEl.appendChild(e); return }
  const day = dayKey(msg.ts)
  if (day !== runtime.lastMsgDay && msg.role !== 'system') {
    const ds = document.createElement('div'); ds.className = 'date-sep'; ds.textContent = day; messagesEl.appendChild(ds); runtime.lastMsgDay = day
  }
  if (msg.reasoning) {
    const w = document.createElement('div'); w.className = 'thinking-wrap'
    const u = 'th_' + msg.ts + '_' + Math.random().toString(36).slice(2, 6)
    w.innerHTML = `<div class="thinking-label" id="${u}_label" onclick="window.toggleThinking('${u}')">Thinking ▸</div><div class="thinking-body" id="${u}">${renderMD(msg.reasoning)}</div>`
    messagesEl.appendChild(w)
  }
  const row = document.createElement('div'); row.className = 'msg-row ' + (msg.role === 'user' ? 'user' : 'ai')
  const avatar = document.createElement('div'); avatar.className = 'msg-avatar'
  avatar.innerHTML = msg.role === 'user' ? userAvatarHTML(config) : aiAvatarHTML(activePersona())
  const bubble = document.createElement('div'); bubble.className = 'msg'; bubble.setAttribute('data-ts', msg.ts)
  bubble.innerHTML = buildMsgHTML(msg)
  row.appendChild(avatar); row.appendChild(bubble)
  let pressTimer
  const clearPress = () => { clearTimeout(pressTimer); pressTimer = null }
  bubble.addEventListener('touchstart', e => { pressTimer = setTimeout(() => { window.showCtxMenu(msg, e); clearPress() }, 500) })
  bubble.addEventListener('touchend', clearPress); bubble.addEventListener('touchmove', clearPress)
  bubble.addEventListener('contextmenu', e => { e.preventDefault(); window.showCtxMenu(msg, e) })
  messagesEl.appendChild(row)
}

export function renderAllMessages() {
  const messagesEl = $('messages'); const hintBox = $('hintBox')
  if (!messagesEl) return
  messagesEl.innerHTML = ''; runtime.lastMsgDay = ''
  const h = activeHistory()
  if (h.length === 0) { if (hintBox) hintBox.style.display = 'flex' }
  else { if (hintBox) hintBox.style.display = 'none'; h.forEach(m => appendMsgEl(m)) }
  messagesEl.scrollTop = messagesEl.scrollHeight
}

export function showTyping() {
  const messagesEl = $('messages'); if (!messagesEl) return
  let wrap = messagesEl.querySelector('.typing-wrap')
  if (!wrap) {
    wrap = document.createElement('div'); wrap.className = 'typing-wrap'
    const avatar = document.createElement('div'); avatar.className = 'msg-avatar'; avatar.innerHTML = aiAvatarHTML(activePersona())
    const typing = document.createElement('div'); typing.className = 'typing'; typing.innerHTML = '<span></span><span></span><span></span>'
    wrap.appendChild(avatar); wrap.appendChild(typing); messagesEl.appendChild(wrap)
  }
  wrap.classList.add('show'); messagesEl.scrollTop = messagesEl.scrollHeight
}

export function hideTyping() { const e = document.querySelector('#messages .typing-wrap'); if (e) e.classList.remove('show') }

export function toggleThinking(id) {
  const e = document.getElementById(id); if (!e) return
  e.classList.toggle('open')
  const label = document.getElementById(id + '_label')
  if (label) label.textContent = e.classList.contains('open') ? 'Thinking ▾' : 'Thinking ▸'
}

// ===== Stream Parsing (extracted from send) =====

function renderStreamChunk(el, raw) {
  const hasThinkStart = /<\s*(thinking|Thinking|THINKING)\s*>/i.test(raw) || /\[\s*内心\s*\]/i.test(raw)
  const hasThinkEnd = /<\s*\/\s*(thinking|Thinking|THINKING)\s*>/i.test(raw) || /\[\s*\/\s*内心\s*\]/i.test(raw)
  if (hasThinkStart && !hasThinkEnd) {
    el.innerHTML = renderMD('<i>💭 Thinking...</i>')
  } else if (hasThinkStart && hasThinkEnd) {
    let after = raw
    after = after.replace(/<\s*(thinking|Thinking|THINKING)\s*>[\s\S]*?<\s*\/\s*(thinking|Thinking|THINKING)\s*>/gi, '')
    after = after.replace(/\[\s*内心\s*\][\s\S]*?\[\s*\/\s*内心\s*\]/gi, '')
    after = after.replace(/<response>|<\/response>/gi, '').trim()
    el.innerHTML = renderMD(after || '&nbsp;')
  } else {
    el.innerHTML = renderMD(raw)
  }
}

async function readStream(res, bm, el, provider) {
  const reader = res.body.getReader(); const decoder = new TextDecoder()
  let buf = ''; let reasoningBuf = ''
  while (true) {
    const { value, done } = await reader.read(); if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6); if (d === '[DONE]') { buf = ''; break }
      try {
        const j = JSON.parse(d)
        const delta = provider.extractDelta(j)
        const content = delta ? provider.extractDeltaContent(delta) : null
        const reasoning = delta ? provider.extractDeltaReasoning(delta) : null
        if (content) { bm.content += content; renderStreamChunk(el, bm.content) }
        if (reasoning) { reasoningBuf += reasoning; bm.reasoning = reasoningBuf }
      } catch (e) { }
    }
  }
  el.classList.remove('streaming')
}

// ===== Post-stream Processing (extracted from send) =====

function parseThinkingTags(bm) {
  let thinkMatch = bm.content.match(/<thinking>([\s\S]*?)<\/thinking>/i)
  if (!thinkMatch) thinkMatch = bm.content.match(/\[内心\]([\s\S]*?)\[\/内心\]/i)
  const respMatch = bm.content.match(/<response>([\s\S]*?)<\/response>/i)
  if (thinkMatch) {
    bm.reasoning = thinkMatch[1].trim()
    if (respMatch) {
      bm.content = respMatch[1].trim()
    } else {
      bm.content = bm.content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').replace(/\[内心\][\s\S]*?\[\/内心\]/gi, '').replace(/<response>|<\/response>/gi, '').trim()
    }
    if (bm.reasoning.length < 10 && bm.content) { bm.content = bm.reasoning + '\n' + bm.content; bm.reasoning = '' }
  }
}

function processReminders(bm, el) {
  const remMatch = /【提醒：.+?】[\s\S]*?【\/提醒】/.exec(bm.content)
  if (remMatch) {
    const rem = parseReminder(bm.content)
    if (rem) {
      addReminder(rem)
      const clean = bm.content.replace(/【提醒：.+?】[\s\S]*?【\/提醒】/, '').trim()
      bm.content = clean || bm.content; savePersonas()
      el.innerHTML = renderMD(bm.content) + '<div class="diary-saved-hint">⏰ 已设提醒</div><div class="time">' + fmtTime(bm.ts) + '</div>'
      return true
    }
  }
  return false
}

function appendThinkingWrap(bm, row) {
  if (bm.reasoning) {
    const uid = 'th_' + bm.ts + '_' + Math.random().toString(36).slice(2, 6)
    const tw = document.createElement('div'); tw.className = 'thinking-wrap'
    tw.innerHTML = `<div class="thinking-label" id="${uid}_label" onclick="window.toggleThinking('${uid}')">Thinking ▸</div><div class="thinking-body" id="${uid}">${renderMD(bm.reasoning)}</div>`
    const messagesEl = $('messages')
    messagesEl && messagesEl.insertBefore(tw, row)
  }
}

function splitMessageSegments(bm, el) {
  let segments = null
  if (bm.content.includes('|||')) {
    segments = bm.content.split('|||').map(s => s.trim()).filter(Boolean)
  } else if (bm.content.length > 80) {
    const parts = bm.content.match(/[^。！？\n]+[。！？\n]?/g)
    if (parts && parts.length >= 3) {
      const n = Math.min(3, Math.ceil(parts.length / 2)); const perGrp = Math.ceil(parts.length / n)
      segments = []; for (let i = 0; i < parts.length; i += perGrp) segments.push(parts.slice(i, i + perGrp).join('').trim())
    }
  }
  if (segments && segments.length > 1) {
    bm.content = segments.shift() || bm.content
    el.innerHTML = renderMD(bm.content) + '<div class="time">' + fmtTime(bm.ts) + '</div>'
    segments.forEach((seg, i) => {
      setTimeout(() => {
        const sm = { role: 'assistant', content: seg, reactions: {}, ts: Date.now() }
        activeHistory().push(sm); appendMsgEl(sm)
        const mel = $('messages'); if (mel) mel.scrollTop = mel.scrollHeight
        if (i === segments.length - 1) savePersonas()
      }, (i + 1) * (800 + Math.random() * 700))
    })
  }
}

function playNotificationSound() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    const o = ac.createOscillator(); const g = ac.createGain()
    o.connect(g); g.connect(ac.destination); o.type = 'sine'
    o.frequency.setValueAtTime(880, ac.currentTime); o.frequency.setValueAtTime(1100, ac.currentTime + .08)
    g.gain.setValueAtTime(.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .2)
    o.start(); o.stop(ac.currentTime + .2)
  } catch (e) { }
}

function attachCtxMenuListeners(el, bm) {
  let pt; const cp = () => { clearTimeout(pt); pt = null }
  el.addEventListener('touchstart', e => { pt = setTimeout(() => { window.showCtxMenu(bm, e); cp() }, 500) })
  el.addEventListener('touchend', cp); el.addEventListener('touchmove', cp)
  el.addEventListener('contextmenu', e => { e.preventDefault(); window.showCtxMenu(bm, e) })
}

// ===== Pre-send Helpers =====

async function prepareUserMessage(t) {
  let imageDesc = ''
  if (runtime.pendingImages.length > 0 && config.visionEnabled && config.visionApiKey) {
    emit(Events.STATUS_MESSAGE, '👁️ 正在识别图片内容…')
    const desc = await describeImages(runtime.pendingImages)
    if (desc) imageDesc = '\n\n[图片内容：' + desc + ']'
  }
  const finalContent = t + (imageDesc || '') || (runtime.pendingImages.length > 0 ? '[图片]' : '')
  const um = { role: 'user', content: finalContent, ts: Date.now(), reactions: {} }
  if (runtime.pendingImages.length > 0) {
    um.images = runtime.pendingImages.map(img => ({ dataUrl: img.dataUrl, mimeType: img.mimeType }))
    runtime.pendingImages = []; emit(Events.IMAGES_CLEARED)
  }
  return um
}

async function buildApiMessages(t) {
  const p = activePersona(); const msgs = []; const matched = getRelevantMemories(t)
  msgs.push({ role: 'system', content: buildPrompt(p, t, matched) })
  if (matched.length) markMemoriesUsed(matched)
  const hist = activeHistory()
  if (hist.length > 50) await autoSummarizeHistory(hist)
  hist.slice(-50).forEach(m => { msgs.push({ role: m.role, content: m.content || '' }) })
  return { msgs, persona: p, matched }
}

function createStreamingPlaceholder(bm) {
  const row = document.createElement('div'); row.className = 'msg-row ai'
  const ava = document.createElement('div'); ava.className = 'msg-avatar'; ava.innerHTML = aiAvatarHTML(activePersona())
  const wrap = document.createElement('div'); wrap.innerHTML = `<div class="msg streaming" data-ts="${bm.ts}"></div>`
  const el = wrap.firstElementChild
  row.appendChild(ava); row.appendChild(el)
  const messagesEl = $('messages')
  if (messagesEl) messagesEl.appendChild(row)
  return { row, el }
}

function postProcessResponse(bm, el, row) {
  parseThinkingTags(bm)
  const reminderHandled = processReminders(bm, el)
  if (!reminderHandled) el.innerHTML = renderMD(bm.content) + '<div class="time">' + fmtTime(bm.ts) + '</div>'
  if (runtime.isLocalMode) { parseToyMarkers(bm.content); if (bm.reasoning) parseToyMarkers(bm.reasoning) }
  appendThinkingWrap(bm, row)
  splitMessageSegments(bm, el)
  attachCtxMenuListeners(el, bm)
}

function postSendCleanup() {
  if (!document.querySelector('#page-chat.active')) { runtime.unreadCount++; emit(Events.UNREAD_CHANGED) }
  if (document.hidden) playNotificationSound()
  emit(Events.BALANCE_NEED_UPDATE)
  runtime.autoExtractCount++
  if (runtime.autoExtractCount >= 8) { runtime.autoExtractCount = 0; emit(Events.AUTO_EXTRACT_MEMORY) }
  if (runtime.autoExtractCount >= 12) { runtime.autoExtractCount = 0; emit(Events.AUTO_EXTRACT_DIARY) }
}

// ===== Core Send =====

export async function send() {
  if (runtime.isGenerating) return
  const inputEl = $('input'); const sendBtn = $('sendBtn'); const hintBox = $('hintBox')
  const t = inputEl?.value?.trim() || ''
  if (!t && runtime.pendingImages.length === 0) return
  if (!getActiveApiKey()) { window.openDrawer && window.openDrawer(); return }

  runtime.isGenerating = true; if (sendBtn) sendBtn.disabled = true
  if (t) { runtime.inputHistory.push(t); if (runtime.inputHistory.length > 20) runtime.inputHistory.shift(); runtime.inputHistIdx = -1 }
  if (hintBox) hintBox.style.display = 'none'

  // Resonance: tick before send
  const persona = activePersona()
  ensureResonance(persona)
  const now = Date.now()
  const minutes = Math.max(0, (now - persona.resonance.state.lastTick) / 60000)
  if (minutes >= 1) {
    persona.resonance.state = tick(persona.resonance.state, persona.resonance.config, minutes)
    emit(Events.RESONANCE_TICK, { personaId: persona.id })
  }
  // Check if AI wants to contact (only UI hint in Phase 1)
  const threshold = checkThreshold(persona.resonance.state, persona.resonance.config)
  if (threshold.triggered) {
    const lastUserTs = activeHistory().filter(m => m.role === 'user').pop()?.ts
    if (canContact(persona.resonance.state, persona.resonance.config, lastUserTs)) {
      emit(Events.RESONANCE_CONTACT_READY, { personaId: persona.id, type: threshold.type })
    }
  }

  // Sentiment detection
  const sentimentResult = getSentiment(t)
  const delayMinutes = (() => {
    const userMsgs = activeHistory().filter(m => m.role === 'user')
    if (userMsgs.length < 2) return 0
    return (Date.now() - userMsgs[userMsgs.length - 2].ts) / 60000
  })()

  const um = await prepareUserMessage(t)
  activeHistory().push(um); savePersonas(); appendMsgEl(um)
  if (inputEl) { inputEl.value = ''; inputEl.style.height = 'auto' }
  const messagesEl = $('messages'); if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight
  showTyping()

  try {
    const { msgs, persona, matched } = await buildApiMessages(t)
    const provider = getProvider()
    const body = provider.buildRequestBody(msgs, { persona, matchedCount: matched.length })
    const api = provider.getConfig()

    const res = await fetch(api.baseUrl, { method: 'POST', headers: api.headers, body: JSON.stringify(body) })
    if (!res.ok) throw new Error((() => { const m = { 401: 'API Key 无效', 402: '余额不足', 429: '太频繁了' }; return m[res.status] || res.status + '' })())

    hideTyping()
    const bm = { role: 'assistant', content: '', reasoning: '', reactions: {}, ts: Date.now() }
    activeHistory().push(bm)

    const { row, el } = createStreamingPlaceholder(bm)
    await readStream(res, bm, el, provider)
    postProcessResponse(bm, el, row)

    savePersonas()
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight

    // Resonance: apply interaction after successful reply
    persona.resonance.state = applyInteraction(persona.resonance.state, persona.resonance.config, {
      replied: true,
      delayMinutes: delayMinutes,
      sentiment: sentimentResult.sentiment,
      hasThirdParty: sentimentResult.hasThirdParty
    })
    recordInteraction(persona, { type: 'user_message', sentiment: sentimentResult.sentiment })
    emit(Events.RESONANCE_INTERACTION, { personaId: persona.id, sentiment: sentimentResult.sentiment })

    emit(Events.MESSAGE_RECEIVED, bm)
  } catch (e) {
    hideTyping()
    appendMsgEl({ role: 'assistant', content: '⚠️ ' + e.message, ts: Date.now(), type: 'system' })
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight
  }

  runtime.isGenerating = false
  if (sendBtn) sendBtn.disabled = true
  if (inputEl) inputEl.focus()
  postSendCleanup()
}

// ===== Search =====
export function searchMessages(query) {
  if (!query) { runtime.searchResults = []; runtime.searchIdx = -1; return [] }
  const h = activeHistory()
  runtime.searchResults = h.map((m, i) => ({ m, i, text: (m.content || '').toLowerCase() })).filter(r => r.text.includes(query.toLowerCase()))
  runtime.searchIdx = -1
  return runtime.searchResults
}

// ===== Favorites =====
export function toggleFavorite(ts) {
  const idx = favorites.findIndex(f => f.ts === ts)
  if (idx >= 0) { favorites.splice(idx, 1); saveFavorites() }
  else {
    const h = activeHistory(); const m = h.find(m => m.ts === ts); if (!m) return
    favorites.unshift({ ts: m.ts, content: m.content, role: m.role, personaId: config.activePersonaId, savedAt: Date.now() })
    saveFavorites()
  }
  emit(Events.FAVORITE_TOGGLED, { ts })
}

// ===== Bookmarks =====
export function addBookmark(ts, name) {
  const h = activeHistory(); const m = h.find(m => m.ts === ts); if (!m) return
  bookmarks.unshift({ ts: m.ts, name: name || '未命名', content: m.content.slice(0, 80), role: m.role, savedAt: Date.now(), personaId: config.activePersonaId })
  saveBookmarks()
}

export function deleteBookmark(idx) { bookmarks.splice(idx, 1); saveBookmarks() }

// ===== Status Bar =====
export function estimateContextTokens() {
  const p = activePersona(); let chars = 0
  if (p.systemPrompt) chars += p.systemPrompt.length
  activeHistory().slice(-24).forEach(m => { chars += (m.content || '').length; if (m.reasoning) chars += m.reasoning.length })
  return Math.ceil(chars / 2)
}

export function updateStatusBar() {
  const bv = $('sbBalanceVal'); if (bv) bv.textContent = runtime.balanceCache || '--'
  const cv = $('sbContextVal')
  if (cv) {
    const tokens = estimateContextTokens(); const max = 65536
    const pct = Math.min(100, Math.round(tokens / max * 100))
    cv.textContent = '~' + pct + '% (~' + (tokens >= 1000 ? (tokens / 1000).toFixed(1) + 'K' : tokens) + ' tokens)'
  }
}

// ===== Image Lightbox =====
export function showLightbox(src) {
  const lb = $('lightbox'); const li = $('lightboxImg')
  if (lb && li) { li.src = src; lb.style.display = 'flex' }
}
