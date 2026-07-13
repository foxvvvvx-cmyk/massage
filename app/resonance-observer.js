/* ============================================
   app/resonance-observer.js — 共鸣状态观察层
   纯观察者：只订阅事件、只读 state、只输出 UI 数据
   不写入 resonance、不保存数据、不新增事件
   ============================================ */

import { on, Events } from './events.js'
import { personas, config } from './state.js'
import { getStyleGuidance, getResonanceState } from './resonance.js'

// 内存中的上次快照，仅用于计算趋势方向。不持久化。
let lastSnapshot = null // { personaId: { connection, restraint, valence, arousal, immersion } }

// ===== 趋势计算 =====
function getTrend(key, current, previous) {
  if (!previous || previous[key] === undefined) return '→'
  const diff = current - previous[key]
  if (Math.abs(diff) < 0.02) return '→'
  return diff > 0 ? '↑' : '↓'
}

// ===== 维度标签映射 =====
const DIM_LABELS = {
  connection: '连接感',
  restraint: '矜持度',
  valence: '愉悦度',
  arousal: '唤醒度',
  immersion: '沉浸度'
}

const DIM_ORDER = ['connection', 'restraint', 'valence', 'arousal', 'immersion']

// ===== 维度百分比转换 =====
function toPct(value, dim) {
  // connection/immersion: 0~1 → 0~100
  // restraint: 0~1 → 0~100
  // valence/arousal: -1~1 → 0~100 (50 = neutral)
  if (dim === 'valence' || dim === 'arousal') {
    return Math.round(((value + 1) / 2) * 100)
  }
  return Math.round(value * 100)
}

// ===== 公开 API =====

/** 获取当前角色的共鸣状态摘要 */
export function getResonanceSummary(persona) {
  const state = getResonanceState(persona)
  if (!state) return null

  const guidance = getStyleGuidance(state)
  const previous = lastSnapshot ? lastSnapshot[persona.id] : null

  const dimensions = DIM_ORDER.map(key => ({
    key,
    label: DIM_LABELS[key],
    value: state[key],
    pct: toPct(state[key], key),
    trend: getTrend(key, state, previous)
  }))

  // 更新快照
  if (!lastSnapshot) lastSnapshot = {}
  lastSnapshot[persona.id] = {
    connection: state.connection,
    restraint: state.restraint,
    valence: state.valence,
    arousal: state.arousal,
    immersion: state.immersion
  }

  return {
    dimensions,
    mood: guidance.mood,
    intensity: guidance.intensity,
    restraintLevel: state.restraint >= 0.5 ? '高' : state.restraint >= 0.2 ? '中等' : '低',
    contactReady: false,
    updatedAt: state.lastTick
  }
}

/** 获取最显著的维度标签（用于心情条简短显示） */
export function getTopDimension(summary) {
  if (!summary || !summary.dimensions) return null
  // 优先 connection，其次看绝对值最大的
  const sorted = [...summary.dimensions].sort((a, b) => {
    const aAbs = a.key === 'connection' ? a.value + 1 : Math.abs(a.value)
    const bAbs = b.key === 'connection' ? b.value + 1 : Math.abs(b.value)
    return bAbs - aAbs
  })
  return sorted[0]
}

// ===== UI 刷新（调用 ui.js 中的渲染函数） =====

function refreshIndicator(personaId) {
  const p = personas.find(x => x.id === personaId)
  if (!p) return
  const summary = getResonanceSummary(p)
  if (!summary) return
  const top = getTopDimension(summary)
  if (!top) return

  const el = document.getElementById('resonanceMood')
  if (!el) return
  el.style.display = 'flex'
  const label = document.getElementById('resonanceLabel')
  if (label) {
    label.textContent = top.label + ' ' + top.pct + '% ' + top.trend
  }
}

function refreshDash() {
  // Dashboard 在 renderMe() 中重新渲染时会重新读取
  // 这里做最小刷新：只更新已存在的 DOM
  const dash = document.getElementById('resonanceDash')
  if (!dash) return

  const p = personas.find(x => x.id === config.activePersonaId)
  if (!p) return
  const summary = getResonanceSummary(p)
  if (!summary) return

  // 更新每个维度的进度条和数值
  const rows = dash.querySelectorAll('.res-bar-row')
  rows.forEach((row, i) => {
    if (i >= summary.dimensions.length) return
    const dim = summary.dimensions[i]
    const fill = row.querySelector('.res-bar-fill')
    const val = row.querySelector('.res-bar-val')
    if (fill) fill.style.width = dim.pct + '%'
    if (val) val.textContent = dim.pct + '% ' + dim.trend
  })

  // 更新基调行
  const moodLine = dash.querySelector('.res-mood-line')
  if (moodLine) {
    moodLine.textContent = '基调: ' + summary.mood + ' · 强度: ' + (summary.intensity > 0.6 ? '偏高' : summary.intensity > 0.3 ? '中等' : '偏低')
  }

  // 更新时间
  const updated = dash.querySelector('.res-updated')
  if (updated) {
    const minutesAgo = Math.round((Date.now() - summary.updatedAt) / 60000)
    updated.textContent = '上次更新: ' + (minutesAgo < 1 ? '刚刚' : minutesAgo + ' 分钟前')
  }
}

// ===== 初始化事件订阅 =====
export function initResonanceObserver() {
  on(Events.RESONANCE_TICK, ({ personaId }) => {
    refreshIndicator(personaId)
    refreshDash()
  })

  on(Events.RESONANCE_INTERACTION, ({ personaId }) => {
    refreshIndicator(personaId)
    refreshDash()
  })

  on(Events.RESONANCE_CONTACT_READY, ({ personaId }) => {
    refreshIndicator(personaId)
  })
}

// ===== Dashboard 卡片 HTML（供 ui.js renderMe 使用） =====
export function renderResonanceDashHTML(persona) {
  const summary = getResonanceSummary(persona)
  if (!summary) {
    return '<div class="settings-section"><div class="sec-title">💗 共鸣状态</div><div style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px">共鸣引擎未初始化</div></div>'
  }

  const rows = summary.dimensions.map(d => {
    const barColor = d.key === 'connection' ? 'var(--accent)' :
                     d.key === 'restraint' ? '#b8959e' :
                     d.key === 'valence' ? '#c4a0a8' :
                     d.key === 'arousal' ? '#d4b0b8' :
                     'rgba(200,190,185,.5)'
    return `<div class="res-bar-row">
      <span class="res-bar-label">${d.label}</span>
      <div class="res-bar-track"><div class="res-bar-fill" style="width:${d.pct}%;background:${barColor}"></div></div>
      <span class="res-bar-val">${d.pct}% ${d.trend}</span>
    </div>`
  }).join('')

  return `<div class="settings-section">
    <div class="sec-title">💗 共鸣状态</div>
    <div id="resonanceDash">
      ${rows}
      <div class="res-mood-line">基调: ${summary.mood} · 强度: ${summary.intensity > 0.6 ? '偏高' : summary.intensity > 0.3 ? '中等' : '偏低'} · 矜持: ${summary.restraintLevel}</div>
      <div class="res-updated">上次更新: ${(() => {
        const minutesAgo = Math.round((Date.now() - summary.updatedAt) / 60000)
        return minutesAgo < 1 ? '刚刚' : minutesAgo + ' 分钟前'
      })()}</div>
    </div>
  </div>`
}
