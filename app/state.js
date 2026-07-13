/* ============================================
   app/state.js — 全局可变状态
   所有需要跨模块共享的状态集中管理
   用 ES Module 单例模式，import 即获得同一份引用
   注意：对象/数组可以跨模块 mutate，但基本类型不行
   所以基本类型 runtime state 放 runtime 对象里
   ============================================ */

import { defaultConfig } from './consts.js'

// === Config (mutable object — safe to mutate from any module) ===
export const config = defaultConfig()

// === Data collections (mutable arrays — safe to push/splice from any module) ===
export const personas = []
export const memories = []
export const diaries = []
export const anniversaries = []
export const favorites = []
export const reminders = []
export const bookmarks = []
export const rooms = []
export const sessions = []
export const moments = []

// === Runtime state (must be in a mutable object for cross-module writes) ===
export const runtime = {
  balanceCache: null,
  isGenerating: false,
  isExtracting: false,
  autoExtractCount: 0,
  unlocked: false,
  unreadCount: 0,
  lastMsgDay: '',
  lastSummarizedAt: 0,
  syncing: false,

  // UI state
  memCatFilter: 'all',
  diaryFilter: 'all',
  diaryMood: '😊',
  editPersonaId: null,
  confirmCb: null,
  ctxTarget: null,
  reactTarget: null,
  editTarget: null,
  pendingImages: [],
  searchResults: [],
  searchIdx: -1,
  activeRoomId: null,
  moodRange: 7,
  meSection: 'settings',
  inputHistory: [],
  inputHistIdx: -1,
  reminderTimers: {},
  deferredPrompt: null,

  // Toy control
  toyWs: null,
  toyReady: false,
  toyDevice: '',
  isLocalMode: false,
}

// === DOM references (set after DOM ready) ===
export const dom = {}
