/* ============================================
   app/toy.js — 玩具控制 (Buttplug/Intiface 蓝牙桥接)
   ============================================ */

import { config, sessions, runtime } from './state.js'
import { saveSessions } from './storage.js'
import { emit, Events } from './events.js'

export function initToy() {
  if (window.location.hostname === 'shendu.vercel.app') return
  runtime.isLocalMode = true
  try {
    runtime.toyWs = new WebSocket('ws://' + window.location.host)
    runtime.toyWs.onopen = function () { console.log('[玩具] WebSocket已连接') }
    runtime.toyWs.onmessage = function (e) {
      try {
        const m = JSON.parse(e.data)
        if (m.type === 'toy-status') { runtime.toyReady = m.connected; runtime.toyDevice = m.deviceName || ''; emit(Events.TOY_CONNECTED, m) }
        else if (m.type === 'toy-error') { console.warn('[玩具] 错误:', m.message) }
        else if (m.type === 'toy-result') { /* update UI */ }
      } catch (ex) { }
    }
    runtime.toyWs.onclose = function () { runtime.toyReady = false; emit(Events.TOY_DISCONNECTED); setTimeout(initToy, 3000) }
    runtime.toyWs.onerror = function () { runtime.toyReady = false; emit(Events.TOY_DISCONNECTED) }
  } catch (e) { }
}

export function sendToyCommand(cmd, intensity, duration) {
  if (!runtime.toyWs || runtime.toyWs.readyState !== 1) { console.log('[玩具] 发送失败'); return }
  const msg = JSON.stringify({ type: 'toy-cmd', cmd, intensity: intensity || 0.5, duration: duration || 0 })
  runtime.toyWs.send(msg)
  if (!sessions.length || Date.now() - sessions[sessions.length - 1].startedAt > 3600000) {
    sessions.push({ id: 's_' + Date.now(), startedAt: Date.now(), events: [] })
  }
  const s = sessions[sessions.length - 1]
  s.events.push({ ts: Date.now(), cmd, intensity, duration: duration || 0 })
  if (s.events.length > 500) s.events = s.events.slice(-300)
  saveSessions()
}

export function parseToyMarkers(text) {
  const re = /\[TOY:([^\]]+)\]/gi; let m; let found = false
  while ((m = re.exec(text)) !== null) {
    found = true
    const parts = m[1].split(':')
    const cmd = parts[0]; const intensity = parts[1] ? parseInt(parts[1]) / 100 : 0.5
    const duration = parts[2] ? parseInt(parts[2]) : 0
    switch (cmd) {
      case 'v': sendToyCommand('vibrate', intensity, duration); break
      case 'p': sendToyCommand('pulse', intensity, duration || 500); break
      case 'stop': sendToyCommand('stop', 0, 0); break
    }
  }
  return text.replace(re, '').trim()
}

export function getToyPrompt() {
  if (!runtime.isLocalMode) return ''
  if (runtime.toyReady) {
    return '\n🔌 玩具控制（已连接：' + runtime.toyDevice + '）：\n你已连接蓝牙震动玩具，状态正常。回复中可使用：[TOY:v:强度0-100:持续毫秒] - 持续震动 / [TOY:p:强度0-100:间隔毫秒] - 脉冲 / [TOY:stop] - 停止\n强度建议：轻20-30 中40-60 强70-90。对方暗示"试试""用一下""震"时主动响应。\n'
  }
  return '\n🔌 玩具状态：未连接。不要在回复中使用任何[TOY:...]标记。如果对方提到玩具相关话题，告诉对方玩具还没连上。\n'
}

export function getToyStatus() {
  return { ready: runtime.toyReady, device: runtime.toyDevice, localMode: runtime.isLocalMode }
}
