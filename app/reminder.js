/* ============================================
   app/reminder.js — 提醒 & 纪念日 & 里程碑
   ============================================ */

import { reminders, anniversaries, config, personas, runtime } from './state.js'
import { saveReminders, saveAnniversaries } from './storage.js'
import { emit, Events } from './events.js'

// ===== Reminders =====

export function parseReminder(text) {
  const match = /【提醒：(.+?)】([\s\S]*?)【\/提醒】/.exec(text)
  if (!match) return null
  const timeStr = match[1].trim(), content = match[2].trim()
  let ms = 0
  if (/(\d+)\s*分钟后/.test(timeStr)) ms = parseInt(RegExp.$1) * 60000
  else if (/(\d+)\s*小时后/.test(timeStr)) ms = parseInt(RegExp.$1) * 3600000
  else if (/明天/.test(timeStr)) ms = 86400000
  else if (/今晚/.test(timeStr)) { const n = new Date(); n.setHours(20, 0, 0, 0); ms = n - Date.now(); if (ms < 0) ms += 86400000 }
  else return null
  return { content, triggerAt: Date.now() + ms, createdAt: Date.now() }
}

export function scheduleReminder(r) {
  const delay = r.triggerAt - Date.now()
  if (delay <= 0) return
  const id = r.createdAt + '_' + Math.random().toString(36).slice(2, 6)
  runtime.reminderTimers[id] = setTimeout(() => {
    emit(Events.REMINDER_TRIGGERED, r)
    const idx = reminders.findIndex(x => x.createdAt === r.createdAt)
    if (idx >= 0) { reminders.splice(idx, 1); saveReminders() }
  }, delay)
}

export function restoreReminders() {
  if ('Notification' in window && Notification.permission === 'default') { Notification.requestPermission() }
  reminders.forEach(r => { if (r.triggerAt > Date.now()) scheduleReminder(r) })
}

export function addReminder(r) { reminders.push(r); saveReminders(); scheduleReminder(r) }

export function cancelReminder(ts) {
  const idx = reminders.findIndex(r => r.createdAt === ts)
  if (idx >= 0) { reminders.splice(idx, 1); saveReminders() }
  Object.keys(runtime.reminderTimers).forEach(k => {
    if (k.startsWith(ts + '_')) { clearTimeout(runtime.reminderTimers[k]); delete runtime.reminderTimers[k] }
  })
}

// ===== Anniversaries =====

export function detectAndSaveAnniversary(text) {
  const patterns = [/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/g, /(\d{1,2})月(\d{1,2})[日号]/g]
  let found = null
  for (const re of patterns) {
    let m; while ((m = re.exec(text)) !== null) {
      const dateStr = m[0]
      if (!anniversaries.some(a => a.name.includes(dateStr) || a.date === dateStr)) { found = dateStr; break }
    }
    if (found) break
  }
  if (found) { anniversaries.push({ id: Date.now(), name: '自动检测 · ' + found, date: found }); saveAnniversaries() }
}

export function addAnniversaryManual(name, date) {
  anniversaries.push({ id: Date.now(), name, date })
  saveAnniversaries()
}

export function deleteAnniversary(id) {
  const idx = anniversaries.findIndex(a => a.id === id)
  if (idx >= 0) { anniversaries.splice(idx, 1); saveAnniversaries() }
}

/** 获取即将到来的纪念日（7天内） */
export function getUpcomingAnniversaries() {
  const now = new Date()
  return anniversaries.filter(a => {
    const d = new Date(a.date)
    const nxt = new Date(now.getFullYear(), d.getMonth(), d.getDate())
    if (nxt < now) nxt.setFullYear(nxt.getFullYear() + 1)
    return Math.ceil((nxt - now) / 86400000) <= 7
  })
}

// ===== Milestones =====

export function getCurrentMilestone() {
  const allMsgs = []
  personas.forEach(p => { if (p.chatHistory) allMsgs.push(...p.chatHistory) })
  const total = allMsgs.filter(m => m.role === 'user' || m.role === 'assistant')
  if (!total.length) return null
  const days = Math.max(1, Math.ceil((Date.now() - total[0].ts) / 86400000))
  const msgs = total.length
  const milestones = []
  if (days >= 365) milestones.push(days + '天')
  else if (days >= 100 && days % 100 < 3) milestones.push(days + '天')
  else if (days === 30 || days === 60 || days === 90) milestones.push(days + '天')
  if (msgs >= 10000) milestones.push('一万条消息')
  else if (msgs >= 1000 && msgs % 1000 < 50) milestones.push(msgs + '条消息')
  return milestones.length ? '在一起 ' + milestones[0] : null
}

// Note: Idle greeting is implemented in app/index.js (needs access to UI functions)
