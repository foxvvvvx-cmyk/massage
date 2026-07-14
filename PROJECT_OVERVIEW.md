# AI Virtual Phone（小手机）— 项目全貌

> 一份给 AI 助手快速上手的项目说明文档。最后更新：2026-07-14。

---

## 1. 项目定位

**AI Virtual Phone** 是一个"AI 角色扮演桌面系统"——模拟手机主屏幕，每个 App 图标对应一个内容模块（聊天、游戏、日记、朋友圈、小红书等）。用户创建 AI 角色（Character），在不同 App 中与角色互动。角色拥有统一的人设、记忆、情感状态，跨 App 共享上下文。

仓库：[github.com/xiaolongbao0709/ai-virtual-phone](https://github.com/xiaolongbao0709/ai-virtual-phone)

---

## 2. 技术栈

| 层 | 选型 |
|---|---|
| **前端框架** | Next.js 15.1（App Router）+ React 19 |
| **语言** | TypeScript 5.7 |
| **样式** | Tailwind CSS 4 + 全局 CSS（`app/globals.css`）+ 模块化 CSS（`styles/*.css`） |
| **本地存储** | IndexedDB（Dexie.js 封装 `chat-db.ts`）+ 自定义 KV store（`kv-db.ts`） |
| **云端数据库** | Supabase（PostgreSQL，REST API 直连） |
| **云端存储** | Supabase Storage（备份、游戏素材、验证图片） |
| **LLM 接入** | 自研 Provider Adapter 统一层，支持 10+ 厂商 |
| **认证** | 自建账号系统（Supabase `app_users` 表 + session token） |
| **部署** | Netlify（`netlify.toml`） |
| **构建** | `next build` + 自定义 post-build 脚本 |

---

## 3. 目录结构

```
ai-virtual-phone/
├── app/                    # Next.js App Router（页面 + API 路由）
│   ├── api/                # API 路由（game-hall, checkphone 等）
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 入口页
├── components/             # React 组件
│   ├── game/               # 游戏大厅组件
│   ├── settings/           # 设置面板组件
│   ├── desktop-shell.tsx   # ★ 主桌面 Shell，管理所有 App 的挂载
│   ├── phone-chat-app.tsx  # ★ 聊天 App 主组件
│   └── main-app.tsx        # 应用入口
├── lib/                    # ★ 核心业务逻辑（200+ 模块）
│   ├── chat-engine.ts      # 聊天引擎（组装 prompt → 调 LLM → 处理响应）
│   ├── llm-prompt-assembler.ts # Prompt 组装器（宏替换/世界书/记忆注入）
│   ├── llm-provider-adapter.ts # LLM Provider 适配层
│   ├── memory-*.ts         # 记忆系统（7 个模块）
│   ├── resonance-*.ts      # 共鸣引擎（情感状态模拟）
│   ├── character-*.ts      # 角色管理
│   ├── settings-*.ts       # 配置/预设/世界书/绑定系统
│   ├── game-*.ts           # 游戏大厅系统
│   ├── *-storage.ts        # 各模块的持久化层
│   └── *-types.ts          # 各模块的类型定义
├── public/                 # 静态资源
│   ├── game-builtins/      # 内置游戏 HTML（斗地主/真心话/大富翁）
│   ├── game-covers/        # 游戏封面图
│   └── fonts/              # 字体文件
├── styles/                 # CSS 样式
│   └── game.css            # 游戏大厅专用样式（~4500 行）
├── docs/                   # 文档 + SQL schema 文件
├── supabase/               # Supabase 迁移脚本
├── tools/                  # 辅助脚本
└── scripts/                # 构建/开发脚本
```

---

## 4. 核心功能清单

### 4.1 聊天对话系统

**关键文件**：`lib/chat-engine.ts`（~2600 行）、`lib/llm-prompt-assembler.ts`（~2600 行）、`lib/llm-provider-adapter.ts`（~930 行）

**运作方式**：
1. 用户在聊天 App 发消息 → `generateChatCompletion()`
2. `buildChatPromptMessages()` 组装完整 prompt：角色人设 + 世界书 + 记忆 + 日历 + 上下文 + 工具定义
3. `buildProviderRequest()` 根据绑定的 API 配置，生成对应厂商格式的请求体（OpenAI/Anthropic/Gemini）
4. `sendLLMStreamRequest()` 发送 SSE 流式请求
5. 响应经正则过滤、工具调用解析、动作分发后返回给用户

**支持的 LLM 厂商**（`lib/api-helpers.ts:16-29`）：
OpenAI / Anthropic / Google / DeepSeek / Groq / OpenRouter / Moonshot / Zhipu / SiliconFlow / TogetherAI / Custom

**Provider 适配**（`lib/llm-provider-adapter.ts`）：
- 单一文件通过 `LlmProviderKind`（`"openai-compatible" | "anthropic" | "gemini"`）分发
- Anthropic：`system` 顶层字段、`x-api-key` header、`content_block_delta` / `thinking_delta` SSE 解析、`tool_use` 块
- Gemini：`systemInstruction`、URL-encoded API key、`functionDeclarations`
- 其余：OpenAI 兼容格式 `/chat/completions`

### 4.2 角色系统

**关键文件**：`lib/character-types.ts`、`lib/character-storage.ts`

**数据结构**：
```typescript
Character {
  id, name, avatar, persona, briefPersona, personality,
  timeZone, tags, createdAt, updatedAt,
  canvasX, canvasY, canvasRot, canvasZIndex  // 桌面画布位置
}
```

- 角色存储在 IndexedDB（`kv-db.ts` 的 `ai_phone_characters_v1` key）
- 支持 JSON/PNG 导入导出（角色卡嵌入 PNG `tEXt` chunk）
- 角色可绑定独立的 API 配置、预设（Preset）、世界书（World Book）、正则规则（Regex）
- `briefPersona`：LLM 生成的 100-200 字压缩摘要，注入到同世界其他角色的上下文中防 OOC

### 4.3 记忆系统（详见第 5 节）

### 4.4 Jiwen 主动引擎（积温引擎）

**关键文件**：`lib/jiwen-engine.ts`、`lib/jiwen-config.ts`、`lib/jiwen-bridge.ts`

五维情感状态机，建模角色的"主动意识"——决定角色何时主动联系用户。

**状态维度**：
| 维度 | 范围 | 含义 |
|---|---|---|
| `connection` | 0~1 | 连接需求（想念程度），沉默时增长 |
| `pride` | -1~+1 | 骄傲（负=开放，正=端着） |
| `valence` | -1~+1 | 愉悦度 |
| `arousal` | -1~+1 | 唤醒度（负=平静，正=兴奋） |
| `immersion` | 0~1 | 沉浸度（做其他事的专注程度） |

**核心 API**：`tick()` / `applyInteraction()` / `checkThreshold()` / `getStyleGuidance()`

### 4.5 共鸣引擎（Resonance Engine）★ 新建

**关键文件**：`lib/resonance-engine.ts`（~250 行）、`lib/resonance-storage.ts`（~138 行）

**与 Jiwen 引擎的关系**：两个引擎建模相似的情感维度但有不同侧重。Jiwen 偏向"主动联系触发"（更激进的 connection 增长和衰减），Resonance 偏向"细腻的情感状态追踪"（引入克制度 restraint、软性情绪检测 getSentiment、cool-down 保护）。当前两者并行存在，**未来可能需要合并或明确分工**。

**五维状态**：
| 维度 | 范围 | 与 Jiwen 差异 |
|---|---|---|
| `connection` | 0~1 | 增长更慢（0.005 vs 0.007），回复衰减更小（0.06 vs 0.20） |
| `restraint` | 0~1 | ★ 独有。高时阻止主动联系，受第三方提及影响 |
| `valence` | -1~+1 | 受 `getSentiment()` 轻量关键词检测驱动（Jiwen 依赖外部传入 sentiment） |
| `arousal` | -1~+1 | 相同 |
| `immersion` | 0~1 | 相同 |

**运作方式**：见前文——每次 AI 回复后 fire-and-forget 更新，状态存 IndexedDB。

### 4.6 记忆热度/衰减 ★ 新建

**关键文件**：`lib/memory-types.ts`、`lib/memory-storage.ts`、`lib/memory-service.ts`

**新增字段**：`MemoryEntry.usageCount`（引用次数）、`MemoryEntry.lastRetrievedAt`（上次被检索时间）

**运作方式**：
- `heatScore()`：`usageCount × 2` + 24h 内被用过 `+4` / 72h 内 `+2`
- 三种检索策略都融入热度：
  - 策略 1（全量）：热度排序
  - 策略 2（向量）：70% 相似度 + 30% 热度归一化
  - 策略 3（无向量）：热度排序替代原来的"最新优先"
- 检索后 fire-and-forget 调用 `markMemoriesRetrievedAsync()` 更新计数

### 4.7 TTS / STT 语音

**关键文件**：`lib/tts-service.ts`、`lib/stt-service.ts`

- TTS：文字转语音，支持多厂商（与 LLM 共享 API 配置体系）
- STT：语音转文字，支持流式识别
- 配置独立于 LLM（`VoiceApiConfig` 类型）

### 4.8 图片识别 / 生成

**关键文件**：`lib/image-generation-service.ts`、`lib/generated-image-retry.ts`

- Vision：聊天中发送图片时，通过 `enableVision` 开关将图片转为 `image_url` content part 发给 LLM
- 图片生成：通过独立 API 配置生成图片，支持角色参考图
- `enableImageRecognition` 控制是否将 LLM 生成的图片注入后续对话

### 4.9 游戏大厅

**关键文件**：`components/game/game-hub-app.tsx`（~3100 行）、`lib/game-types.ts`、`lib/game-storage.ts`、`lib/game-builtins.ts`

- 三 Tab：游戏大厅（发现）/ 创作工坊 / 我的（收藏柜）
- 内置游戏：欢乐斗地主、真心话大冒险、**涩涩大富翁**（新建）
- 社区游戏通过 Supabase `game_hall_games` 表发布/安装
- 游戏以独立 HTML 文件在 iframe 中运行，通过 `window.AiPhoneGame` postMessage 桥接与宿主通信
- 桥接 API：`listAvailableCharacters()` / `callLLM()` / `recordGameEvent()` / `saveGame()` / `loadGame()` 等

### 4.10 朋友圈（Moments）

**关键文件**：`lib/moments-engine.ts`、`lib/moments-storage.ts`、`lib/moments-types.ts`

角色自动发朋友圈、互相评论/点赞。用户也可以手动发。

### 4.11 日记（手记）

**关键文件**：`lib/diary-entry-engine.ts`、`lib/diary-entry-storage.ts`、`lib/diary-entry-utils.ts`

角色自动写日记（AI 生成），用户可手动添加。支持早晨/午后/夜晚三个时段标签和心情 emoji。

### 4.12 群聊

**关键文件**：`lib/group-chat-engine.ts`、`lib/group-admin.ts`

多角色群聊，每个角色独立发言。支持群管理功能。

### 4.13 世界书（World Book / Lore）

**关键文件**：在 `lib/settings-types.ts` 中定义（`WorldBookEntry`、`WorldBookConfig`）

类似 SillyTavern 的世界书机制。通过关键词/正则匹配激活条目，注入到 prompt 的指定位置。支持概率激活（`useProbability`）和角色绑定。

### 4.14 日历 / 纪念日

**关键文件**：`lib/calendar-engine.ts`、`lib/calendar-storage.ts`

角色的时间感知系统。支持纪念日提醒、日程安排。角色知道自己所处的时间（时区感知）。

### 4.15 配置绑定系统

**关键文件**：`lib/settings-storage.ts`（~1000 行）、`lib/settings-types.ts`

三级配置继承：全局默认 → 角色默认 → App 级别覆盖。每个 Content App（聊天/游戏/日记等）和每个角色可以绑定不同的 API 配置、预设、世界书、正则规则。

### 4.16 其他模块速览

| 模块 | 关键文件 | 说明 |
|---|---|---|
| **音乐** | `music-service.ts`, `music-storage.ts` | 网易云音乐集成，角色有音乐上下文 |
| **阅读** | `reading-engine.ts`, `reading-parser.ts` | EPUB/文本阅读器 |
| **剧情/VN** | `vn-engine.ts`, `vn-storage.ts` | 视觉小说引擎 |
| **共创** | `cocreate-engine.ts`, `cocreate-memory.ts` | 协作创作 |
| **小红书** | `xiaohongshu-engine.ts`, `xiaohongshu-memory.ts` | 角色自动生成小红书风格内容 |
| **购物** | `shopping-engine.ts`, `shopping-storage.ts` | 角色购物车/支付系统 |
| **Dwelling** | `dwelling-engine.ts` | 角色居住环境上下文 |
| **Checkphone** | `checkphone-engine.ts` | Steam 游戏《Checkphone》集成 |
| **Mascot** | `mascot-engine.ts`, `mascot-context.tsx` | 桌面吉祥物 |
| **自定义 App** | `custom-app-*.ts` | 用户可创建自定义小程序 |
| **黑市** | `black-market-*.ts` | 角色间的影子经济系统 |
| **便签墙** | `notewall-*.ts` | 全局协作便签 |
| **面试杂志** | `interview-magazine-*.ts` | 角色访谈 |
| **微信桥接** | `weixin-bridge.ts`, `weixin-cloud-sync.ts` | 微信公众号集成 |
| **好友请求** | `friend-request-engine.ts` | 角色间好友申请 |
| **Widget** | `widget-storage.ts`, `widget-types.ts` | 桌面小组件 |
| **RPG/地图** | `map-rpg-engine.ts`, `map-storage.ts` | 地图冒险模式 |
| **宏引擎** | `macro-engine.ts` | `{{char}}` / `{{user}}` 等 60+ 宏替换 |
| **工具系统** | `tool-executor.ts`, `tool-storage.ts` | 原生 Function Calling + 文本工具调用 |
| **Token 计数** | `token-counter.ts` | 轻量 token 估算 |
| **API 日志** | `chat-engine.ts` 中 `API_LOGS_KEY` | 请求/响应调试日志 |

---

## 5. 记忆系统详细说明

### 5.1 数据存储

**本地**：IndexedDB 数据库 `ai_phone_memory_db_v1`

```
Store: memories（keyPath: "id"）
索引: by_character / by_character_type / by_character_created
```

**MemoryEntry 结构**：
| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 如 `"mem_lt_1234567890_abc123"` |
| `characterId` | string | 所属角色 |
| `sourceApp` | ContentAppId | 来源 App（"chat"/"moments"/"story"等） |
| `type` | `"long_term" \| "core"` | 记忆层级 |
| `content` | string | 记忆文本（一句话事实） |
| `embedding` | number[]? | 可选向量嵌入 |
| `importance` | number | 0~1（long_term=0.8, core=0.95） |
| `usageCount` | number? | ★ 被检索引用次数（热度追踪，新建） |
| `lastRetrievedAt` | string? | ★ 上次被检索时间（新建） |
| `sourceMessageIds` | string[]? | 来源消息 ID |
| `metadata` | Record? | 扩展元数据（如 `summarizedEvents`, `timeSpan`） |
| `createdAt` / `updatedAt` | string (ISO) | 时间戳 |

**云端**：Supabase `memories` 表（通过 `memories-sync.ts` 同步，与沈度项目共享）

### 5.2 记忆三层架构

```
短期事件流 (Short-term / Event Log)
  ├─ 来源：聊天消息、朋友圈、VN 场景、故事、日记、便签墙、游戏事件等
  ├─ 由 short-term-assembler.ts 的 loadNativeTimeline() 组装
  └─ 控制：shortTermTokenBudget（默认 100,000 tokens）
        │
        │ 每 N 个事件触发一次（summarizationEventInterval，默认 80）
        ▼
长期记忆 (Long-term)
  ├─ 由 memory-summarizer.ts 的 runSummarizationPipeline() 生成
  ├─ LLM 调用，使用可编辑的 summarizationPrompt 模板
  ├─ 可选生成向量嵌入（embedding）
  ├─ 上限：maxLongTermEntries（默认 500），超出删除最旧
  └─ 存储：IndexedDB
        │
        │ 每 N 条长期记忆触发一次（coreSummarizationInterval，默认 5）
        ▼
核心记忆 (Core Memory)
  ├─ 由 core-memory-builder.ts 的 runCoreMemoryPipeline() 生成
  ├─ 只保留最关键的关系定义事实（在一起/分手/结婚/纪念日等）
  ├─ 上限：coreMemoryTokenBudget（默认 100,000 tokens）
  └─ 存储：IndexedDB（type: "core"）
```

### 5.3 记忆检索与注入

**时机**：每次 `buildChatPromptMessages()` 组装 prompt 时并行调用。

**检索策略**（`lib/memory-service.ts:18-93`）：

| 策略 | 条件 | 排序方式 |
|---|---|---|
| 1 | 总 token ≤ budget | 热度排序（新建） |
| 2 | 超 budget + 有向量嵌入 API | 70% 余弦相似度 + 30% 热度归一化 |
| 3 | 超 budget + 无向量 | 热度排序（原为"最新优先"） |

**注入位置**：`llm-prompt-assembler.ts` 的 `memoryLongTerm` / `memoryCore` marker → XML 包裹的 bullet list。

### 5.4 自动提取（独立路径）

`memory-extractor.ts`：每 8 条用户消息触发一次 → LLM 提取用户事实 → 分类为"关于ta/约定/喜好/其他" → 推送到 Supabase `memories` 表（与 IndexedDB 记忆系统独立）。

---

## 6. 状态管理模式

项目**不使用 Redux 或 Zustand**。采用以下自研模式：

1. **KV Store**（`lib/kv-db.ts`）：Dexie.js IndexedDB 封装，内存 Map 缓存，同步读取。用于配置、角色等"类设置"数据。
2. **专用 IndexedDB**（`lib/chat-db.ts` / `lib/memory-storage.ts` / `lib/resonance-storage.ts`）：消息/记忆/共鸣状态等"大数据量"存储。
3. **模块级单例缓存**：各 `*-storage.ts` 模块维护自己的 `_cache` 变量。
4. **跨组件通信**：`window.dispatchEvent(new CustomEvent(...))`（如 `ai-phone-game-updated`、`settings-bindings-updated`）。
5. **React Context**：仅少数场景（`account-context.tsx`、`mascot-context.ts`、`music-context.tsx`）。

---

## 7. 最近新增（2026-07-14）

### 7.1 共鸣引擎（从沈度移植）

- `lib/resonance-engine.ts`：五维情感状态纯计算引擎
- `lib/resonance-storage.ts`：IndexedDB 持久化
- `lib/chat-engine.ts`：在消息回复完成后自动更新 resonance（fire-and-forget）

### 7.2 记忆热度/衰减

- `lib/memory-types.ts`：`MemoryEntry` 新增 `usageCount`、`lastRetrievedAt`
- `lib/memory-storage.ts`：新增 `markMemoriesRetrieved()` / `markMemoriesRetrievedAsync()`
- `lib/memory-service.ts`：`heatScore()` + `sortByHeat()`，三种检索策略都融入热度

### 7.3 涩涩大富翁内置游戏

- `public/game-builtins/spicy-monopoly.html`：完整独立游戏 HTML（~25KB）
- `lib/game-builtins.ts`：注册为第 3 个内置游戏 `builtin_game_spicy_monopoly`
- API 后端：`https://spicy-monopoly.lol`（公开托管实例）
- 内置安全机制：404 紧急停止、红线查看、任务跳过/换题

---

## 8. 关联项目：沈度 (Shendu)

**仓库**：[github.com/foxvvvvx-cmyk/massage](https://github.com/foxvvvvx-cmyk/massage)

**定位**：研发试验田——纯 vanilla JS 单页应用，在 Vercel 部署。用于快速验证新想法，验证通过后移植到小手机。

**最近从沈度移植到小手机的模块**：
- 共鸣引擎（resonance.js → resonance-engine.ts）
- 记忆热度/衰减（scoreMemory/markMemoriesUsed → heatScore/markMemoriesRetrieved）

**沈度独有、尚未移植的功能**：
- 吃醋阈值/风格（jealousyLevel/jealousyStyle）
- 密码锁屏
- 触觉皮肤（Buttplug 玩具控制桥接）
- TTS ElevenLabs 集成
- 视觉模型代理（千问 VL / GPT-4V）

---

## 9. 当前已知问题 / 待办

### 9.1 待完成

- [ ] **Jiwen 与 Resonance 引擎重叠**：两个引擎建模相似的情感维度（connection/valence/arousal/immersion），但参数和语义不同。Jiwen 用 `pride`，Resonance 用 `restraint`。两者并行运行，每次用户消息后各自独立更新。**需要合并或明确分工**，避免维护两套相似逻辑
- [ ] **Resonance UI（Phase 4/5）**：引擎和存储已就绪，React 组件（ResonanceCard、ResonanceIndicator）尚未编写
- [ ] **Resonance 定时 tick**：当前只在加载时根据 lastTick 差值 tick，没有周期性后台 tick
- [ ] **spicy-monopoly 端到端测试**：游戏 HTML 已编写但未在实际环境中完整跑过一局
- [ ] **涩涩大富翁封面图**：当前使用内联 SVG data URL，无独立 webp 文件
- [ ] **记忆热度长期观察**：热度系统刚上线，需要观察 70/30 混合权重是否合理
- [ ] **沈度仓库 3 个本地 commit 未推送**（`96839ec` / `5ac27ff` / `edee638`），push 被安全分类器阻断

### 9.2 架构注意事项

- `buildChatPromptMessages` 返回类型是推断的而非显式声明——新增字段时需要注意解构
- `generateNativeChatCompletion` 没有独立的事件计数/摘要触发（与外层共享 `generateChatCompletion` 的 fire-and-forget 块，但 native 路径提前 return，不会执行外层代码——目前在本函数内部单独加了一份 resonance 调用，但增量事件计数和摘要检查在 native 路径仍然缺失）
- IndexedDB 数据库版本管理采用 `openIndexedDbAtLeast()` 弹性策略（支持 restore 后版本高于代码常量的场景）

### 9.3 Content App ID 完整列表

```
chat（聊天）
diary（手记）
music（音乐）
reading（阅读）
cocreate（共创）
story（剧情）
game（游戏）
xiaohongshu（小红书）
dwelling（居住）
checkphone（Checkphone）
shopping（购物）
calendar（日历）
interview_magazine（访谈杂志）
moments（朋友圈）
group_chat（群聊）
vn（视觉小说）
adventure（冒险）
```

---

## 10. 开发环境启动

```bash
npm install
npm run dev        # 开发模式（自定义 local-next-server）
npm run build      # 生产构建 + backdrop-filter 修复
```

需要配置 `.env.local`：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

API Key 等用户配置在应用内设置面板填写，不需要环境变量。
