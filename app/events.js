/* ============================================
   app/events.js — 事件总线
   模块间松散通信，不直接互相调用
   事件名规范：domain:action (如 message:sent)
   ============================================ */

const listeners = {}

/**
 * 订阅事件
 * @param {string} event - 事件名
 * @param {Function} callback - 回调函数
 */
export function on(event, callback) {
  if (!listeners[event]) listeners[event] = []
  listeners[event].push(callback)
}

/**
 * 取消订阅
 * @param {string} event - 事件名
 * @param {Function} callback - 要移除的回调（必须是同一个引用）
 */
export function off(event, callback) {
  if (!listeners[event]) return
  listeners[event] = listeners[event].filter(cb => cb !== callback)
}

/**
 * 发布事件
 * @param {string} event - 事件名
 * @param {*} data - 事件数据
 */
export function emit(event, data) {
  if (!listeners[event]) return
  for (const cb of listeners[event]) {
    try { cb(data) } catch (e) { console.error('[EventBus]', event, e) }
  }
}

// === 预定义事件名（文档用途，不影响运行时） ===
export const Events = {
  // Chat
  MESSAGE_SENT: 'message:sent',
  MESSAGE_RECEIVED: 'message:received',
  // Memory
  MEMORY_ADDED: 'memory:added',
  MEMORY_EXTRACTED: 'memory:extracted',
  AUTO_EXTRACT_MEMORY: 'auto:extract_memory',
  // Diary
  DIARY_CREATED: 'diary:created',
  AUTO_EXTRACT_DIARY: 'auto:extract_diary',
  // Reminder
  REMINDER_TRIGGERED: 'reminder:triggered',
  // Config & Persona
  CONFIG_CHANGED: 'config:changed',
  PERSONA_SWITCHED: 'persona:switched',
  PERSONA_SAVED: 'persona:saved',
  // UI
  FAVORITE_TOGGLED: 'favorite:toggled',
  UNREAD_CHANGED: 'unread:changed',
  BALANCE_NEED_UPDATE: 'balance:need_update',
  STATUS_MESSAGE: 'status:message',
  IMAGES_CLEARED: 'images:cleared',
  TAB_SWITCHED: 'tab:switched',
  // Social
  MOMENT_ADDED: 'moment:added',
  GROUP_MSG_SENT: 'group:msg_sent',
  // Toy
  TOY_CONNECTED: 'toy:connected',
  TOY_DISCONNECTED: 'toy:disconnected',
  // TTS
  TTS_FINISHED: 'tts:finished',
  // App
  APP_UNLOCKED: 'app:unlocked',
  // Resonance Engine
  RESONANCE_TICK: 'resonance:tick',
  RESONANCE_INTERACTION: 'resonance:interaction',
  RESONANCE_CONTACT_READY: 'resonance:contact_ready',
  RESONANCE_MOOD_CHANGED: 'resonance:mood_changed'
}
