# Phase 3-3: Resonance Observation Layer — 设计文档

> 版本：v1.0  
> 状态：待确认  
> 基线：v13.2-resonance-freeze  
> 约束：不修改 resonance.js / provider / memory / persona 数据结构 / 行为逻辑

---

## 一、设计目标

为 Resonance Engine 增加**只读观察能力**。Observer 订阅引擎已有事件，将五维状态转化为可视信息，但不影响引擎计算、不影响对话行为、不修改任何现有数据结构。

---

## 二、不变量（禁止修改项）

| # | 不变量 | 说明 |
|---|---|---|
| 1 | `resonance.js` | 不修改核心计算逻辑 |
| 2 | `provider.js` | 不修改 |
| 3 | `memory.js` | 不修改 |
| 4 | `persona` 数据结构 | `persona.resonance` 结构不变，只读取 |
| 5 | 行为逻辑 | Observer 只读不写，不触发 tick/interaction/contact |
| 6 | 对话流程 | `send()` 不受影响 |

---

## 三、新增模块：`app/resonance-observer.js`

```
职责：订阅 RESONANCE_* 事件 → 读取 persona.resonance.state → 格式化 → 输出 UI 更新数据
性质：纯观察者，零副作用（不写 state，不写 storage，不 emit 新事件）
```

### 3.1 导出函数

```javascript
// 获取当前角色的共鸣状态摘要
getResonanceSummary(persona) → {
  dimensions: [
    { key: 'connection', label: '连接感', value: 0.45,   pct: 45,  trend: '↑' },
    { key: 'restraint',  label: '矜持度', value: 0.20,   pct: 20,  trend: '↓' },
    { key: 'valence',    label: '愉悦度', value: 0.30,   pct: 65,  trend: '→' },
    { key: 'arousal',    label: '唤醒度', value: -0.15,  pct: 42,  trend: '→' },
    { key: 'immersion',  label: '沉浸度', value: 0.10,   pct: 10,  trend: '↓' }
  ],
  mood: 'warm',
  intensity: 0.45,
  restraintLevel: '低',
  contactReady: false,
  updatedAt: 1700000000000
}

// 获取历史趋势（最近 N 次 tick 的快照，来自 interactions 记录）
getResonanceHistory(persona, count = 10) → [{ ts, connection, restraint, valence, arousal, immersion }]

// 格式化维度值为显示文本
formatDimension(dim) → "45% ↑"

// 获取单个维度的趋势方向（对比上次 tick）
getTrend(current, previous) → '↑' | '↓' | '→'
```

### 3.2 事件订阅

Observer 订阅以下已有事件（不新增事件）：

```javascript
on(Events.RESONANCE_TICK, ({ personaId }) => {
  // 更新 UI：心情条中的共鸣指示器
  refreshResonanceIndicator(personaId)
})

on(Events.RESONANCE_INTERACTION, ({ personaId }) => {
  // 交互后刷新完整状态
  refreshResonanceIndicator(personaId)
})

on(Events.RESONANCE_CONTACT_READY, ({ personaId }) => {
  // 已在 index.js 处理 toast，Observer 更新指示器状态
  refreshResonanceIndicator(personaId)
})
```

### 3.3 内部状态（仅 Observer 持有）

```javascript
// 内存中的上次快照（用于计算趋势方向）
let lastSnapshot = null  // { personaId → { connection, restraint, valence, arousal, immersion } }

// 不持久化。页面刷新后趋势重置，不影响功能。
```

---

## 四、UI 展示方案

### 4.1 心情条增强（最小侵入）

在现有 `moodBar` 中新增第四个 `mood-item`：

**位置**：`index.html:52` 的 `moodBar` div 内，`milestoneMood` 之后

**DOM 结构**：
```html
<span class="mood-item" id="resonanceMood" style="display:none" onclick="openDrawer()">
  💗 <span id="resonanceLabel">连接 45%</span>
</span>
```

**显示规则**：
- 显示当前最显著的维度（connection 优先，其次 valence）
- 格式：`💗 连接 45%` 或 `💙 愉悦 65%`
- 每 10 分钟 tick 后或交互后自动刷新
- 始终显示（不同于 jealousy/milestone 的条件显示）

**CSS**：复用现有 `.mood-item` 样式，不新增 CSS。

### 4.2 数据看板增强（Dashboard "dash" section）

在 Dashboard 中新增 "共鸣状态" 卡片，位于纪念日 section 之前。

**位置**：`renderMe()` 的 `section === 'dash'` 分支，`upcoming` 纪念日 HTML 之前

**UI 布局**：
```
┌─────────────────────────────────┐
│ 💗 共鸣状态                     │
│                                 │
│ 连接感  ████████░░  45%  ↑     │
│ 矜持度  ███░░░░░░░  20%  ↓     │
│ 愉悦度  █████████░  65%  →     │
│ 唤醒度  ████░░░░░░  42%  →     │
│ 沉浸度  ██░░░░░░░░  10%  ↓     │
│                                 │
│ 基调: warm · 强度: 中等         │
│ 上次更新: 2 分钟前              │
└─────────────────────────────────┘
```

**DOM 结构**：
```html
<div class="settings-section">
  <div class="sec-title">💗 共鸣状态</div>
  <div id="resonanceDash">
    <!-- 每个维度一行 -->
    <div class="res-bar-row">
      <span class="res-bar-label">连接感</span>
      <div class="res-bar-track">
        <div class="res-bar-fill" style="width:45%;background:var(--accent)"></div>
      </div>
      <span class="res-bar-val">45% ↑</span>
    </div>
    <!-- ... 共 5 行 -->
    <div class="res-mood-line">基调: warm · 强度: 中等</div>
    <div class="res-updated">上次更新: 2 分钟前</div>
  </div>
</div>
```

**显示规则**：
- 仅对**当前活跃角色**显示
- 如果 persona 没有 resonance 数据（`!persona.resonance`），显示 "共鸣引擎未初始化"
- 不显示历史趋势图（Phase 1 仅当前快照）

### 4.3 CSS 新增（最小，仅 4 个类）

```css
/* 共鸣状态条 */
.res-bar-row { display:flex; align-items:center; gap:6px; margin:3px 0; font-size:11px }
.res-bar-label { width:40px; color:var(--text-muted); text-align:right; flex-shrink:0 }
.res-bar-track { flex:1; height:6px; background:rgba(255,255,255,.06); border-radius:3px; overflow:hidden }
.res-bar-fill { height:100%; border-radius:3px; transition:width .5s var(--ease-soft) }
.res-bar-val { width:42px; font-size:10px; color:var(--text-soft); flex-shrink:0 }
.res-mood-line { font-size:10px; color:var(--text-muted); text-align:center; margin-top:4px }
.res-updated { font-size:9px; color:var(--text-muted); text-align:center; margin-top:2px; opacity:.6 }
```

**总计：约 8 行 CSS**，全部新增，不修改现有样式。

---

## 五、事件监听方案

```
                    RESONANCE_TICK
                    RESONANCE_INTERACTION
                    RESONANCE_CONTACT_READY
                         │
                         ▼
              ┌─────────────────────┐
              │ resonance-observer  │
              │  (只读，纯观察)      │
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    心情条指示器    Dashboard卡片    (预留：通知)
   refreshIndicator refreshDash
```

**数据流**：
1. Event 触发 → Observer 读取 `persona.resonance.state`
2. Observer 调用 `getStyleGuidance(state)` 获取 mood/intensity
3. Observer 对比 `lastSnapshot` 计算 trend
4. Observer 更新 `lastSnapshot`
5. Observer 调用 UI 更新函数（`updateResonanceIndicator` / `updateResonanceDash`）

**不新增事件**：使用已有的 RESONANCE_TICK / RESONANCE_INTERACTION / RESONANCE_CONTACT_READY。

---

## 六、修改文件清单

| 文件 | 变更类型 | 行数估计 | 说明 |
|---|---|---|---|
| `app/resonance-observer.js` | **新文件** | ~110 行 | Observer 模块 |
| `app/ui.js` | 修改 | +40 行 | 新增 `updateResonanceIndicator()`、`renderResonanceDash()`；`updateMoodBar()` 中调用 indicator 刷新；`renderMe()` dash section 中插入共鸣卡片 |
| `app/index.js` | 修改 | +5 行 | 导入 observer + 在 init 中初始化订阅 |
| `index.html` | 修改 | +1 行 | moodBar 中新增 `resonanceMood` span |
| `style.css` | 修改 | +8 行 | 新增 `.res-bar-*` 样式 |

**不修改的文件**：
```
resonance.js    — 不变
provider.js     — 不变
memory.js       — 不变
persona.js      — 不变
chat.js         — 不变
prompt.js       — 不变
events.js       — 不变
storage.js      — 不变
state.js        — 不变
consts.js       — 不变
```

---

## 七、与现有系统的共存

| 现有功能 | 影响 | 说明 |
|---|---|---|
| moodBar 心情条 | 新增第四个 indicator | 与 mood/jealousy/milestone 并列，不冲突 |
| Dashboard | 新增 section | 插入在 "本周消息" 与 "纪念日" 之间 |
| switchTab | 无影响 | 切换到 dash 时自动渲染最新 resonance 快照 |
| 角色切换 | 无影响 | 切换角色后 observer 读取新角色的 resonance 状态 |

---

## 八、风险分析

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| Observer 与 engine 循环触发 | 低 | 中 | Observer 只订阅、不 emit，不存在反馈回路 |
| 频繁 UI 刷新（每次 tick） | 低 | 低 | tick 间隔最小 1 分钟，UI 更新仅操作几个 DOM 节点 |
| persona 无 resonance 数据 | 中 | 低 | `migrateOldData()` 已处理；Observer 读取前检查 `persona.resonance` 存在性 |
| Dashboard 渲染时 observer 未初始化 | 低 | 低 | Dashboard 每次 `renderMe()` 时重新读取，不依赖 Observer 状态 |
| lastSnapshot 内存占用 | 低 | 低 | 仅存 1 个角色的上一个快照（5 个数字），可忽略 |
| HTML 新增 span 影响现有 CSS 布局 | 低 | 低 | moodBar 使用 flexbox，新增 span 自动排列 |

---

## 九、开发顺序

| 步骤 | 文件 | 内容 |
|---|---|---|
| 1 | `app/resonance-observer.js` | 创建 Observer 模块 |
| 2 | `index.html` | moodBar 新增 `#resonanceMood` span |
| 3 | `style.css` | 新增 8 行 `.res-bar-*` 样式 |
| 4 | `app/ui.js` | `updateMoodBar()` 调用 indicator 刷新；`renderMe()` dash 新增卡片 |
| 5 | `app/index.js` | 导入 observer，init 中初始化订阅 |

**总计：~165 行新增，0 行删除。**

---

> 请确认设计。确认后开始编码。
