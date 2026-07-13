/* ============================================
   app/utils.js — 纯工具函数（无副作用，不依赖状态）
   ============================================ */

/**
 * 快捷 document.getElementById
 */
export const $ = id => document.getElementById(id)

/**
 * HTML 转义
 */
export function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 格式化时间戳为完整时间字符串
 */
export function fmtTime(ts) {
  const d = new Date(ts)
  const w = ['日', '一', '二', '三', '四', '五', '六']
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' 周' + w[d.getDay()] + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}

/**
 * 格式化时间戳为简短日期+时间
 */
export function fmtDate(ts) {
  const d = new Date(ts)
  const p = n => n.toString().padStart(2, '0')
  return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

/**
 * 从时间戳提取日期 key (YYYY-M-D)
 */
export function dayKey(ts) {
  const d = new Date(ts)
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
}

/**
 * 根据时段返回标签
 */
export function timeOfDay(ts) {
  const h = new Date(ts).getHours()
  if (h < 6) return '夜晚'
  if (h < 12) return '早晨'
  if (h < 17) return '午后'
  return '夜晚'
}

/**
 * 根据当前时间返回问候语
 */
export function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了 🌙'
  if (h < 9) return '早安 ☀️'
  if (h < 12) return '上午好 🌤'
  if (h < 14) return '中午好 🌻'
  if (h < 18) return '下午好 🍃'
  if (h < 21) return '傍晚好 🌅'
  return '晚上好 🌙'
}

/**
 * 判断是否为桌面端（>= 900px）
 */
export function isDesktop() {
  return window.matchMedia('(min-width:900px)').matches
}

// ===== Markdown 简单渲染 =====
export function renderMD(text) {
  text = text.replace(/\[TOY:[^\]]+\]/gi, '') // 隐藏玩具控制标记
  let html = escHtml(text)
  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  html = html.replace(/\*(.+?)\*/g, '<i>$1</i>')
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>')
  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  // Line breaks
  html = html.replace(/\n/g, '<br>')
  return html
}

// ===== Avatar HTML helpers =====
export function avatarHTML(avatar) {
  if (!avatar) return '👤'
  if (avatar.startsWith('data:')) return `<img src="${escHtml(avatar)}" alt="">`
  return avatar
}

export function userAvatarHTML(config) {
  if (config.userAvatar && config.userAvatar.startsWith('data:')) return `<img src="${escHtml(config.userAvatar)}" alt="">`
  return config.userAvatar || '🧑'
}

export function aiAvatarHTML(persona) {
  if (persona.avatar && persona.avatar.startsWith('data:')) return `<img src="${escHtml(persona.avatar)}" alt="">`
  return persona.avatar || '🌙'
}

// ===== Image resizing helper =====
export function resizeImage(file, maxW, quality, callback) {
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = function (e) {
    const img = new Image()
    img.onload = function () {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      callback(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// ===== Thinking tag stripping =====
export function stripThinkingTags(text) {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/\[内心\][\s\S]*?\[\/内心\]/gi, '')
    .replace(/<response>|<\/response>/gi, '')
    .trim()
}

// ===== Debounce =====
export function debounce(fn, ms) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), ms)
  }
}

// ===== Clipboard fallback =====
export function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch (e) {
    return false
  }
}
