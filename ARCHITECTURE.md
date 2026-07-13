# 沈度 (Shendu) — 架构文档 v13

> 第一阶段重构完成。目标：提升可维护性，为后续 Claude Pro、MCP、长期记忆、多模型接入做准备。

---

## 1. 新目录结构

```
d:\shendu\
├── index.html              # 入口 HTML（改用 <script type="module">）
├── style.css               # 样式（未修改）
├── server.js               # 本地服务器（未修改）
├── sw.js                   # Service Worker（更新缓存列表）
├── manifest.json           # PWA（未修改）
├── api/tts.js              # TTS 后端（未修改）
│
├── app.js                  # ★ 原始单文件（保留作参考，不再使用）
│
├── app/                    # ★ 新模块化代码
│   ├── index.js            # 入口 & 初始化（init/load/migration/event wiring）
│   ├── consts.js           # 全局常量（API URL、LS key、prompt 文本、默认角色）
│   ├── state.js            # 全局可变状态（config、数据集合、运行时状态）
│   ├── events.js           # 事件总线（on/off/emit + 事件名常量）
│   ├── storage.js          # 存储抽象层（load/save/export/import，封装 localStorage）
│   ├── utils.js            # 纯工具函数（escHtml、fmtTime、renderMD、avatarHTML等）
│   │
│   ├── provider.js         # Provider 抽象层（Base → DeepSeek/OpenRouter/Custom + Vision）
│   ├── prompt.js           # Prompt 构建器（各 section + buildPrompt() 组合器）
│   │
│   ├── chat.js             # 聊天核心（send/流式渲染/消息分段/搜索/收藏）
│   ├── memory.js           # 记忆系统（CRUD/自动提取/关键词匹配/云端同步）
│   ├── diary.js            # 日记系统（CRUD/AI生成/自动提取/心情分析）
│   ├── persona.js          # 角色管理（CRUD/切换/历史摘要/导出）
│   ├── reminder.js         # 提醒 & 纪念日 & 里程碑
│   ├── moments.js          # 朋友圈（发帖/AI自动互动/评论/点赞）
│   ├── rooms.js            # 群聊房间（创建/发送/多角色依次回复）
│   ├── toy.js              # 玩具控制（WebSocket桥接/TOY标记解析）
│   └── ui.js               # UI 渲染（设置面板/抽屉/Dashboard/Toast/锁屏/导航）
│
├── PROJECT_OVERVIEW.md     # 项目功能文档（给 AI 助手上手用）
├── ARCHITECTURE.md         # 本文档
└── package.json            # Node 依赖
```

---

## 2. 模块职责

### 基础层（无业务逻辑）

| 模块 | 职责 | 被依赖方 |
|---|---|---|
| `consts.js` | 所有常量：API URL、localStorage key、prompt 文本、默认角色列表 | 所有模块 |
| `state.js` | 可变状态容器：`config`（对象）、数据集合（数组）、`runtime`（运行时基本类型） | 所有模块 |
| `events.js` | 发布订阅：`on(event, cb)` / `emit(event, data)` / `off(event, cb)` | chat, memory, diary, ui |
| `storage.js` | 封装 localStorage：`loadJSON/saveJSON/removeKey` + 各领域 `load*/save*` + `exportAll/importAll/clearAll` | 所有需要持久化的模块 |
| `utils.js` | 纯函数：`escHtml`/`fmtTime`/`fmtDate`/`dayKey`/`renderMD`/`avatarHTML`/`resizeImage`/`stripThinkingTags` | chat, ui, memory, diary |

### 服务层（有业务逻辑，无 DOM）

| 模块 | 职责 | 关键导出 |
|---|---|---|
| `provider.js` | API 调用统一接口 | `getProvider()` → `{getConfig(), fetchBalance()}`、`getActiveApiKey()`、`describeImages()` |
| `prompt.js` | System prompt 拼接 | `buildPrompt(persona, userMessage, injectedMemories)` → 完整 system prompt 字符串 |

### 领域层（业务逻辑 + 数据）

| 模块 | 职责 | 关键导出 |
|---|---|---|
| `chat.js` | 聊天核心 | `send()`、`renderAllMessages()`、`appendMsgEl()`、`toggleThinking()`、`searchMessages()`、`toggleFavorite()` |
| `memory.js` | 记忆系统 | `getRelevantMemories()`、`extractMemoriesFromChat()`、`addMemory()`、`syncMemoriesToCloud()` |
| `diary.js` | 日记系统 | `askAiDiaryDraft()`、`extractDiarySilent()`、`analyzeMoodTrend()`、`addDiary()` |
| `persona.js` | 角色管理 | `activePersona()`、`activeHistory()`、`autoSummarizeHistory()`、`switchPersona()` |
| `reminder.js` | 提醒/纪念日 | `parseReminder()`、`addReminder()`、`scheduleReminder()`、`getCurrentMilestone()` |
| `moments.js` | 朋友圈 | `addMoment()`、`autoInteractMoment()`、`likeMoment()`、`commentMoment()` |
| `rooms.js` | 群聊 | `createRoom()`、`sendGroupMsg()`、`getActiveRoom()` |

### 表示层（DOM 操作）

| 模块 | 职责 | 关键导出 |
|---|---|---|
| `ui.js` | UI 渲染 | `renderDrawerPanel()`、`renderMe()`、`renderMemories()`、`renderDiary()`、`renderMoments()`、`renderGroupChat()`、`toast()`、`showConfirm()`、`setTheme()`、`switchTab()`、`fetchBalance()` |
| `toy.js` | 玩具 UI 桥接 | `initToy()`、`sendToyCommand()`、`parseToyMarkers()`、`getToyPrompt()` |

### 入口

| 模块 | 职责 |
|---|---|
| `index.js` | 导入所有模块 → 暴露函数到 `window` → 绑定事件 → 加载数据 → `init()` |

---

## 3. 调用关系图

```
index.html
  └─ app/index.js (入口)
       ├─ consts.js ──────────────────────────── (无依赖)
       ├─ state.js ───────────────────────────── (→ consts)
       ├─ events.js ──────────────────────────── (无依赖)
       ├─ storage.js ─────────────────────────── (→ consts, state)
       ├─ utils.js ───────────────────────────── (无依赖)
       │
       ├─ provider.js ────────────────────────── (→ state, consts)
       ├─ prompt.js ──────────────────────────── (→ state, consts)
       │
       ├─ toy.js ─────────────────────────────── (→ state, storage)
       │
       ├─ persona.js ─────────────────────────── (→ state, storage)
       ├─ memory.js ──────────────────────────── (→ state, storage, consts, provider, events)
       ├─ diary.js ───────────────────────────── (→ state, storage, provider, events)
       ├─ reminder.js ────────────────────────── (→ state, storage, events)
       ├─ moments.js ─────────────────────────── (→ state, storage, provider, events)
       ├─ rooms.js ───────────────────────────── (→ state, storage, provider, events)
       │
       ├─ chat.js ────────────────────────────── (→ state, storage, provider, prompt, memory, diary, persona, reminder, toy, utils, events)
       └─ ui.js ──────────────────────────────── (→ state, storage, provider, persona, utils, consts, events)
```

**无循环依赖**：所有依赖都是单向的。`state` → `consts` → 其他模块。领域模块互相不直接引用（通过事件通信）。

---

## 4. Provider 架构

```
                    ┌─────────────────┐
                    │   BaseProvider  │  (抽象基类)
                    │ getConfig()     │
                    │ fetchBalance()  │
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                  ▼
  ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
  │DeepSeekProvider│ │OpenRouter    │ │CustomProvider  │
  │                │ │Provider      │ │                │
  │ baseUrl:       │ │baseUrl:      │ │baseUrl:        │
  │ deepseek.com   │ │openrouter.ai │ │用户自定义URL    │
  │ model:         │ │model:        │ │model:          │
  │ deepseek-chat  │ │用户选择       │ │用户自定义       │
  └────────────────┘ └──────────────┘ └────────────────┘

  ┌─────────────────────────────────────────────────────┐
  │ getProvider() → 根据 config.apiProvider 返回实例      │
  │ getActiveApiKey() → 返回当前有效的 API Key           │
  │ describeImages() → 视觉模型代理（独立于聊天 Provider）│
  └─────────────────────────────────────────────────────┘
```

**新增 Provider 的方法**：
1. 在 `provider.js` 中添加 `class NewProvider extends BaseProvider`
2. 实现 `getConfig()` 和 `fetchBalance()`
3. 在 `providers` 字典中注册
4. `send()` 和所有其他 API 调用无需修改

---

## 5. Prompt 架构

```
buildPrompt(persona, userMessage, injectedMemories)
  │
  ├─ buildTimeSection()          → "现在是 2026年7月..."
  ├─ buildCoreRules()            → 【核心原则】①诚实 ②防幻觉...
  ├─ buildSegmentRule()          → 【重要】请用 ||| 分隔...
  ├─ buildThinkingFormat()       → 【思考格式】<thinking>...
  ├─ buildPersonaSection(p)      → persona.systemPrompt
  ├─ buildMemoryRulesSection()   → MEMORY_RULES 常量
  ├─ buildToySection()           → 玩具控制状态提示
  ├─ buildJealousySection(msg)   → 吃醋模式提示（条件性）
  └─ buildMemoryInjectSection()  → 【📋 记忆库】注入（条件性）
```

**新增 Prompt Section 的方法**：
1. 在 `prompt.js` 中添加新的 `buildXxxSection()` 函数
2. 在 `buildPrompt()` 中调用它
3. `send()` 无需修改

---

## 6. Storage 架构

```
┌────────────────────────────────────────────┐
│              StorageService                 │
│                                            │
│  底层（通用）:                              │
│    loadJSON(key) → JSON                    │
│    saveJSON(key, value) → boolean          │
│    removeKey(key)                          │
│                                            │
│  领域层（类型安全）:                         │
│    loadConfig() / saveConfig()             │
│    loadPersonas() / savePersonas()         │
│    loadMemories() / saveMemories()         │
│    loadDiaries() / saveDiaries()           │
│    ... (每种数据都有对应的 load/save)       │
│                                            │
│  批量操作:                                  │
│    loadAll()  — 启动时加载所有数据          │
│    exportAll() → JSON 备份对象              │
│    importAll(data) — 导入备份               │
│    clearAll() — 清空所有数据                │
└────────────────────────────────────────────┘
                    │
                    ▼
              localStorage
         (浏览器本地存储，Key 不变)
```

**迁移到 IndexedDB 的方法**：只需修改 `storage.js` 中的底层 `loadJSON/saveJSON` 实现，上层代码无需任何改动。

---

## 7. Event Bus

```
         ┌──────────────────────────────────┐
         │            Event Bus              │
         │                                  │
         │  on(event, callback)             │
         │  emit(event, data)               │
         │  off(event, callback)            │
         └──────────┬───────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
  chat.js       memory.js       ui.js
  emit:         emit:           on:
  message:      memory:         memory:extracted
  received      extracted       → toast 提示
                → toast

预定义事件（Events 常量）:
  message:sent       message:received    memory:added
  memory:extracted   diary:created       reminder:triggered
  config:changed     persona:switched    persona:saved
  favorite:toggled   moment:added        group:msg_sent
  balance:updated    tts:finished        toy:connected
  toy:disconnected   app:unlocked        tab:switched
```

**跨模块通信规则**：
- 通过 `emit(event, data)` 发布事件
- 通过 `on(event, callback)` 订阅
- 禁止模块之间直接互相 import（除基础层外）

---

## 8. 兼容性保证

| 项目 | 状态 |
|---|---|
| localStorage Key | ✅ 所有 Key 保持不变（`sd_v5_*`） |
| JSON 数据结构 | ✅ 结构完全兼容，无需迁移 |
| UI 外观 | ✅ CSS 未修改，HTML 仅改了 `<script>` 标签 |
| API 调用 | ✅ Provider 接口封装了原有的逻辑，行为一致 |
| 聊天效果 | ✅ `send()` 流式渲染逻辑完整保留 |
| 老用户升级 | ✅ 直接刷新即可，无需操作 |
| 原有 app.js | ✅ 保留在根目录作参考，不再被加载 |

---

## 9. 后续建议（第二阶段开发计划）

### 9.1 积温引擎集成
- 将 `test-jiwen-engine.mjs` 的引擎逻辑移入 `app/jiwen.js`
- 在 `send()` 前后调用 `tick()` / `applyInteraction()`
- 在 `prompt.js` 中添加 `buildJiwenSection()` 注入风格指导
- 添加 jiwen 配置 UI（阈值、速率等）

### 9.2 TTS 前端集成
- 在 `ui.js` 中给 AI 消息气泡添加播放按钮
- 调用 `api/tts.js` 获取音频流
- 通过 Event Bus 管理播放状态

### 9.3 Claude Provider
- 在 `provider.js` 中新增 `ClaudeProvider extends BaseProvider`
- 支持 Anthropic Messages API（不同的请求/响应格式）
- 处理 Claude 的 content block 流式格式

### 9.4 MCP (Model Context Protocol) 集成
- 新增 `app/mcp.js` 模块管理 MCP 连接
- 在 `prompt.js` 中注入 MCP 工具描述
- 在 `send()` 中处理 tool_call 响应

### 9.5 长期记忆优化
- 在 `memory.js` 中接入向量数据库（如 Supabase pgvector）
- 语义搜索替代关键词匹配
- 记忆重要性评分和自动过期

### 9.6 构建工具
- 添加简单的构建脚本（模块合并/压缩）
- 或迁移到 Vite 获得 tree-shaking 和 HMR

### 9.7 测试
- 为每个模块添加单元测试
- 端到端测试聊天流程

### 9.8 IndexedDB 迁移
- 修改 `storage.js` 底层实现
- 支持更大的数据量存储
- 异步 API 适配
