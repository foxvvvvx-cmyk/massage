/* ============================================
   app/index.js — 入口 & 初始化
   沈度 v13 — 樱语 · 液态玻璃 (架构完善版)
   ============================================ */

// === Foundation ===
import { config, personas, memories, diaries, anniversaries, favorites, bookmarks, rooms, moments, runtime } from './state.js'
import { loadAll, saveConfig, savePersonas, saveMemories } from './storage.js'
import { on, Events } from './events.js'
import { escHtml, fmtDate, dayKey, getGreeting, avatarHTML, userAvatarHTML, aiAvatarHTML, isDesktop, resizeImage, renderMD } from './utils.js'

// === Domain ===
import { getActiveApiKey } from './provider.js'
import { activePersona, activeHistory, switchPersona as swPersona, exportPersonaMD, exportChatTXT } from './persona.js'
import { extractMemoriesFromChat, syncMemoriesToCloud, syncMemoriesFromCloud, fullSync, addMemory, deleteMemory } from './memory.js'
import { extractDiarySilent, askAiDiaryDraft, analyzeMoodTrend, addDiary, deleteDiary } from './diary.js'
import { restoreReminders, cancelReminder, addAnniversaryManual, deleteAnniversary } from './reminder.js'
import { addMoment, autoInteractMoment, likeMoment, commentMoment } from './moments.js'
import { createRoom, deleteRoom, sendGroupMsg } from './rooms.js'
import { initToy, sendToyCommand } from './toy.js'
import { tickActiveResonances, checkThreshold, canContact } from './resonance.js'
import { initResonanceObserver } from './resonance-observer.js'

// === UI ===
import {
  toast, showConfirm, closeConfirm, confirmAction,
  showLockScreen, unlock, setTheme, applyTheme, applyFontSize, applyChatBg,
  updateChatHeader, renderDrawerPanel, openDrawer, closeDrawer,
  updateMoodBar, updateMilestoneUI,
  switchTab, updateTabBadge, showCtxMenu, hideCtxMenu,
  refreshBalance, saveSettingsFromForm,
  exportAllData, importAllData, clearAllData,
  checkAutoNight, installPWA,
  renderImagePreview, togglePlusPanel, toggleSearch, toggleDeepThink,
  renderMe, renderMemories, renderDiary, renderMoments, renderGroupChat
} from './ui.js'

// === Chat ===
import { renderAllMessages, toggleThinking, send, toggleFavorite, showLightbox, updateStatusBar, searchMessages, addBookmark } from './chat.js'

// ============================================================
// Window Bridge (only functions called from HTML onclick handlers)
// ============================================================

// UI
window.toast = toast
window.showConfirm = showConfirm; window.closeConfirm = closeConfirm
window.setTheme = setTheme; window.applyChatBg = applyChatBg
window.updateChatHeader = updateChatHeader; window.renderDrawerPanel = renderDrawerPanel
window.openDrawer = openDrawer; window.closeDrawer = closeDrawer
window.switchTab = switchTab; window.updateTabBadge = updateTabBadge
window.showCtxMenu = showCtxMenu; window.hideCtxMenu = hideCtxMenu
window.refreshBalance = refreshBalance; window.saveSettingsFromForm = saveSettingsFromForm
window.togglePlusPanel = togglePlusPanel; window.toggleSearch = toggleSearch; window.toggleDeepThink = toggleDeepThink
window.installPWA = installPWA; window.renderImagePreview = renderImagePreview

// Chat (extended)
window.send = send; window.renderAllMessages = renderAllMessages
window.toggleThinking = toggleThinking; window.toggleFavorite = toggleFavorite; window.showLightbox = showLightbox
window.updateStatusBar = updateStatusBar; window.searchMessages = searchMessages
window.ctxCopy = ctxCopy; window.ctxEdit = ctxEdit; window.ctxFav = ctxFav
window.ctxReact = ctxReact; window.ctxDelete = ctxDelete; window.ctxBookmark = ctxBookmark
window.addReaction = addReaction; window.showEdit = showEdit
window.closeEdit = closeEdit; window.confirmEdit = confirmEdit
window.fetchBalance = refreshBalance  // HTML uses fetchBalance, maps to refreshBalance

// Page rendering
window.renderMe = renderMe; window.renderMemories = renderMemories
window.renderDiary = renderDiary; window.renderMoments = renderMoments; window.renderGroupChat = renderGroupChat

// Persona
window.switchPersona = swPersona
window.newPersona = () => { window._legacyNewPersona && window._legacyNewPersona() }

// Memory
window.addMemory = addMemory; window.deleteMemory = deleteMemory
window.extractMemoriesFromChat = () => extractMemoriesFromChat(activeHistory())
window.syncMemoriesToCloud = syncMemoriesToCloud; window.syncMemoriesFromCloud = syncMemoriesFromCloud; window.fullSync = fullSync

// Diary
window.addDiary = addDiary; window.deleteDiary = deleteDiary
window.askAiDiaryDraft = () => askAiDiaryDraft(activeHistory())
window.analyzeMoodTrend = analyzeMoodTrend
window.showDiaryAdd = () => { switchTab('diary'); setTimeout(() => { const t = document.querySelector('#diaryTextarea'); if (t) t.focus() }, 400) }
window.showMemoryAdd = () => { switchTab('memory'); setTimeout(() => { const i = document.querySelector('#memInput'); if (i) i.focus() }, 400) }

// Rooms
window.addGroupRoomMembers = () => {
  const avails = personas.filter(p => p.id !== config.activePersonaId)
  if (!avails.length) { toast('需要至少1个其他角色'); return }
  const selected = prompt('选择要加入的角色（输入角色名用逗号分隔）：\n可选：' + avails.map(p => p.name).join('、'), avails.map(p => p.name).slice(0, 2).join(','))
  if (!selected || !selected.trim()) return
  const selNames = selected.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
  const members = [config.activePersonaId]
  selNames.forEach(n => { const p = personas.find(x => x.name === n || x.id === n); if (p && !members.includes(p.id)) members.push(p.id) })
  if (members.length < 2) { toast('至少选1个角色'); return }
  const name = members.map(id => personas.find(x => x.id === id)?.name || id).join('+')
  createRoom(name, members); switchTab('group'); renderGroupChat(); toast('群聊已创建：' + name)
}
window.openGroupRoom = (id) => { runtime.activeRoomId = id; switchTab('group'); renderGroupChat() }
window.deleteGroupRoom = (id) => { deleteRoom(id); if (!runtime.activeRoomId) switchTab('chat'); else renderGroupChat(); renderDrawerPanel() }
window.sendGroupMsg = () => {
  const input = document.getElementById('groupInput'); const t = input?.value?.trim(); if (!t) return
  sendGroupMsg(t).then(() => { if (input) input.value = ''; renderGroupChat() })
}

// Reminders
window.cancelReminder = cancelReminder; window.addAnniversaryManual = addAnniversaryManual; window.deleteAnniversary = deleteAnniversary

// Moments
window.addMoment = () => {
  const text = prompt('发一条朋友圈：', ''); if (!text || !text.trim()) return
  const m = addMoment(text); renderMoments(); toast('已发布')
  setTimeout(() => autoInteractMoment(m).then(() => renderMoments()), 3000)
}
window.likeMoment = (id) => { likeMoment(id); renderMoments() }
window.commentMoment = (id) => {
  const text = prompt('评论：', ''); if (!text || !text.trim()) return
  commentMoment(id, text).then(() => renderMoments())
}

// Toy
window.sendToyCommand = sendToyCommand

// Image
window.attachImage = (inp) => {
  const files = Array.from(inp.files || []); if (!files.length) return
  files.forEach(f => {
    if (!f.type.startsWith('image/')) return
    resizeImage(f, 512, 0.8, (dataUrl) => { runtime.pendingImages.push({ dataUrl, mimeType: 'image/jpeg' }); renderImagePreview() })
  }); inp.value = ''
}
window.removeImage = (idx) => { runtime.pendingImages.splice(idx, 1); renderImagePreview() }

// Drawer key change
window.onDrawerKeyChange = (v) => {
  if (config.apiProvider === 'openrouter') config.openrouterKey = v
  else if (config.apiProvider === 'custom') config.customApiKey = v
  else if (config.apiProvider === 'claude') config.claudeKey = v
  else config.apiKey = v
  saveConfig(); updateChatHeader(); refreshBalance()
}

// Settings
window.exportAll = exportAllData; window.importAll = importAllData
window.clearAllDataImpl = clearAllData
window.cleanOldHistoryImpl = () => {
  let total = 0; personas.forEach(p => { if (p.chatHistory) { const old = p.chatHistory.length; p.chatHistory = p.chatHistory.slice(-200); total += old - p.chatHistory.length } })
  showConfirm('清理旧对话', '将每个角色保留最近200条对话，共清理 ' + total + ' 条旧消息。记忆和日记不会受影响。确定？', () => { savePersonas(); renderAllMessages(); renderMe(); toast('已清理 ' + total + ' 条旧对话') })
}

window.exportPersonaMD = () => {
  const md = exportPersonaMD(); if (!md) return
  const b = new Blob([md], { type: 'text/markdown;charset=utf-8' }); const u = URL.createObjectURL(b)
  const a = document.createElement('a'); a.href = u; a.download = 'CLAUDE_' + activePersona().name + '_人设.md'; a.click(); URL.revokeObjectURL(u); toast('已导出')
}
window.exportChatTXT = () => {
  const txt = exportChatTXT(); if (!txt) { toast('没有对话记录'); return }
  const b = new Blob([txt], { type: 'text/plain;charset=utf-8' }); const u = URL.createObjectURL(b)
  const a = document.createElement('a'); a.href = u; a.download = '沈度对话_' + activePersona().name + '_' + dayKey(Date.now()) + '.txt'; a.click(); URL.revokeObjectURL(u); toast('已导出对话记录')
}
window.goToFavorite = (ts) => { switchTab('chat'); setTimeout(() => { const el = document.querySelector('.msg[data-ts="' + ts + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }
window.toggleMsgReaction = (ts, emoji) => {
  const h = activeHistory(); const m = h.find(m => m.ts === ts); if (!m) return
  if (!m.reactions) m.reactions = {}
  if (m.myReaction === emoji) { m.reactions[emoji] = Math.max(0, (m.reactions[emoji] || 1) - 1); if (m.reactions[emoji] <= 0) delete m.reactions[emoji]; m.myReaction = null }
  else { m.reactions[emoji] = (m.reactions[emoji] || 0) + 1; m.myReaction = emoji }
  savePersonas(); renderAllMessages()
}

// Avatar uploads
window.uploadUserAvatar = (inp) => {
  const f = inp.files[0]; if (!f || !f.type.startsWith('image/')) return
  resizeImage(f, 200, 0.75, (dataUrl) => { config.userAvatar = dataUrl; const p = document.getElementById('userAvatarPrev'); if (p) p.innerHTML = `<img src="${dataUrl}">` }); inp.value = ''
}
window.uploadChatBg = (inp) => {
  const f = inp.files[0]; if (!f || !f.type.startsWith('image/')) return
  resizeImage(f, 400, 0.55, (dataUrl) => { config.chatBg = dataUrl; applyChatBg(); saveConfig(); const p = document.getElementById('chatBgPrev'); if (p) p.style.backgroundImage = 'url(' + dataUrl + ')' }); inp.value = ''
}
window.uploadPersonaAvatar = (inp) => {
  const f = inp.files[0]; if (!f || !f.type.startsWith('image/')) return
  resizeImage(f, 200, 0.75, (dataUrl) => { const prev = document.getElementById('pfAvatarPrev'); if (prev) prev.innerHTML = `<img src="${dataUrl}">`; const hidden = document.getElementById('pfAvatarData'); if (hidden) hidden.value = dataUrl }); inp.value = ''
}
window.pickEmoji = (e) => { const b = document.getElementById('emojiBtn'); if (b) b.textContent = e; const g = document.getElementById('emojiGrid'); if (g) g.style.display = 'none'; const h = document.getElementById('pfAvatarData'); if (h) h.value = '' }
window.toggleApiProviderFields = () => {
  const v = document.getElementById('setApiProvider')?.value || 'deepseek'
  const ds = document.getElementById('apiFieldsDS'); const or = document.getElementById('apiFieldsOR')
  const cl = document.getElementById('apiFieldsClaude'); const cu = document.getElementById('apiFieldsCustom')
  if (ds) ds.style.display = v === 'deepseek' ? 'block' : 'none'
  if (or) or.style.display = v === 'openrouter' ? 'block' : 'none'
  if (cl) cl.style.display = v === 'claude' ? 'block' : 'none'
  if (cu) cu.style.display = v === 'custom' ? 'block' : 'none'
}

// Context menu & edit bridges (operate on runtime state)
function ctxCopy() {
  if (!runtime.ctxTarget) return
  const text = runtime.ctxTarget.content; if (!text) { hideCtxMenu(); return }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('已复制')).catch(() => {
      try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('已复制') } catch (e) { toast('复制失败') }
    })
  } else {
    try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('已复制') } catch (e) { toast('复制失败') }
  }
  hideCtxMenu()
}
function ctxEdit() { if (runtime.ctxTarget && runtime.ctxTarget.role === 'user') { hideCtxMenu(); showEdit(runtime.ctxTarget) } }
function ctxFav() { if (runtime.ctxTarget) { hideCtxMenu(); toggleFavorite(runtime.ctxTarget.ts) } }
function ctxBookmark() { if (runtime.ctxTarget) { hideCtxMenu(); addBookmark(runtime.ctxTarget.ts) } }
function ctxReact() {
  hideCtxMenu()
  setTimeout(() => {
    const cm = document.getElementById('ctxMenu'); const rp = document.getElementById('reactionPicker')
    if (cm && rp) { const r = cm.getBoundingClientRect(); rp.style.left = r.left + 'px'; rp.style.top = Math.max(r.top - 50, 20) + 'px'; rp.classList.add('show') }
  }, 100)
}
function ctxDelete() {
  if (runtime.ctxTarget && runtime.ctxTarget.role === 'user') {
    hideCtxMenu(); const h = activeHistory(); const i = h.findIndex(m => m.ts === runtime.ctxTarget.ts)
    if (i >= 0) { h.splice(i, 1); savePersonas(); renderAllMessages(); toast('已删除') }
  }
}
function addReaction(emoji) {
  if (!runtime.reactTarget) return; hideCtxMenu()
  const rp = document.getElementById('reactionPicker'); if (rp) rp.classList.remove('show')
  const m = runtime.reactTarget
  if (!m.reactions) m.reactions = {}
  if (m.myReaction === emoji) { delete m.reactions[emoji]; m.myReaction = null }
  else { if (m.myReaction) { m.reactions[m.myReaction] = Math.max(0, (m.reactions[m.myReaction] || 1) - 1); if (m.reactions[m.myReaction] <= 0) delete m.reactions[m.myReaction] } m.reactions[emoji] = (m.reactions[emoji] || 0) + 1; m.myReaction = emoji }
  savePersonas(); renderAllMessages()
}
function showEdit(msg) {
  runtime.editTarget = msg
  const overlay = document.getElementById('editOverlay'); const ta = document.getElementById('editTextarea')
  if (!overlay || !ta) return
  ta.value = msg.content || ''; overlay.style.display = 'flex'; setTimeout(() => ta.focus(), 200)
}
function closeEdit() { const overlay = document.getElementById('editOverlay'); if (overlay) overlay.style.display = 'none'; runtime.editTarget = null }
function confirmEdit() {
  if (!runtime.editTarget) return
  const ta = document.getElementById('editTextarea'); const newText = ta?.value?.trim()
  if (!newText) { closeEdit(); return }
  const h = activeHistory(); const idx = h.findIndex(m => m.ts === runtime.editTarget.ts)
  if (idx < 0) { closeEdit(); return }
  h[idx].content = newText; h.splice(idx + 1)
  savePersonas(); closeEdit(); renderAllMessages()
  setTimeout(() => send(), 400)
}

// Memory page helpers
window._addMemory = () => {
  const inp = document.querySelector('#memInput'); const t = inp?.value?.trim(); if (!t) return
  const cat = document.querySelector('#memCatSelect')?.value || '默认'
  addMemory(t, cat); if (inp) inp.value = ''; renderMemories()
}

// Diary page helpers
window._addDiary = () => {
  const ta = document.querySelector('#diaryTextarea'); const t = ta?.value?.trim(); if (!t) return
  addDiary(t, runtime.diaryMood); if (ta) ta.value = ''; runtime.diaryFilter = 'all'; renderDiary()
}

// Persona modal legacy bridge
import { COMMON_EMOJIS } from './consts.js'

window._legacyNewPersona = () => {
  runtime.editPersonaId = null
  renderPersonaForm({ name: '', avatar: '✨', description: '', systemPrompt: '', model: 'deepseek-chat', temperature: 1.3, topP: 0.9, useReasoner: false })
  document.getElementById('personaModalOverlay').classList.add('show')
}
window._legacyEditPersona = (id) => {
  runtime.editPersonaId = id; const p = personas.find(p => p.id === id)
  if (p) renderPersonaForm(p)
  document.getElementById('personaModalOverlay').classList.add('show')
}
window.savePersona = () => {
  const n = (document.getElementById('pfName')?.value || '').trim()
  if (!n) { toast('请输入角色名'); return }
  const avatarData = (document.getElementById('pfAvatarData')?.value || '').trim()
  const avatar = avatarData || (document.getElementById('emojiBtn')?.textContent || '✨').trim()
  const d = { name: n, avatar, description: (document.getElementById('pfDesc')?.value || '').trim(), systemPrompt: (document.getElementById('pfPrompt')?.value || '').trim(), model: document.getElementById('pfModel')?.value || 'deepseek-chat', useReasoner: false, temperature: parseFloat(document.getElementById('pfTemp')?.value || 1.3), topP: parseFloat(document.getElementById('pfTopP')?.value || 0.9) }
  if (runtime.editPersonaId) { const p = personas.find(p => p.id === runtime.editPersonaId); if (p) Object.assign(p, d) }
  else { personas.push({ id: 'p_' + Date.now(), ...d, chatHistory: [] }) }
  savePersonas(); document.getElementById('personaModalOverlay').classList.remove('show'); updateChatHeader(); toast(runtime.editPersonaId ? '角色已更新' : '新角色已创建')
}
window.closePersonaModal = () => { document.getElementById('personaModalOverlay').classList.remove('show') }

function renderPersonaForm(p) {
  let avatarPreview = p.avatar && p.avatar.startsWith('data:') ? `<img src="${escHtml(p.avatar)}">` : p.avatar || '✨'
  if (!p.avatar || !p.avatar.startsWith('data:')) avatarPreview = `<span>${avatarPreview}</span>`
  const pf = document.getElementById('personaForm')
  pf.innerHTML = `<div class="pf-row"><div class="pf-group" style="flex:0"><label>头像</label><div class="avatar-upload"><div class="av-preview" id="pfAvatarPrev" onclick="document.getElementById('pfAvatarInput').click()">${avatarPreview}</div><input type="file" id="pfAvatarInput" accept="image/*" style="display:none" onchange="window.uploadPersonaAvatar(this)"><button class="av-btn" onclick="document.getElementById('pfAvatarInput').click()">上传图片</button></div><div class="pf-row" style="margin-top:4px"><button class="emoji-picker-btn" id="emojiBtn">${!p.avatar || p.avatar.startsWith('data:') ? '✨' : p.avatar}</button><div class="emoji-grid" id="emojiGrid" style="display:none">${COMMON_EMOJIS.map(e => `<button onclick="window.pickEmoji('${e}')" class="">${e}</button>`).join('')}</div></div></div><div class="pf-group"><label>名字</label><input id="pfName" value="${escHtml(p.name || '')}" placeholder="角色名"></div></div><div class="pf-group"><label>简介</label><input id="pfDesc" value="${escHtml(p.description || '')}" placeholder="一句话描述"></div><div class="pf-group"><label>System Prompt（人设）</label><textarea id="pfPrompt" placeholder="描述角色的性格、说话方式…">${escHtml(p.systemPrompt || '')}</textarea></div><div class="pf-row"><div class="pf-group"><label>模型</label><select id="pfModel"><option value="deepseek-chat" ${p.model === 'deepseek-chat' ? 'selected' : ''}>deepseek-chat</option><option value="deepseek-reasoner" ${p.model === 'deepseek-reasoner' ? 'selected' : ''}>deepseek-reasoner</option></select></div><div class="pf-group"><label>Temperature (${p.temperature || 1.3})</label><input id="pfTemp" type="range" min="0" max="2" step="0.1" value="${p.temperature || 1.3}" oninput="this.parentElement.querySelector('label').textContent='Temperature ('+this.value+')'"></div></div><div class="pf-row"><div class="pf-group"><label>Top P (${p.topP || 0.9})</label><input id="pfTopP" type="range" min="0" max="1" step="0.05" value="${p.topP || 0.9}" oninput="this.parentElement.querySelector('label').textContent='Top P ('+this.value+')'"></div></div><input type="hidden" id="pfAvatarData" value="${p.avatar && p.avatar.startsWith('data:') ? escHtml(p.avatar) : ''}">`
  setTimeout(() => { const b = document.getElementById('emojiBtn'); const g = document.getElementById('emojiGrid'); if (b && g) b.onclick = () => { g.style.display = g.style.display === 'none' ? 'flex' : 'none' } }, 50)
}

// ============================================================
// Event wiring (cross-module communication via Event Bus)
// ============================================================

on(Events.CONFIG_CHANGED, () => { updateChatHeader() })
on(Events.PERSONA_SWITCHED, () => { updateChatHeader(); renderAllMessages() })
on(Events.MEMORY_EXTRACTED, ({ count }) => { toast('🤖 已自动提取 ' + count + ' 条新记忆'); renderMemories() })
on(Events.REMINDER_TRIGGERED, (r) => {
  if (Notification.permission === 'granted') { new Notification('⏰ 提醒', { body: r.content, icon: '🌙' }) }
  toast('⏰ ' + r.content)
})
on(Events.AUTO_EXTRACT_MEMORY, () => { extractMemoriesFromChat(activeHistory()) })
on(Events.AUTO_EXTRACT_DIARY, () => { extractDiarySilent(activeHistory()) })

// Resonance engine events
on(Events.RESONANCE_CONTACT_READY, ({ personaId, type }) => {
  const p = personas.find(x => x.id === personaId)
  if (!p) return
  if (type === 'contact') {
    toast(`💫 ${p.name} 想和你说说话…`)
    p.resonance.state.contactCount = (p.resonance.state.contactCount || 0) + 1
    p.resonance.state.lastContactTime = Date.now()
  }
  // 'hint' type: restraint is high — silent, no UI disturbance
})

on(Events.RESONANCE_TICK, () => {
  // Update mood bar with current persona's resonance state
  updateMoodBar()
})

// Background resonance tick timer (every 10 minutes)
let resonanceTimer = null
function startResonanceTimer() {
  clearInterval(resonanceTimer)
  resonanceTimer = setInterval(() => {
    const results = tickActiveResonances(personas, config.activePersonaId, Date.now())
    savePersonas() // persist after batch tick
    for (const { persona, newState } of results) {
      const threshold = checkThreshold(newState, persona.resonance.config)
      if (threshold.triggered) {
        const lastUserTs = (persona.chatHistory || []).filter(m => m.role === 'user').pop()?.ts
        if (canContact(newState, persona.resonance.config, lastUserTs)) {
          emit(Events.RESONANCE_CONTACT_READY, { personaId: persona.id, type: threshold.type })
        }
      }
    }
  }, 10 * 60 * 1000) // 10 minutes
}

// ============================================================
// Idle Greeting
// ============================================================
let idleTimer = null
function startIdleGreetingImpl() {
  clearInterval(idleTimer)
  idleTimer = setInterval(() => {
    const h = activeHistory(); if (!h.length) return
    const lastMsg = h[h.length - 1]; if (!lastMsg || Date.now() - lastMsg.ts < 4 * 3600000) return
    const lastGreeting = h.filter(m => m.type === 'system' && m.content.startsWith('💬')).pop()
    if (lastGreeting && Date.now() - lastGreeting.ts < 12 * 3600000) return
    const greetings = ['今天过得怎么样？', '在想你，来看看你。', '外面的天都暗了，你那边呢？', '刚醒吗？还是还没睡…', '没什么事，就是想你了。']
    const g = greetings[Math.floor(Math.random() * greetings.length)]
    h.push({ role: 'assistant', content: g, ts: Date.now(), reactions: {} })
    savePersonas(); renderAllMessages()
    if (document.hidden) { try { new Notification('沈度', { body: g, icon: '🌙' }) } catch (e) { } }
  }, 600000)
}

// ============================================================
// Migration
// ============================================================
function migrateOldData() {
  if (!config.userAvatar && config.userAvatar !== '') config.userAvatar = ''
  if (!config.userName && config.userName !== '') config.userName = ''
  if (config.deepThink === undefined) config.deepThink = false
  let memPatched = false
  memories.forEach(m => {
    if (!m.source) { m.source = 'manual'; memPatched = true }
    if (!m.tags) { m.tags = []; memPatched = true }
    if (m.usageCount === undefined) { m.usageCount = 0; memPatched = true }
    if (m.lastUsed === undefined) { m.lastUsed = null; memPatched = true }
    if (!m.characterId) { m.characterId = 'shendu'; memPatched = true }
  })
  if (memPatched) saveMemories()
  // Resonance engine migration: ensure all personas have resonance state
  personas.forEach(p => {
    if (!p.resonance || p.resonance.version === undefined) {
      p.resonance = {
        version: 1,
        state: {
          connection: 0.1, restraint: 0, valence: 0.1, arousal: -0.1,
          immersion: 0, lastTick: Date.now(), tickCount: 0,
          contactCount: 0, lastContactTime: null
        },
        config: {
          connectionGrowthRate: 0.005, connectionDecayOnReply: 0.06,
          restraintRegressRate: 0.003, restraintBlockThreshold: 0.5,
          restraintErosionRate: 0.001, valenceRegressRate: 0.005,
          valenceSetpoint: 0, arousalRegressRate: 0.005, arousalSetpoint: 0,
          immersionDecayRate: 0.010, contactThreshold: 0.55,
          contactCooldownMinutes: 30, maxDailyContacts: 8,
          userIdleThresholdMinutes: 5, positiveSentimentBoost: 0.08,
          negativeSentimentBoost: 0.06, longSilenceConnectionBoost: 0.05,
          longSilenceRestraintDrop: 0.03, longSilenceThresholdMinutes: 30
        },
        interactions: []
      }
    }
  })
  savePersonas()
}

// ============================================================
// INIT
// ============================================================
function init() {
  try {
    loadAll(); migrateOldData()

    const messagesEl = document.getElementById('messages')
    const inputEl = document.getElementById('input')
    const sendBtn = document.getElementById('sendBtn')

    document.getElementById('confirmOk').addEventListener('click', confirmAction)
    document.getElementById('lockInput').addEventListener('keydown', e => { if (e.key === 'Enter') unlock() })

    let tsx = 0
    const drawerEl = document.getElementById('drawer')
    drawerEl.addEventListener('touchstart', e => { tsx = e.touches[0].clientX })
    drawerEl.addEventListener('touchmove', e => { if (e.touches[0].clientX - tsx < -50) closeDrawer() })

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDrawer(); window.closePersonaModal(); closeConfirm(); hideCtxMenu() }
    })

    messagesEl.addEventListener('scroll', () => {
      const sb = document.getElementById('scrollBottomBtn')
      if (sb) sb.classList.toggle('show', messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight > 200)
    })

    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px'
      sendBtn.disabled = !inputEl.value.trim() && runtime.pendingImages.length === 0
      const cc = document.getElementById('charCount')
      if (cc) { const len = inputEl.value.length; cc.textContent = len > 0 ? len + ' 字' : ''; cc.classList.toggle('show', len > 0) }
    })

    inputEl.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && !inputEl.value && runtime.inputHistory.length) {
        e.preventDefault(); runtime.inputHistIdx = Math.min(runtime.inputHistIdx + 1, runtime.inputHistory.length - 1)
        inputEl.value = runtime.inputHistory[runtime.inputHistory.length - 1 - runtime.inputHistIdx]
        inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px'; sendBtn.disabled = false
        return
      }
      if (e.key === 'ArrowDown' && runtime.inputHistIdx >= 0) {
        e.preventDefault(); runtime.inputHistIdx--
        inputEl.value = runtime.inputHistIdx < 0 ? '' : runtime.inputHistory[runtime.inputHistory.length - 1 - runtime.inputHistIdx]
        inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px'; sendBtn.disabled = !inputEl.value.trim()
        return
      }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') runtime.inputHistIdx = -1
      if (e.key === 'Enter' && !e.shiftKey && !runtime.isGenerating) { e.preventDefault(); if (inputEl.value.trim() || runtime.pendingImages.length > 0) send() }
    })

    const groupInputEl = document.getElementById('groupInput'); const groupSendBtn = document.getElementById('groupSendBtn')
    if (groupInputEl) {
      groupInputEl.addEventListener('input', () => { groupInputEl.style.height = 'auto'; groupInputEl.style.height = Math.min(groupInputEl.scrollHeight, 110) + 'px'; groupSendBtn.disabled = !groupInputEl.value.trim() })
      groupInputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !runtime.isGenerating) { e.preventDefault(); if (groupInputEl.value.trim()) sendGroupMsg(groupInputEl.value).then(() => { groupInputEl.value = ''; renderGroupChat() }) } })
    }

    document.addEventListener('click', e => {
      const cm = document.getElementById('ctxMenu'); const rp = document.getElementById('reactionPicker')
      if (cm && !cm.contains(e.target) && rp && !rp.contains(e.target)) hideCtxMenu()
      if (drawerEl && !drawerEl.contains(e.target) && !e.target.closest('[onclick*="openDrawer"]')) closeDrawer()
      const pp = document.getElementById('plusPanel'); if (pp && !pp.contains(e.target) && e.target.id !== 'plusBtn') pp.classList.remove('show')
    })

    // Touch skin
    const bubble = document.getElementById('touchBubble')
    if (bubble && config.touchSkin !== false) {
      let motionLevel = 0
      window.addEventListener('devicemotion', e => { motionLevel = Math.min(1, Math.abs(e.acceleration?.x || 0) / 5 + Math.abs(e.acceleration?.y || 0) / 5 + Math.abs(e.acceleration?.z || 0) / 5) })
      document.addEventListener('touchmove', e => {
        if (!bubble) return; const t = e.touches[0]; bubble.style.display = 'block'
        bubble.style.left = t.clientX + 'px'; bubble.style.top = t.clientY + 'px'
        const force = t.force || 0.5; const size = 16 + force * 28 + Math.random() * 4
        bubble.style.width = size + 'px'; bubble.style.height = size + 'px'
        bubble.style.opacity = Math.min(.6, .2 + force * .4 + motionLevel * .3)
        bubble.style.background = `radial-gradient(circle,hsl(${motionLevel > .5 ? 280 + force * 40 : 340 + force * 20},60%,70%),hsl(${motionLevel > .5 ? 280 + force * 40 : 340 + force * 20},50%,60%))`
      }, { passive: true })
      document.addEventListener('touchend', () => { if (bubble) { bubble.style.opacity = '0'; setTimeout(() => { bubble.style.display = 'none' }, 300) } })
    }

    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(() => { }) }
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); runtime.deferredPrompt = e })

    showLockScreen()

    if (runtime.unlocked) {
      const loadingEl = document.getElementById('initLoading'); if (loadingEl) loadingEl.style.display = 'none'
      applyTheme(); checkAutoNight(); updateChatHeader(); updateMoodBar()
      const hb = document.getElementById('hintBox'); if (hb) { const hg = hb.querySelector('.hint-greeting'); if (hg) hg.textContent = getGreeting() }
      renderAllMessages()
      if (getActiveApiKey()) refreshBalance()
      applyChatBg(); applyFontSize(); updateStatusBar()
      restoreReminders(); updateMilestoneUI()
      if (isDesktop()) { renderDrawerPanel(); drawerEl.style.transform = 'none' }
      startIdleGreetingImpl()
      startResonanceTimer()
      initResonanceObserver()
    }

    initToy()
    console.log('🌸 沈度 v13 架构完善版已就绪')
  } catch (e) {
    const el = document.getElementById('initLoading')
    if (el) el.innerHTML = '<div style="font-size:40px">⚠️</div><div style="margin-top:12px;font-size:14px;color:#c06070">加载失败：' + e.message + '</div><div style="font-size:11px;margin-top:8px;color:var(--text-muted)">请刷新页面或清除浏览器数据后重试</div>'
    console.error('沈度 init error:', e)
  }
}

init()
