/* ============================================
   app/ui.js — UI 渲染
   设置面板 / 抽屉 / Dashboard / Toast / 确认弹窗 / 锁屏
   所有 DOM 渲染集中在此模块
   ============================================ */

import { config, personas, memories, diaries, anniversaries, favorites, reminders, bookmarks, rooms, sessions, moments, runtime } from './state.js'
import { COMMON_EMOJIS, THEMES, THEME_COLORS, FONT_SIZES } from './consts.js'
import { saveConfig, savePersonas, saveFavorites, saveAnniversaries, saveMemories, saveDiaries, exportAll, importAll, clearAll } from './storage.js'
import { getActiveApiKey, fetchBalance } from './provider.js'
import { activePersona, activeHistory, cleanOldHistory } from './persona.js'
import { getCurrentMilestone } from './reminder.js'
import { escHtml, fmtTime, fmtDate, dayKey, getGreeting, avatarHTML, userAvatarHTML, aiAvatarHTML, isDesktop, resizeImage, renderMD } from './utils.js'
import { emit, Events, on } from './events.js'
import { getResonanceSummary, getTopDimension, renderResonanceDashHTML } from './resonance-observer.js'

// ===== Toast =====
const toastEl = () => document.getElementById('toast')

export function toast(msg) {
  const el = toastEl(); if (!el) return
  el.textContent = msg; el.classList.add('show')
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 1800)
}

// ===== Confirm =====
export function showConfirm(title, msg, cb) {
  const t = document.getElementById('confirmTitle'); const m = document.getElementById('confirmMsg')
  const overlay = document.getElementById('confirmModalOverlay')
  if (t) t.textContent = title; if (m) m.textContent = msg
  if (overlay) overlay.classList.add('show')
  runtime.confirmCb = cb
}

export function closeConfirm() {
  const overlay = document.getElementById('confirmModalOverlay')
  if (overlay) overlay.classList.remove('show')
  runtime.confirmCb = null
}

export function confirmAction() {
  closeConfirm()
  if (runtime.confirmCb) { runtime.confirmCb(); runtime.confirmCb = null }
}

// ===== Lock Screen =====
export function showLockScreen() {
  if (!config.lockPasscode) { runtime.unlocked = true; return }
  const ls = document.getElementById('lockScreen'); const li = document.getElementById('lockInput')
  const le = document.getElementById('lockError')
  if (ls) ls.classList.add('active'); if (li) li.value = ''; if (le) le.style.display = 'none'
  setTimeout(() => li && li.focus(), 400)
}

export function unlock() {
  const li = document.getElementById('lockInput'); const le = document.getElementById('lockError')
  if (li && li.value === config.lockPasscode) {
    runtime.unlocked = true
    const ls = document.getElementById('lockScreen'); if (ls) ls.classList.remove('active')
    emit(Events.APP_UNLOCKED)
  } else {
    if (le) le.style.display = 'block'; if (li) li.value = ''
    setTimeout(() => le && (le.style.display = 'none'), 1500)
  }
}

// ===== Theme =====
export function setTheme(t) {
  config.theme = t; saveConfig()
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = THEME_COLORS[t] || '#f5f0ee'
}

export function applyTheme() {
  if (config.theme) document.documentElement.setAttribute('data-theme', config.theme)
}

export function applyFontSize() {
  document.documentElement.style.setProperty('--msg-font', FONT_SIZES[config.fontSize] || '15px')
}

export function applyChatBg() {
  const el = document.querySelector('#page-chat .scroll'); if (!el) return
  if (config.chatBg) {
    el.style.backgroundImage = `url(${config.chatBg})`; el.style.backgroundSize = 'cover'
    el.style.backgroundPosition = 'center'; el.classList.add('has-bg')
  } else {
    el.style.backgroundImage = ''; el.style.backgroundSize = ''; el.style.backgroundPosition = ''
    el.classList.remove('has-bg')
  }
}

// ===== Chat Header =====
export function updateChatHeader() {
  const p = activePersona(); if (!p) return
  const cn = document.getElementById('chatName'); if (cn) cn.textContent = p.name
  const ta = document.getElementById('topAvatar'); if (ta) ta.innerHTML = aiAvatarHTML(p)
  const hasKey = !!getActiveApiKey()
  const sd = document.querySelector('#chatStatus .status-dot'); if (sd) sd.classList.toggle('off', !hasKey)
  const cs = document.getElementById('chatStatus'); if (cs && cs.lastChild) cs.lastChild.textContent = hasKey ? 'online' : 'offline'
  const ha = document.querySelector('#hintBox .hint-avatar'); if (ha) ha.innerHTML = aiAvatarHTML(p)
  const la = document.querySelector('#lockScreen .lock-avatar'); if (la) la.innerHTML = aiAvatarHTML(p)
}

// ===== Drawer Panel =====
export function renderDrawerPanel() {
  const dp = document.getElementById('drawerPanel'); if (!dp) return
  const p = activePersona()
  const favCount = favorites.length
  const remCount = reminders.filter(r => r.triggerAt > Date.now()).length
  const hasKey = !!getActiveApiKey(); const prov = config.apiProvider || 'deepseek'

  let keyHTML = ''
  if (!hasKey) {
    const phs = { deepseek: 'DeepSeek API Key（sk-...）', openrouter: 'OpenRouter API Key（sk-or-...）', claude: 'Anthropic API Key（sk-ant-...）', custom: '自定义 API Key' }
    const links = { deepseek: 'https://platform.deepseek.com/api_keys', openrouter: 'https://openrouter.ai/keys', claude: 'https://console.anthropic.com/', custom: '' }
    keyHTML = '<div style="padding:4px 8px 8px"><input id="drawerApiKey" type="password" value="' + escHtml(prov === 'openrouter' ? config.openrouterKey : prov === 'custom' ? config.customApiKey : prov === 'claude' ? config.claudeKey : config.apiKey || '') + '" placeholder="' + phs[prov] + '" style="width:100%;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:8px 10px;font-size:11px;outline:none;color:var(--text);font-family:inherit" onchange="window.onDrawerKeyChange(this.value)"><div style="font-size:9px;color:var(--text-muted);margin-top:3px;text-align:center">粘贴后自动保存' + (links[prov] ? ' · <a href="' + links[prov] + '" target="_blank">获取 Key</a>' : '') + '</div></div><div class="drawer-divider"></div>'
  }

  const I = (icon, label, click, badge) => '<div class="drawer-menu-item" onclick="' + escHtml(click) + '"><span class="dm-icon">' + icon + '</span><span class="dm-label">' + label + '</span>' + (badge ? '<span class="dm-badge">' + badge + '</span>' : '') + '<span class="dm-arrow">›</span></div>'
  const S = (title, icon, content) => {
    const id = 'sec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    return '<div class="drawer-section"><div class="ds-label" onclick="var e=document.getElementById(\'' + id + '\');e.classList.toggle(\'open\');this.classList.toggle(\'collapsed\')" style="cursor:pointer;display:flex;align-items:center;gap:4px"><span style="font-size:8px;transition:.2s;display:inline-block" class="sec-arrow">▼</span> ' + icon + ' ' + title + '</div><div class="sec-body" id="' + id + '">' + content + '</div></div><div class="drawer-divider"></div>'
  }

  dp.innerHTML = keyHTML +
    '<div class="drawer-section"><div class="persona-row" style="margin-bottom:4px">' + personas.map(pp => '<div class="persona-chip ' + (pp.id === config.activePersonaId ? 'active' : '') + '" onclick="window.switchPersona(\'' + pp.id + '\')"><div class="pc-avatar">' + avatarHTML(pp.avatar) + '</div><div class="pc-name">' + escHtml(pp.name) + '</div></div>').join('') + '<div class="persona-chip" onclick="window.newPersona()" style="opacity:.6"><div class="pc-avatar" style="font-size:14px;border-style:dashed">＋</div><div class="pc-name">新建</div></div></div></div>' +
    S('日常', '📔', I('📔', '日记', "window.closeDrawer();window.switchTab('diary')") + I('🗂', '记忆', "window.closeDrawer();window.switchTab('memory')") + I('🔍', '搜索', "window.closeDrawer();window.toggleSearch()") + I('💭', '深度思考', "window.toggleDeepThink();window.renderDrawerPanel()", config.deepThink ? 'R1' : 'V3')) +
    S('社交', '👥', I('💬', '新建群聊', 'window.addGroupRoomMembers()') + rooms.map(r => I('', '　' + escHtml(r.name), "window.openGroupRoom('" + r.id + "')", r.messages.length)).join('') + I('📱', '朋友圈', "window.closeDrawer();window.switchTab('moments')", moments.length)) +
    S('收藏', '⭐', I('⭐', '收藏夹', "runtime.meSection='favs';window.closeDrawer();window.switchTab('me')", favCount) + I('🔖', '书签', "runtime.meSection='bookmarks';window.closeDrawer();window.switchTab('me')", bookmarks.length) + I('⏰', '提醒', "runtime.meSection='reminders';window.closeDrawer();window.switchTab('me')", remCount)) +
    S('数据', '📊', I('📊', '数据看板', "runtime.meSection='dash';window.closeDrawer();window.switchTab('me')") + I('⚙', '设置', "runtime.meSection='settings';window.closeDrawer();window.switchTab('me')")) +
    '<div class="drawer-section"><div class="ds-label">主题</div><div class="persona-row">' + THEMES.map(t => '<div class="persona-chip ' + (config.theme === t.id ? 'active' : '') + '" onclick="window.setTheme(\'' + t.id + '\');window.renderDrawerPanel()"><div class="pc-avatar">' + t.icon + '</div><div class="pc-name">' + t.name + '</div></div>').join('') + '</div></div>' +
    (runtime.isLocalMode ? I('🔌', '测试玩具', "window.sendToyCommand('vibrate',0.3,2000);window.toast('已发送测试震动')") + I('📲', '安装', 'window.installPWA()') : I('📲', '安装到手机', 'window.installPWA()'))
}

export function openDrawer() {
  renderDrawerPanel()
  if (!isDesktop()) {
    const d = document.getElementById('drawer'); const o = document.getElementById('drawerOverlay')
    if (d) d.classList.add('open'); if (o) o.classList.add('open')
  }
}

export function closeDrawer() {
  if (!isDesktop()) {
    const d = document.getElementById('drawer'); const o = document.getElementById('drawerOverlay')
    if (d) d.classList.remove('open'); if (o) o.classList.remove('open')
  }
}

// ===== Mood Bar =====
export function updateMoodBar() {
  const bar = document.getElementById('moodBar'); if (!bar) return
  bar.style.display = 'flex'
  const h = activeHistory()
  const recent = h.slice(-5).filter(m => m.role === 'user' || m.role === 'assistant')
  const moods = ['温柔', '开心', '平静', '担忧', '撒娇', '吃醋中']
  const moodIcons = ['cool', 'warm', 'cool', 'warm', 'warm', 'hot']
  let moodIdx = 0
  if (recent.length) {
    const last = recent[recent.length - 1]
    if (/爱|喜欢|想|抱|吻|亲/.test(last.content || '')) moodIdx = 1
    else if (/担心|怕|不安|难过|哭/.test(last.content || '')) moodIdx = 3
    else if (/吃醋|别人|他|她|TA/.test(last.content || '')) moodIdx = 5
  }
  const md = document.getElementById('moodDot'); const mt = document.getElementById('moodText')
  if (md) md.className = 'mood-dot ' + moodIcons[moodIdx]; if (mt) mt.textContent = moods[moodIdx]
  const jEl = document.getElementById('jealousyMood'); const jLabel = document.getElementById('jealousyLabel')
  if (config.jealousyLevel > 0) {
    if (jEl) jEl.style.display = 'flex'; if (jLabel) jLabel.textContent = '醋意 ' + (config.jealousyLevel || 50) + '%'
  } else { if (jEl) jEl.style.display = 'none' }
  updateMilestoneUI()
  updateResonanceIndicator()
}

function updateResonanceIndicator() {
  const el = document.getElementById('resonanceMood')
  if (!el) return
  const p = activePersona()
  if (!p || !p.resonance || !p.resonance.state) {
    el.style.display = 'none'
    return
  }
  const summary = getResonanceSummary(p)
  if (!summary) { el.style.display = 'none'; return }
  const top = getTopDimension(summary)
  if (!top) { el.style.display = 'none'; return }
  el.style.display = 'flex'
  const label = document.getElementById('resonanceLabel')
  if (label) {
    label.textContent = top.label + ' ' + top.pct + '% ' + top.trend
  }
}

export function updateMilestoneUI() {
  const mEl = document.getElementById('milestoneMood'); const mText = document.getElementById('milestoneText')
  if (!mEl || !mText) return
  const ms = getCurrentMilestone()  // ← uses reminder.js single source of truth
  if (ms) { mEl.style.display = 'flex'; mText.textContent = ms } else { mEl.style.display = 'none' }
}

// ===== Navigation =====
// Import render functions directly (no more window.xxx indirection)
import { renderAllMessages } from './chat.js'

export function switchTab(n) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  const pg = document.querySelector('#page-' + n); if (pg) pg.classList.add('active')
  document.querySelectorAll('.tabbar button').forEach(b => { b.classList.toggle('active', b.dataset.tab === n) })
  if (n === 'chat') { runtime.unreadCount = 0; updateTabBadge() }
  // Direct module calls (not window.xxx)
  if (n === 'me' && typeof renderMe === 'function') renderMe()
  if (n === 'memory' && typeof renderMemories === 'function') renderMemories()
  if (n === 'diary' && typeof renderDiary === 'function') renderDiary()
  if (n === 'moments' && typeof renderMoments === 'function') renderMoments()
  if (n === 'group' && typeof renderGroupChat === 'function') renderGroupChat()
  emit(Events.TAB_SWITCHED, { tab: n })
}

export function updateTabBadge() {
  const btn = document.querySelector('.tabbar button[data-tab="chat"]'); if (!btn) return
  let badge = btn.querySelector('.tb-badge')
  if (runtime.unreadCount > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'tb-badge'; btn.appendChild(badge) }
    badge.textContent = runtime.unreadCount > 99 ? '99+' : runtime.unreadCount
  } else { if (badge) badge.remove() }
}

// ===== Context Menu & Reactions =====
export function showCtxMenu(msg, e) {
  runtime.ctxTarget = msg; runtime.reactTarget = msg
  const cm = document.getElementById('ctxMenu'); if (!cm) return
  const x = Math.min((e.touches ? e.touches[0].clientX : e.clientX), window.innerWidth - 140)
  const y = Math.min((e.touches ? e.touches[0].clientY : e.clientY), window.innerHeight - 180)
  cm.style.left = x + 'px'; cm.style.top = y + 'px'; cm.classList.add('show')
  const rp = document.getElementById('reactionPicker'); if (rp) rp.classList.remove('show')
}

export function hideCtxMenu() {
  const cm = document.getElementById('ctxMenu'); if (cm) cm.classList.remove('show')
  const rp = document.getElementById('reactionPicker'); if (rp) rp.classList.remove('show')
}

// ===== Balance (delegates to provider) =====
export async function refreshBalance() {
  const result = await fetchBalance()
  runtime.balanceCache = result
  updateBalanceDisplay()
}

function updateBalanceDisplay() {
  const b = document.getElementById('dashBalanceVal'); if (b) b.textContent = runtime.balanceCache || '--'
  const b2 = document.getElementById('balanceVal'); if (b2) b2.textContent = runtime.balanceCache || '--'
  const sb = document.getElementById('sbBalanceVal'); if (sb) sb.textContent = runtime.balanceCache || '--'
}

// ===== Settings Save =====
export function saveSettingsFromForm() {
  const F = id => document.getElementById(id)?.value?.trim() || ''
  config.apiProvider = F('setApiProvider') || 'deepseek'
  config.apiKey = F('setApiKey'); config.lockPasscode = F('setPasscode')
  config.openrouterKey = F('setOpenrouterKey')
  config.openrouterModel = F('setOpenrouterModel') || 'anthropic/claude-sonnet-4.6'
  config.customBaseUrl = F('setCustomBaseUrl'); config.customApiKey = F('setCustomApiKey')
  config.customModel = F('setCustomModel')
  config.claudeKey = F('setClaudeKey'); config.claudeModel = F('setClaudeModel') || 'claude-sonnet-5-20251001'
  config.userName = F('setUserName')
  config.autoSync = document.getElementById('setAutoSync')?.checked || false
  config.jealousyStyle = F('setJealousyStyle') || '撒娇'
  config.visionEnabled = document.getElementById('setVisionEnabled')?.checked || false
  config.visionBaseUrl = F('setVisionBaseUrl'); config.visionApiKey = F('setVisionApiKey')
  config.visionModel = F('setVisionModel')
  saveConfig(); updateChatHeader(); applyChatBg(); refreshBalance()
  renderAllMessages(); renderMe()
  toast('设置已保存')
}

// ===== Data Management =====
export function exportAllData() {
  const data = exportAll()
  const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const u = URL.createObjectURL(b); const a = document.createElement('a')
  a.href = u; a.download = '沈度备份_' + dayKey(Date.now()) + '.json'; a.click()
  URL.revokeObjectURL(u); toast('已导出')
}

export function importAllData(file) {
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result)
      if (!d.version) throw new Error('格式不对')
      showConfirm('确认导入',
        '将导入：\n· ' + (d.personas?.length || 0) + ' 个角色\n· ' + (d.memories?.length || 0) + ' 条记忆\n· ' + (d.diaries?.length || 0) + ' 条日记\n· ' + (d.favorites?.length || 0) + ' 条收藏\n当前数据会被覆盖，确定？',
        () => { importAll(d); renderAllMessages(); renderMe(); toast('已导入') })
    } catch (err) { toast('文件格式错误') }
  }
  reader.readAsText(file)
}

export function clearAllData() {
  showConfirm('确认清空', '将删除所有角色、聊天记录、记忆、日记，不可恢复。确定？', () => {
    clearAll(); updateChatHeader(); renderAllMessages(); renderMe(); toast('已清空')
  })
}

// ===== Night mode =====
export function checkAutoNight() {
  const h = new Date().getHours()
  const shouldDark = h < 6 || h >= 19
  const currentDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.getAttribute('data-theme') === 'noir'
  if (shouldDark && !currentDark) setTheme('dark')
  else if (!shouldDark && currentDark) setTheme('abyss')
  if (!window._nightTimer) window._nightTimer = setInterval(checkAutoNight, 1800000)
}

// ===== PWA =====
export async function installPWA() {
  if (!runtime.deferredPrompt) { toast('已安装或浏览器不支持快捷安装'); return }
  runtime.deferredPrompt.prompt()
  const result = await runtime.deferredPrompt.userChoice
  if (result.outcome === 'accepted') toast('✅ 已添加到主屏幕')
  runtime.deferredPrompt = null
}

// ===== Image UI =====
export function renderImagePreview() {
  const c = document.getElementById('imagePreview'); if (!c) return
  c.innerHTML = runtime.pendingImages.map((img, i) => `<div class="image-preview-item" style="background-image:url(${img.dataUrl})"><button class="img-remove" onclick="window.removeImage(${i})">✕</button></div>`).join('')
}

// ===== Plus panel & Search =====
export function togglePlusPanel() {
  const p = document.getElementById('plusPanel'); if (p) p.classList.toggle('show')
}

export function toggleSearch() {
  const sw = document.getElementById('searchWrap'); const si = document.getElementById('searchInput')
  if (!sw || !si) return
  runtime.searchResults = []; runtime.searchIdx = -1
  if (sw.classList.contains('show')) { sw.classList.remove('show'); si.value = ''; return }
  sw.classList.add('show'); si.value = ''; setTimeout(() => si.focus(), 200)
}

export function toggleDeepThink() {
  config.deepThink = !config.deepThink; saveConfig()
  toast(config.deepThink ? '💭 深度思考：开（将使用 R1 模型）' : '💭 深度思考：关（使用 V3 模型）')
}

// ============================================================
// Page Rendering (moved from index.js)
// ============================================================

import { exportPersonaMD, exportChatTXT } from './persona.js'
import { getActiveRoom } from './rooms.js'
import { addMoment, autoInteractMoment, likeMoment, commentMoment } from './moments.js'
import { addMemory, deleteMemory, extractMemoriesFromChat, syncMemoriesToCloud, syncMemoriesFromCloud, fullSync } from './memory.js'
import { addDiary, deleteDiary } from './diary.js'
import { addReminder, cancelReminder, addAnniversaryManual, deleteAnniversary } from './reminder.js'
import { sendGroupMsg } from './rooms.js'
import { sendToyCommand } from './toy.js'

// Settings page
export function renderMe() {
  const c = document.getElementById('meContent'); if (!c) return
  const p = activePersona()
  const section = runtime.meSection || 'settings'

  if (section === 'favs') {
    const kw = document.querySelector('#favSearch')?.value?.toLowerCase() || ''
    let ff = favorites; if (kw) ff = ff.filter(f => (f.content || '').toLowerCase().includes(kw))
    c.innerHTML = `<input class="mem-search" id="favSearch" placeholder="搜索收藏…" oninput="window.renderMe()" value="${escHtml(kw)}">${ff.length === 0 ? `<div class="mem-empty">${kw ? '没找到' : favorites.length === 0 ? '长按消息 → 收藏' : ''}</div>` : ff.map(f => { const preview = (f.content || '[图片]').slice(0, 80); return `<div class="fav-item" onclick="window.goToFavorite(${f.ts})"><span class="fav-role ${f.role === 'user' ? 'user' : 'ai'}">${f.role === 'user' ? '我' : 'AI'}</span><span class="fav-preview">${escHtml(preview)}</span><div class="fav-meta">${fmtDate(f.savedAt)}</div><button class="fav-unstar" onclick="event.stopPropagation();window.toggleFavorite(${f.ts});window.renderMe()">✕</button></div>` }).join('')}`
  } else if (section === 'reminders') {
    const now = Date.now(); const pending = reminders.filter(r => r.triggerAt > now).sort((a, b) => a.triggerAt - b.triggerAt)
    const past = reminders.filter(r => r.triggerAt <= now).sort((a, b) => b.triggerAt - a.triggerAt).slice(0, 10)
    c.innerHTML = `${pending.length === 0 ? '<div class="mem-empty">暂无待提醒</div>' : pending.map(r => { const m = Math.max(0, Math.ceil((r.triggerAt - now) / 60000)); return `<div class="reminder-item"><span class="rem-text">${escHtml(r.content)}</span><span class="rem-time">${m < 60 ? m + '分钟后' : Math.ceil(m / 60) + '小时后'}</span><button class="rem-del" onclick="window.cancelReminder(${r.createdAt});window.renderMe()">✕</button></div>` }).join('')}${past.length ? `<div class="drawer-divider"></div><div class="ds-label" style="padding:8px 0">已过期</div>${past.map(r => `<div class="reminder-item" style="opacity:.5"><span class="rem-text">${escHtml(r.content)}</span><span class="rem-time">${fmtDate(r.triggerAt)}</span><button class="rem-del" onclick="window.cancelReminder(${r.createdAt});window.renderMe()">✕</button></div>`).join('')}` : ''}`
  } else if (section === 'dash') {
    let all = []; personas.forEach(pp => { if (pp.chatHistory) all = all.concat(pp.chatHistory) })
    const total = all.length; const tk = dayKey(Date.now()); const today = all.filter(m => dayKey(m.ts) === tk).length
    let together = 0; const validMsgs = all.filter(m => m.role === 'user' || m.role === 'assistant')
    if (validMsgs.length > 0) together = Math.max(1, Math.ceil((Date.now() - validMsgs[0].ts) / 86400000))
    let weekMsgs = 0, weekDiaries = 0; const weekAgo = Date.now() - 7 * 86400000
    all.forEach(m => { if (m.ts > weekAgo) weekMsgs++ }); diaries.forEach(d => { if (d.ts > weekAgo) weekDiaries++ })
    const now2 = new Date(); const upcoming = anniversaries.filter(a => { const d = new Date(a.date); const nxt = new Date(now2.getFullYear(), d.getMonth(), d.getDate()); if (nxt < now2) nxt.setFullYear(nxt.getFullYear() + 1); return Math.ceil((nxt - now2) / 86400000) <= 7 })
    c.innerHTML = `<div class="dash-grid"><div class="dash-card highlight"><div class="dl">在一起</div><div class="dv">${together}<span class="du">天</span></div></div><div class="dash-card"><div class="dl">今日消息</div><div class="dv">${today}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">消息总数</div><div class="dv">${total}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">记忆</div><div class="dv">${memories.length}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">日记</div><div class="dv">${diaries.length}<span class="du">篇</span></div></div><div class="dash-card"><div class="dl">收藏</div><div class="dv">${favorites.length}<span class="du">条</span></div></div></div><div class="settings-section" style="text-align:center"><span style="font-size:12px;color:var(--text-soft)">📊 本周消息 ${weekMsgs} 条 · AI 日记 ${weekDiaries} 篇</span><div style="margin-top:6px"><span style="font-size:10px;color:var(--text-muted);cursor:pointer;text-decoration:underline" onclick="window.refreshBalance();setTimeout(()=>window.renderMe(),500)">余额：${runtime.balanceCache || '--'}（点击刷新）</span></div></div>${renderResonanceDashHTML(p)}${upcoming.length ? `<div class="ann-section"><div class="ann-title">🔔 即将到来的纪念日</div>${upcoming.map(a => { const d = new Date(a.date); const nxt = new Date(now2.getFullYear(), d.getMonth(), d.getDate()); if (nxt < now2) nxt.setFullYear(nxt.getFullYear() + 1); const diff = Math.ceil((nxt - now2) / 86400000); const yrs = now2.getFullYear() - d.getFullYear(); return `<div class="ann-item"><span class="ann-name">${escHtml(a.name)}</span><span style="font-size:9px;color:var(--text-muted)">${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} · ${yrs}年</span><span class="ann-cd" style="color:#e898a8">${diff === 0 ? '今天！' : diff === 1 ? '明天' : diff + '天后'}</span></div>` }).join('')}</div>` : ''}`
  } else {
    const userAv = config.userAvatar ? `<img src="${escHtml(config.userAvatar)}">` : '🧑'
    const bgStyle = config.chatBg ? `background-image:url(${escHtml(config.chatBg)});background-size:cover;background-position:center` : ''
    const prov = config.apiProvider || 'deepseek'
    const provOptions = [['deepseek', 'DeepSeek'], ['openrouter', 'OpenRouter'], ['claude', 'Anthropic Claude'], ['custom', '自定义 OpenAI']]
    const provSel = provOptions.map(o => `<option value="${o[0]}" ${prov === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')
    c.innerHTML = `<div class="settings-section"><div class="sec-title">API 设置</div><label>API 提供商</label><select id="setApiProvider" onchange="window.toggleApiProviderFields()">${provSel}</select><div class="settings-hint">切换提供商不会丢失已保存的 Key</div><div id="apiFieldsDS" style="display:${prov === 'deepseek' ? 'block' : 'none'}"><label style="margin-top:10px">DeepSeek API Key</label><input id="setApiKey" type="password" value="${escHtml(config.apiKey || '')}" placeholder="sk-xxxxxxxx" autocomplete="off"></div><div id="apiFieldsOR" style="display:${prov === 'openrouter' ? 'block' : 'none'}"><label style="margin-top:10px">OpenRouter API Key</label><input id="setOpenrouterKey" type="password" value="${escHtml(config.openrouterKey || '')}" placeholder="sk-or-xxxxxxxx" autocomplete="off"><label style="margin-top:8px">模型</label><input id="setOpenrouterModel" value="${escHtml(config.openrouterModel || 'anthropic/claude-sonnet-4.6')}" placeholder="anthropic/claude-sonnet-4.6"></div><div id="apiFieldsClaude" style="display:${prov === 'claude' ? 'block' : 'none'}"><label style="margin-top:10px">Anthropic API Key</label><input id="setClaudeKey" type="password" value="${escHtml(config.claudeKey || '')}" placeholder="sk-ant-xxxxxxxx" autocomplete="off"><div class="settings-hint"><a href="https://console.anthropic.com/" target="_blank">获取 API Key</a></div><label style="margin-top:8px">模型</label><input id="setClaudeModel" value="${escHtml(config.claudeModel || 'claude-sonnet-5-20251001')}" placeholder="claude-sonnet-5-20251001"><div class="settings-hint">如：claude-sonnet-5-20251001、claude-opus-4-8</div></div><div id="apiFieldsCustom" style="display:${prov === 'custom' ? 'block' : 'none'}"><label style="margin-top:10px">Base URL</label><input id="setCustomBaseUrl" value="${escHtml(config.customBaseUrl || '')}" placeholder="https://api.openai.com/v1"><label style="margin-top:8px">API Key</label><input id="setCustomApiKey" type="password" value="${escHtml(config.customApiKey || '')}" placeholder="sk-xxxxxxxx" autocomplete="off"><label style="margin-top:8px">模型名</label><input id="setCustomModel" value="${escHtml(config.customModel || '')}" placeholder="gpt-4o"></div></div><div class="settings-section"><div class="sec-title">你的信息</div><label>头像</label><div class="avatar-upload"><div class="av-preview" id="userAvatarPrev" onclick="document.getElementById('userAvatarInput').click()">${userAv}</div><input type="file" id="userAvatarInput" accept="image/*" style="display:none" onchange="window.uploadUserAvatar(this)"><button class="av-btn" onclick="document.getElementById('userAvatarInput').click()">从相册选择</button></div><label style="margin-top:8px">你的昵称</label><input id="setUserName" value="${escHtml(config.userName || '')}" placeholder="对方会看到这个名字"></div><div class="settings-section"><div class="sec-title">对话字体</div><label>大小</label><div style="display:flex;gap:8px;align-items:center"><input type="range" min="0" max="2" step="1" value="${config.fontSize === 's' ? 0 : config.fontSize === 'l' ? 2 : 1}" oninput="const v=['s','m','l'][this.value];config.fontSize=v;applyFontSize()" style="flex:1"><span style="font-size:${config.fontSize === 's' ? '13' : config.fontSize === 'l' ? '17' : '15'}px;color:var(--text);min-width:40px;text-align:center">${config.fontSize === 's' ? '小' : config.fontSize === 'l' ? '大' : '中'}</span></div></div><div class="settings-section"><div class="sec-title">隐私</div><label>解锁密码（留空关闭）</label><input id="setPasscode" type="password" maxlength="6" value="${escHtml(config.lockPasscode || '')}" placeholder="6位数字密码" autocomplete="off"></div><div class="settings-section"><div class="sec-title">对话背景</div><div class="avatar-upload"><div class="av-preview" id="chatBgPrev" style="width:80px;height:50px;border-radius:8px;${bgStyle}" onclick="document.getElementById('chatBgInput').click()">${!config.chatBg ? '🖼️' : ''}</div><input type="file" id="chatBgInput" accept="image/*" style="display:none" onchange="window.uploadChatBg(this)"><button class="av-btn" onclick="document.getElementById('chatBgInput').click()">从相册选择</button>${config.chatBg ? '<button class="av-btn" style="color:#d89098" onclick="config.chatBg=&#39;&#39;;applyChatBg();window.renderMe()">清除</button>' : ''}</div><div class="settings-hint">铺在聊天区后面，自动柔化融合</div></div><div class="settings-section"><div class="sec-title">🍋 吃醋阈值</div><label>敏感度 <span style="color:var(--accent)">${config.jealousyLevel || 50}%</span></label><input type="range" min="0" max="100" step="5" value="${config.jealousyLevel || 50}" oninput="this.previousElementSibling.querySelector('span').textContent=this.value+'%';config.jealousyLevel=parseInt(this.value)" style="width:100%"><label style="margin-top:8px">风格</label><select id="setJealousyStyle" style="width:100%;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:8px;font-size:13px;outline:none;color:var(--text)"><option value="撒娇" ${config.jealousyStyle === '撒娇' ? 'selected' : ''}>撒娇</option><option value="傲娇" ${config.jealousyStyle === '傲娇' ? 'selected' : ''}>傲娇</option><option value="冷淡" ${config.jealousyStyle === '冷淡' ? 'selected' : ''}>冷淡</option><option value="幽默" ${config.jealousyStyle === '幽默' ? 'selected' : ''}>幽默</option></select></div><div class="settings-section"><div class="sec-title">角色：${aiAvatarHTML(p)} ${escHtml(p.name)}</div><div class="btn-row"><button class="btn-outline" onclick="window.openDrawer()" style="flex:1">切换角色</button><button class="btn-outline" onclick="window._legacyEditPersona('${p.id}')" style="flex:1">编辑人设</button></div></div><div class="settings-section"><div class="sec-title">☁️ Supabase 云端记忆</div><div class="btn-row"><button class="btn-primary" onclick="window.fullSync()" style="flex:1">🔄 双向同步</button><button class="btn-outline" onclick="window.syncMemoriesToCloud()" style="flex:1">⬆ 上传</button><button class="btn-outline" onclick="window.syncMemoriesFromCloud()" style="flex:1">⬇ 下载</button></div><div style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="setAutoSync" ${config.autoSync ? 'checked' : ''} style="width:auto;accent-color:var(--accent)"><label style="margin:0;cursor:pointer" onclick="document.getElementById('setAutoSync').click()">自动同步</label></div></div><div class="settings-section"><div class="sec-title">👁️ 图片识别</div><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input type="checkbox" id="setVisionEnabled" ${config.visionEnabled ? 'checked' : ''} style="width:auto;accent-color:var(--accent)"><label style="margin:0;cursor:pointer" onclick="document.getElementById('setVisionEnabled').click()">启用图片识别</label></div><label style="margin-top:8px">Base URL（OpenAI 兼容）</label><input id="setVisionBaseUrl" value="${escHtml(config.visionBaseUrl || '')}" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"><label style="margin-top:8px">API Key</label><input id="setVisionApiKey" type="password" value="${escHtml(config.visionApiKey || '')}" placeholder="sk-xxxxxxxx" autocomplete="off"><label style="margin-top:8px">模型名</label><input id="setVisionModel" value="${escHtml(config.visionModel || '')}" placeholder="qwen-vl-plus"></div><div class="settings-section"><div class="sec-title">数据管理</div><div class="btn-row"><button class="btn-primary" onclick="window.exportAll()" style="flex:1">导出备份</button><button class="btn-outline" onclick="document.getElementById('importFile').click()" style="flex:1">导入备份</button></div><input type="file" id="importFile" accept=".json" style="display:none" onchange="window.importAll(this)"><button class="btn-full" onclick="window.exportPersonaMD()">📄 导出当前角色人设 (CLAUDE.md)</button><button class="btn-full" onclick="window.exportChatTXT()">📝 导出对话记录 (TXT)</button><button class="btn-full" onclick="window.cleanOldHistoryImpl()">🧹 清理旧对话（保留最近200条）</button><button class="btn-full" onclick="window.clearAllDataImpl()">清空所有数据（含记忆/日记）</button></div><button class="btn-full primary" onclick="window.saveSettingsFromForm()">保存设置</button>`
    refreshBalance()
  }
}

// Group chat rendering
export function renderGroupChat() {
  const el = document.getElementById('groupMessages'); if (!el) return
  const room = getActiveRoom()
  if (!room || !room.messages.length) { el.innerHTML = '<div class="mem-empty">选两个角色开始群聊吧</div>'; return }
  const gt = document.getElementById('groupTitle'); if (gt) gt.textContent = room.name
  el.innerHTML = room.messages.map(m => {
    if (m.role === 'user') { return `<div class="msg-row user"><div class="msg-avatar">${userAvatarHTML(config)}</div><div class="msg">${escHtml(m.content)}<div class="time">${fmtTime(m.ts)}</div></div></div>` }
    const p = personas.find(x => x.id === m.personaId) || activePersona()
    return `<div class="msg-row ai"><div class="msg-avatar">${avatarHTML(p.avatar)}</div><div class="msg" style="border-left:3px solid var(--accent)">${renderMD(m.content)}<div class="time">${p.name} · ${fmtTime(m.ts)}</div></div></div>`
  }).join('')
  el.scrollTop = el.scrollHeight
}

// Memories page
export function renderMemories() {
  const c = document.getElementById('memoryContent'); if (!c) return
  const aid = config.activePersonaId
  let f = memories.filter(m => (m.characterId || 'shendu') === aid)
  const uC = [...new Set(f.map(m => m.category || '默认'))]
  const kw = document.querySelector('#memSearch')?.value?.toLowerCase() || ''
  if (kw) f = f.filter(m => m.content.toLowerCase().includes(kw))
  if (runtime.memCatFilter !== 'all') f = f.filter(m => (m.category || '默认') === runtime.memCatFilter)
  c.innerHTML = `<input class="mem-search" id="memSearch" placeholder="搜索记忆…" oninput="window.renderMemories()" value="${escHtml(document.querySelector('#memSearch')?.value || '')}"><div class="mem-cats" id="memCats"><button class="${runtime.memCatFilter === 'all' ? 'active' : ''}" onclick="runtime.memCatFilter='all';window.renderMemories()">全部</button>${uC.map(x => `<button class="${runtime.memCatFilter === x ? 'active' : ''}" onclick="runtime.memCatFilter='${escHtml(x)}';window.renderMemories()">${escHtml(x)}</button>`).join('')}</div><div style="display:flex;gap:6px;margin-bottom:12px"><input id="memInput" placeholder="记下点什么…" style="flex:1;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;outline:none;color:var(--text);font-family:inherit" onkeydown="if(event.key==='Enter')window._addMemory()"><select id="memCatSelect" style="width:70px;font-size:10px;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:4px;outline:none;color:var(--text)"><option>默认</option><option>关于ta</option><option>约定</option><option>灵感</option><option>喜好</option></select><button onclick="window._addMemory()" style="background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:0 14px;font-size:12px;cursor:pointer;font-family:inherit">＋</button></div><button class="mem-extract-btn" onclick="window.extractMemoriesFromChat()">🤖 从聊天中提取记忆</button><div class="mem-count-info">${memories.length} 条记忆 · ${memories.filter(m => m.source === 'auto').length} 条自动</div><div style="display:flex;gap:6px;margin-bottom:10px"><button onclick="window.syncMemoriesToCloud()" style="flex:1;padding:7px;border-radius:8px;border:1px solid var(--glass-border);background:var(--glass-light);color:var(--text-soft);font-size:11px;cursor:pointer;font-family:inherit">☁️ 上传到云端</button><button onclick="window.syncMemoriesFromCloud()" style="flex:1;padding:7px;border-radius:8px;border:1px solid var(--glass-border);background:var(--glass-light);color:var(--text-soft);font-size:11px;cursor:pointer;font-family:inherit">☁️ 从云端下载</button></div><div id="memList">${f.length === 0 ? '<div class="mem-empty">' + (kw ? '没找到' : '记录关于你们的点点滴滴，AI会自动帮你整理') + '</div>' : f.map(m => `<div class="mem-item ${m.source === 'auto' ? 'mem-auto' : ''}"><button class="mem-del" onclick="window.deleteMemory(${m.id})">✕</button><span class="mem-cat">${escHtml(m.category || '默认')}</span>${m.source === 'auto' ? '<span class="mem-auto-badge">🤖 自动</span>' : ''}<div class="mem-text">${escHtml(m.content)}</div><div class="mem-meta">${fmtDate(m.createdAt)}${m.usageCount > 0 ? ' · 引用 ' + m.usageCount + ' 次' : ''}${m.tags && m.tags.length ? ' · ' + m.tags.map(t => '#' + t).join(' ') : ''}</div></div>`).join('')}</div>`
}

// Diary page
export function renderDiary() {
  const c = document.getElementById('diaryContent'); if (!c) return
  const aid = config.activePersonaId
  let myDiaries = diaries.filter(d => (d.characterId || 'shendu') === aid)
  const f = runtime.diaryFilter === 'all' ? myDiaries : myDiaries.filter(d => d.timeLabel === runtime.diaryFilter)
  c.innerHTML = `<div class="diary-tabs" id="diaryTabs"><button class="${runtime.diaryFilter === 'all' ? 'active' : ''}" onclick="runtime.diaryFilter='all';window.renderDiary()">全部</button><button class="${runtime.diaryFilter === '早晨' ? 'active' : ''}" onclick="runtime.diaryFilter='早晨';window.renderDiary()">早晨</button><button class="${runtime.diaryFilter === '午后' ? 'active' : ''}" onclick="runtime.diaryFilter='午后';window.renderDiary()">午后</button><button class="${runtime.diaryFilter === '夜晚' ? 'active' : ''}" onclick="runtime.diaryFilter='夜晚';window.renderDiary()">夜晚</button></div><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px"><textarea id="diaryTextarea" placeholder="今天想记下点什么…" style="width:100%;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius);padding:10px 12px;font-size:13px;outline:none;resize:none;min-height:60px;font-family:inherit;color:var(--text)"></textarea><div style="display:flex;align-items:center;gap:8px"><div style="display:flex;gap:2px">${['😊', '😌', '😢', '😡', '🤔', '🥰', '😴', '🤩'].map(m => `<button onclick="runtime.diaryMood='${m}';window.renderDiary()" style="width:30px;height:30px;border-radius:50%;border:2px solid ${runtime.diaryMood === m ? 'var(--accent)' : 'transparent'};background:var(--glass-light);font-size:15px;cursor:pointer">${m}</button>`).join('')}</div><button onclick="window._addDiary()" style="margin-left:auto;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:7px 16px;font-size:12px;cursor:pointer;font-family:inherit">写下</button></div></div><div id="diaryList">${f.length === 0 ? '<div class="mem-empty">还没有日记，去聊聊天让沈度帮你写一篇吧</div>' : f.map(d => `<div class="diary-item ${d.source === 'ai' ? 'mem-auto' : ''}"><button class="diary-del" onclick="window.deleteDiary(${d.id})">✕</button><div class="diary-date"><span class="diary-mood">${d.mood || ''}</span>${fmtDate(d.ts)} · ${d.timeLabel || ''}${d.source === 'ai' ? ' <span class="mem-auto-badge">🤖 AI</span>' : ''}</div><div class="diary-text">${escHtml(d.content)}</div></div>`).join('')}</div>`
}

// Moments page
export function renderMoments() {
  const c = document.getElementById('momentsContent'); if (!c) return
  c.innerHTML = moments.length === 0 ? '<div class="mem-empty" style="padding-top:60px"><div style="font-size:40px">📱</div><div style="margin-top:12px">还没有朋友圈，发第一条吧</div></div>' : moments.map(m => {
    const author = m.authorId === 'user' ? { name: config.userName || '我', avatar: userAvatarHTML(config) } : personas.find(p => p.id === m.authorId) || { name: '未知', avatar: '👤' }
    return '<div class="settings-section" style="margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div class="msg-avatar" style="width:32px;height:32px;font-size:14px">' + author.avatar + '</div><div><div style="font-size:13px;color:var(--text);font-weight:500">' + escHtml(author.name) + '</div><div style="font-size:10px;color:var(--text-muted)">' + fmtDate(m.ts) + '</div></div></div><div style="font-size:14px;color:var(--text);line-height:1.7;margin-bottom:10px;white-space:pre-wrap">' + escHtml(m.content) + '</div><div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--glass-border)"><button onclick="window.likeMoment(\'' + m.id + '\')" style="background:none;border:none;cursor:pointer;font-size:12px;color:' + (m.likes.includes(config.activePersonaId) ? 'var(--accent)' : 'var(--text-muted)') + '">❤️ ' + (m.likes.length || '') + '</button><button onclick="window.commentMoment(\'' + m.id + '\')" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-muted)">💬 评论</button></div>' + (m.comments.length ? '<div style="background:var(--glass-light);border-radius:var(--radius-sm);padding:8px 10px;margin-top:4px">' + m.comments.map(c => { const cp = c.personaId === 'user' ? { name: config.userName || '我', id: 'user' } : personas.find(p => p.id === c.personaId) || { name: '未知', id: '' }; return '<div style="font-size:11px;margin-bottom:2px;line-height:1.5"><span style="color:var(--accent);font-weight:500">' + escHtml(cp.name) + '</span><span style="color:var(--text-muted)">：' + escHtml(c.content) + '</span></div>' }).join('') + '</div>' : '') + '</div>'
  }).join('')
}

// Event subscriptions (UI reacts to events from other modules)
on(Events.STATUS_MESSAGE, (msg) => { toast(msg) })
on(Events.UNREAD_CHANGED, () => { updateTabBadge() })
on(Events.BALANCE_NEED_UPDATE, () => { refreshBalance() })
on(Events.IMAGES_CLEARED, () => { renderImagePreview() })
