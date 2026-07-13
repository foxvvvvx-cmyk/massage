/* ============================================
   app/storage.js — 存储抽象层
   所有 localStorage 操作统一通过此模块
   后续迁移到 IndexedDB 只需修改此文件
   ============================================ */

import { LS_CONFIG, LS_PERSONAS, LS_MEMORIES, LS_DIARIES, LS_ANNIVERSARIES, LS_FAVORITES, LS_REMINDERS, LS_BOOKMARKS, LS_ROOMS, LS_SESSIONS, LS_MOMENTS, DEFAULT_PERSONAS } from './consts.js'
import { config, personas, memories, diaries, anniversaries, favorites, reminders, bookmarks, rooms, sessions, moments } from './state.js'

// ===== Low-level localStorage wrappers =====

export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) {
    console.error('[Storage] loadJSON failed for', key, e)
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.error('[Storage] saveJSON failed for', key, e.message)
    return false
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (e) {
    return false
  }
}

// ===== Domain-specific loaders (reads localStorage → populates state) =====

export function loadConfig() {
  const saved = loadJSON(LS_CONFIG)
  if (saved) {
    Object.assign(config, saved)
    // Apply defaults for missing fields
    if (config.apiProvider === undefined) config.apiProvider = 'deepseek'
    if (config.openrouterKey === undefined) config.openrouterKey = ''
    if (config.openrouterModel === undefined) config.openrouterModel = 'anthropic/claude-sonnet-4.6'
    if (config.customBaseUrl === undefined) config.customBaseUrl = ''
    if (config.customApiKey === undefined) config.customApiKey = ''
    if (config.customModel === undefined) config.customModel = ''
    if (config.theme === undefined) config.theme = 'abyss'
    if (config.autoSync === undefined) config.autoSync = false
    if (config.lastSyncTime === undefined) config.lastSyncTime = 0
    if (config.visionEnabled === undefined) config.visionEnabled = false
    if (config.visionBaseUrl === undefined) config.visionBaseUrl = ''
    if (config.visionApiKey === undefined) config.visionApiKey = ''
    if (config.visionModel === undefined) config.visionModel = ''
    if (config.deepThink === undefined) config.deepThink = false
    if (config.userAvatar === undefined) config.userAvatar = ''
    if (config.userName === undefined) config.userName = ''
    if (config.claudeKey === undefined) config.claudeKey = ''
    if (config.claudeModel === undefined) config.claudeModel = 'claude-sonnet-5-20251001'
  }
}

export function saveConfig() {
  try {
    localStorage.setItem(LS_CONFIG, JSON.stringify(config))
  } catch (e) {
    if (config.chatBg) {
      config.chatBg = ''
      try { localStorage.setItem(LS_CONFIG, JSON.stringify(config)) } catch (e2) { }
    }
  }
}

export function loadPersonas() {
  const saved = loadJSON(LS_PERSONAS)
  if (saved && saved.length) {
    personas.length = 0
    personas.push(...saved)
  } else {
    personas.length = 0
    personas.push(...JSON.parse(JSON.stringify(DEFAULT_PERSONAS)))
  }
  // Ensure chatHistory + reactions exist
  personas.forEach(p => {
    if (!p.chatHistory) p.chatHistory = []
    p.chatHistory.forEach(m => { if (!m.reactions) m.reactions = {} })
  })
}

export function savePersonas() {
  localStorage.setItem(LS_PERSONAS, JSON.stringify(personas))
}

export function loadMemories() {
  const saved = loadJSON(LS_MEMORIES, [])
  memories.length = 0
  memories.push(...saved)
}

export function saveMemories() {
  localStorage.setItem(LS_MEMORIES, JSON.stringify(memories))
}

export function loadDiaries() {
  const saved = loadJSON(LS_DIARIES, [])
  diaries.length = 0
  diaries.push(...saved)
}

export function saveDiaries() {
  localStorage.setItem(LS_DIARIES, JSON.stringify(diaries))
}

export function loadAnniversaries() {
  const saved = loadJSON(LS_ANNIVERSARIES, [])
  anniversaries.length = 0
  anniversaries.push(...saved)
}

export function saveAnniversaries() {
  localStorage.setItem(LS_ANNIVERSARIES, JSON.stringify(anniversaries))
}

export function loadFavorites() {
  const saved = loadJSON(LS_FAVORITES, [])
  favorites.length = 0
  favorites.push(...saved)
}

export function saveFavorites() {
  localStorage.setItem(LS_FAVORITES, JSON.stringify(favorites))
}

export function loadReminders() {
  const saved = loadJSON(LS_REMINDERS, [])
  reminders.length = 0
  reminders.push(...saved)
}

export function saveReminders() {
  localStorage.setItem(LS_REMINDERS, JSON.stringify(reminders))
}

export function loadBookmarks() {
  const saved = loadJSON(LS_BOOKMARKS, [])
  bookmarks.length = 0
  bookmarks.push(...saved)
}

export function saveBookmarks() {
  localStorage.setItem(LS_BOOKMARKS, JSON.stringify(bookmarks))
}

export function loadRooms() {
  const saved = loadJSON(LS_ROOMS, [])
  rooms.length = 0
  rooms.push(...saved)
}

export function saveRooms() {
  localStorage.setItem(LS_ROOMS, JSON.stringify(rooms))
}

export function loadSessions() {
  const saved = loadJSON(LS_SESSIONS, [])
  sessions.length = 0
  sessions.push(...saved)
}

export function saveSessions() {
  localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions.slice(-5)))
}

export function loadMoments() {
  const saved = loadJSON(LS_MOMENTS, [])
  moments.length = 0
  moments.push(...saved)
}

export function saveMoments() {
  localStorage.setItem(LS_MOMENTS, JSON.stringify(moments))
}

// ===== Bulk operations =====

/** 加载所有数据到 state */
export function loadAll() {
  loadConfig()
  loadPersonas()
  loadMemories()
  loadDiaries()
  loadAnniversaries()
  loadFavorites()
  loadReminders()
  loadBookmarks()
  loadRooms()
  loadSessions()
  loadMoments()
  if (!config.activePersonaId || !personas.find(p => p.id === config.activePersonaId)) {
    config.activePersonaId = personas[0]?.id || 'shendu'
    saveConfig()
  }
}

/** 导出全部数据为 JSON 对象 */
export function exportAll() {
  return {
    version: 'v10',
    exportedAt: new Date().toISOString(),
    config: {
      apiProvider: config.apiProvider,
      activePersonaId: config.activePersonaId,
      userAvatar: config.userAvatar,
      userName: config.userName
    },
    personas: personas.map(p => ({ ...p, chatHistory: p.chatHistory || [] })),
    memories,
    diaries,
    anniversaries,
    favorites,
    reminders
  }
}

/** 导入 JSON 备份 */
export function importAll(data) {
  if (!data.version) throw new Error('格式不对')
  if (data.personas) { personas.length = 0; personas.push(...data.personas) }
  if (data.memories) { memories.length = 0; memories.push(...data.memories) }
  if (data.diaries) { diaries.length = 0; diaries.push(...data.diaries) }
  if (data.anniversaries) { anniversaries.length = 0; anniversaries.push(...data.anniversaries) }
  if (data.favorites) { favorites.length = 0; favorites.push(...data.favorites) }
  if (data.reminders) { reminders.length = 0; reminders.push(...data.reminders) }
  if (data.config?.activePersonaId) config.activePersonaId = data.config.activePersonaId
  if (data.config?.userAvatar) config.userAvatar = data.config.userAvatar
  if (data.config?.userName) config.userName = data.config.userName
  savePersonas(); saveMemories(); saveDiaries(); saveAnniversaries()
  saveFavorites(); saveReminders(); saveConfig()
}

/** 清空所有数据 */
export function clearAll() {
  personas.length = 0
  personas.push(...JSON.parse(JSON.stringify(DEFAULT_PERSONAS)))
  memories.length = 0
  diaries.length = 0
  anniversaries.length = 0
  favorites.length = 0
  reminders.length = 0
  config.activePersonaId = 'shendu'
  config.userAvatar = ''
  config.userName = ''
  savePersonas(); saveMemories(); saveDiaries(); saveAnniversaries()
  saveFavorites(); saveReminders(); saveConfig()
}
