# 沈度 (Shendu) / AI Virtual Phone — 项目说明文档

> **一句话概括**：一个面向移动端的纯前端 AI 伴侣聊天应用，多角色、多 API 提供商（默认 DeepSeek），带记忆系统、日记、朋友圈、群聊等社交模拟功能。视觉风格为"液态玻璃"（v12 樱语主题）。

---

## 1. 项目整体架构

### 1.1 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| **前端** | 纯 JavaScript (vanilla JS)，无框架 | 单文件 `app.js`（~1560 行，136KB），所有逻辑在一个文件里 |
| **样式** | 纯 CSS | 单文件 `style.css`（~580 行，52KB），CSS 变量驱动主题系统 |
| **HTML** | 静态 HTML | `index.html`（145 行），所有 UI 的 DOM 骨架 |
| **后端/服务器** | Node.js (HTTP + WebSocket) | `server.js`，仅用于本地开发（玩具控制桥接 + 静态文件服务） |
| **生产部署** | Vercel | 纯静态站点 + Serverless Functions |
| **数据库** | 无传统数据库 | 所有数据存储在 `localStorage`（浏览器端），可选 Supabase 云端同步 |
| **PWA** | Service Worker | `sw.js` 提供离线缓存，`manifest.json` 支持添加到主屏幕 |
| **API 接入** | 直连 LLM API | 支持三个 Provider：DeepSeek、OpenRouter、自定义 OpenAI 兼容接口 |

### 1.2 项目文件结构

```
d:\shendu\
├── index.html              # 主 HTML 文件 — 所有页面 DOM 结构
│                           #   包含5个页面：聊天、日记、记忆、设置、群聊、朋友圈
│                           #   还包含：模态框、上下文菜单、表情选择器、锁屏、图片灯箱等
│
├── app.js                  # ★ 核心文件 — 全部前端业务逻辑
│                           #   数据模型 · API 通信 · 流式渲染 · UI 渲染
│                           #   记忆系统 · 日记系统 · 朋友圈 · 群聊 · 提醒
│                           #   收藏 · 书签 · 搜索 · 玩具控制 · 设置管理
│
├── style.css               # ★ 全部样式 — 主题系统 · 液态玻璃效果 · 响应式布局
│                           #   支持3套主题：abyss（默认）、dark、noir
│                           #   CSS 变量驱动：颜色、圆角、字体、动画曲线
│
├── server.js               # 本地开发服务器
│                           #   HTTP 服务器（端口3000）+ WebSocket + Buttplug 玩具控制桥接
│                           #   用于本地开发时在 iPhone 上通过局域网访问
│
├── api/tts.js              # ElevenLabs TTS 语音合成代理（Vercel Serverless Function）
│                           #   接收 POST {text} → 返回 MP3 音频流
│                           #   目前后端就绪，前端尚未集成 TTS 播放 UI
│
├── sw.js                   # Service Worker — 离线缓存策略
│                           #   静态资源 cache-first，API 请求 network-first
│
├── manifest.json           # PWA Manifest — 应用名、图标、主题色
│
├── test-jiwen-engine.mjs   # 积温引擎纯数学验证（独立测试脚本，未集成到主应用）
│                           #   node test-jiwen-engine.mjs 运行
│
├── test-memories.mjs       # 记忆系统测试脚本
├── test-buttplug.js        # 玩具控制测试
├── test-intiface.js        # Intiface 连接测试
│
├── package.json            # Node 依赖：buttplug (玩具控制库), ws (WebSocket)
├── vercel.json             # Vercel 部署配置
├── start.sh / start.bat    # 启动脚本
└── README.md               # 项目简介（9 bytes，几乎空）
```

### 1.3 数据存储架构

所有用户数据存储在浏览器的 `localStorage` 中，通过 JSON 序列化。没有后端数据库（除非开启 Supabase 云端同步，仅同步记忆）。

**localStorage Key 清单**：

| Key | 内容 | 结构 |
|---|---|---|
| `sd_v5_config` | 全局配置 | API Key、Provider、主题、用户头像/昵称、吃醋设置、视觉模型设置等 |
| `sd_v5_personas` | 所有角色 + 各自的聊天记录 | `Persona[]`，每个角色内有 `chatHistory[]` |
| `sd_v5_memories` | 记忆条目 | `Memory[]` |
| `sd_v5_diaries` | 日记 | `Diary[]` |
| `sd_v5_anniversaries` | 纪念日 | `Anniversary[]` |
| `sd_v5_favorites` | 收藏消息 | `Favorite[]` |
| `sd_v5_reminders` | 提醒 | `Reminder[]`，含定时器触发 |
| `sd_v5_bookmarks` | 书签 | `Bookmark[]` |
| `sd_v5_rooms` | 群聊房间 | `Room[]`，每个房间有 `members[]` + `messages[]` |
| `sd_v5_sessions` | 玩具互动会话 | `Session[]`，含 replay 数据 |
| `sd_v5_moments` | 朋友圈 | `Moment[]` |

---

## 2. 核心功能清单

### 2.1 聊天对话（主功能）

**涉及文件**：[app.js](app.js) 全文件，尤其是 `send()` 函数（约 L1027-L1154）

**运作方式**：
- 每次对话前构建 system prompt（时间信息 + 角色人设 + 记忆规则 + 思考格式要求 + 玩具提示 + 吃醋提示 + 相关记忆注入）
- 取最近 50 条历史作为上下文（超过 50 条自动触发摘要压缩）
- 调用 API 以 **SSE 流式** 返回（`stream: true`）
- 流式内容实时渲染到聊天气泡中
- 回复完成后按 `|||` 分隔符或长文本自动切分为多个气泡（模拟真人连续发消息的感觉）

**回复分段机制**：
- System prompt 要求模型用 `|||` 分隔不同话题
- 如果模型没加 `|||` 但回复超过 80 字，自动按句子边界切成 2-3 段
- 每段以 800ms 随机间隔依次出现

**思考内容折叠**（新修复）：
- System prompt 要求模型用 `<thinking>...</thinking><response>...</response>` 格式
- 也支持 `[内心]...[/内心]` 中文标签
- 流式渲染期间自动隐藏思考内容，仅显示 "💭 Thinking..."
- 流式结束后将思考内容存入 `msg.reasoning`，渲染为可折叠的 `.thinking-wrap`
- 默认折叠，点击 "Thinking ▸" 展开

**关键函数**：
- `send()` — 主发送函数，构建请求 → 流式读取 → 渲染
- `appendMsgEl()` — 创建消息 DOM 行
- `buildMsgHTML()` — 构建消息气泡内部 HTML
- `renderMD()` — Markdown 渲染（粗体、斜体、代码块等）
- `toggleThinking()` — 切换思考内容折叠/展开

---

### 2.2 记忆系统

详细说明见第 3 节。

---

### 2.3 多角色切换

**涉及文件**：[app.js](app.js) L27（默认角色定义）、L337-L413（抽屉面板角色列表渲染）

**运作方式**：
- 内置 4 个默认角色：沈度（温柔）、Monday（暗黑艺术）、Butler（管家）、Nox（安静）
- 每个角色有独立的 `systemPrompt`、`chatHistory`、`model`、`temperature`、`topP`
- 切换角色 = 切换 `config.activePersonaId`，聊天记录完全隔离
- 支持自定义创建/编辑角色（侧栏面板 → 编辑）
- 可编辑角色头像（上传图片压缩为 200px base64）、人设文本、API 参数

**数据结构**：
```js
Persona {
  id: string,           // 如 'shendu'
  name: string,         // 显示名称
  avatar: string,       // emoji 或 base64 data URL
  description: string,  // 简短描述
  systemPrompt: string, // 人设系统提示词（核心）
  model: string,        // 模型名（如 'deepseek-chat'）
  temperature: number,  // 0-2
  topP: number,         // 0-1
  useReasoner: boolean, // 是否用 R1 推理模型
  chatHistory: Array    // 该角色的全部聊天记录
}
```

---

### 2.4 积温引擎（Jiwen Engine）

**状态**：✅ 引擎逻辑已完成并验证（`test-jiwen-engine.mjs`），❌ 尚未集成到主应用 `app.js` 中

**涉及文件**：[test-jiwen-engine.mjs](test-jiwen-engine.mjs)

**运作方式**（纯数学模拟情感状态）：
- 维护 5 个情感维度：`connection`（连接感）、`pride`（自尊）、`valence`（愉悦度）、`arousal`（唤醒度）、`immersion`（沉浸度）
- 每个维度随时间自动回归到 setpoint
- 用户交互（回复、延迟、情感倾向）影响这些维度
- 超过阈值时触发"主动联系"行为
- 输出风格指导（语气、情绪）供 AI 回复时参考

**保护条件**（防止骚扰用户）：
- 冷却时间：主动联系后 30 分钟内不再触发
- 每日上限：最多 8 条主动消息
- 用户活跃检测：5 分钟内有用户消息则不打扰
- Pride 阻止：自尊太高时触发 `find_activity` 而非 `contact`

---

### 2.5 TTS 语音合成

**状态**：⚠️ 后端就绪，前端尚未集成

**涉及文件**：[api/tts.js](api/tts.js)（Vercel Serverless Function）

**运作方式**：
- 接收 POST `{text, voiceId?}`
- 调用 ElevenLabs API（`eleven_multilingual_v2` 模型）
- 返回 MP3 音频流
- Voice ID 默认：`1qP1IT2KK9sfKcWA3KYf`
- 需要设置环境变量 `ELEVENLABS_API_KEY`

**待做**：在前端添加 TTS 播放按钮，调用 `/api/tts` 获取音频并播放

---

### 2.6 日记系统

**涉及文件**：[app.js](app.js) L1476-L1488（渲染）、L919-L964（AI 写日记）、L1155-L1180（静默日记提取）

**功能**：
- **手动写日记**：在日记页面输入文本 + 选择心情 emoji
- **AI 写日记**（`askAiDiaryDraft()`）：基于最近 30 条对话，AI 以第一人称写日记
  - 支持 Function Calling（`write_diary` 函数）或 tag 格式（`<diary>...</diary><mood>...</mood>`）
- **自动日记提取**（`extractDiarySilent()`）：每 15 轮对话自动触发，静默保存
- 按时间段筛选（早晨/午后/夜晚）
- AI 心情趋势分析：分析最近 30 天日记的心情变化

---

### 2.7 朋友圈（Moments）

**涉及文件**：[app.js](app.js) L492-L558

**功能**：
- 用户发朋友圈 → 3 秒后 AI 角色自动评论 + 点赞
- 其他 AI 角色也可能自动互动
- 支持点赞/评论/回复评论
- 评论可以"回复"跳转到聊天页面继续对话
- 评论回复触发 AI 自动回评

---

### 2.8 群聊

**涉及文件**：[app.js](app.js) L560-L603

**功能**：
- 创建群聊房间（选择 2+ 个 AI 角色）
- 用户发消息 → 每个角色依次回复（非流式，顺序执行）
- 构建叙述式上下文（"用户说：... 沈度说：... 现在轮到 Monday 说话了"）
- 群聊消息独立存储（在 `rooms[].messages`，不在角色聊天记录中）

---

### 2.9 吃醋系统

**涉及文件**：[app.js](app.js) L86-L93

**功能**：
- 检测用户消息中是否提到第三方人名
- 根据吃醋敏感度（0-100%）和风格（撒娇/傲娇/冷淡/幽默）注入系统提示
- 可视化：顶部心情条显示 🍋 醋意百分比

---

### 2.10 对话摘要压缩

**涉及文件**：[app.js](app.js) L605-L627

**运作方式**：
- 当聊天历史超过 50 条时自动触发
- 将前 30 条旧消息发送给 AI 做 3-5 句话摘要
- 摘要以系统消息形式保留在历史最前面
- 保留最近 20 条完整消息
- 两次摘要之间至少间隔 5 分钟

---

### 2.11 提醒功能

**涉及文件**：[app.js](app.js) L854-L892

**运作方式**：
- AI 回复中可用 `【提醒：时间】内容【/提醒】` 格式设置提醒
- 支持相对时间：X分钟后、X小时后、明天、今晚
- 通过 `setTimeout` 触发，支持页面刷新后恢复
- 触发时显示 toast + 浏览器 Notification

---

### 2.12 图片识别（新功能）

**涉及文件**：[app.js](app.js) L998-L1024（`describeImages`）、L1028-L1041（`send` 修改）、L1341-L1355（设置 UI）

**运作方式**：
- 用户在设置中启用后配置视觉模型 API（通义千问 VL / GPT-4V / 任意 OpenAI 兼容的多模态 API）
- 发送图片时，先将图片发送给视觉模型获取文字描述
- 描述以 `[图片内容：xxx]` 格式注入到 DeepSeek 的对话上下文中
- 视觉 API 调用失败时静默降级，不影响正常聊天

---

### 2.13 其他功能

| 功能 | 涉及位置 | 说明 |
|---|---|---|
| **收藏夹** | L967-L972, L1490-L1494 | 长按消息 → 收藏，AI 消息也可以收藏 |
| **书签** | L144-L152 | 为消息添加命名书签，可跳转 |
| **搜索** | L974-L987 | 全文搜索聊天记录，高亮匹配结果 |
| **消息编辑** | L739-L761 | 编辑已发送的用户消息 → 自动重新发送 |
| **表情反应** | L763-L778 | 消息加 emoji 反应（❤️😂😢😡👍🔥😍💀） |
| **消息删除** | L737 | 用户消息可以删除（删除该条及之后所有消息） |
| **对话导出** | L1424-L1443 | 导出为 JSON 备份、TXT 文本、CLAUDE.md 格式 |
| **空闲问候** | L463-L479 | 4 小时无消息后随机发送问候语，每 12h 最多一次 |
| **纪念日** | L481-L489 | 自动检测日期提及，记录纪念日，提前 7 天提醒 |
| **里程碑** | L421-L438 | 满 1000 条消息、100 天等里程碑提示 |
| **锁屏** | index.html L123-L129 | 6 位数字密码锁屏 |
| **夜间模式** | L439-L448 | 19:00-06:00 自动切暗色主题 |
| **玩具控制** | L35-L85, server.js | 本地蓝牙玩具控制（需要 Intiface Central + Buttplug） |
| **PWA** | sw.js, manifest.json | 离线缓存、添加到主屏幕 |
| **通知** | L1150-L1151 | 后台时浏览器通知 + 提示音 |
| **上下文菜单** | L712-L737 | 长按消息弹出：复制/编辑/收藏/表情/删除 |
| **余额查询** | L1170-L1210 | 查 DeepSeek/OpenRouter 余额，显示在状态栏 |
| **心情趋势图** | L1497-L1529 | 基于玩具互动会话的强度变化 Canvas 图 |

---

## 3. 记忆系统详细说明

### 3.1 数据存储结构

记忆存储在 `localStorage` 的 `sd_v5_memories` key 中，每条记忆的结构：

```js
Memory {
  id: number,           // 时间戳作为唯一 ID
  content: string,      // 记忆内容（一句话事实，不超过30字）
  category: string,     // 分类：'关于ta' | '约定' | '喜好' | '其他' | '默认'
  tags: string[],       // 标签数组，如 ['年龄', '北京']
  usageCount: number,   // 被引用次数
  lastUsed: number|null,// 上次被引用的时间戳
  source: 'manual'|'auto', // 来源：手动添加 或 AI 自动提取
  createdAt: number,    // 创建时间戳
  characterId: string   // 所属角色 ID（记忆按角色隔离）
}
```

### 3.2 Supabase 云端同步

**涉及文件**：[app.js](app.js) L210-L277

**数据库**：Supabase（`spqviscxskpgojvykybt.supabase.co`）

**表结构**（`memories` 表）：

| 字段 | 类型 | 对应 JS 字段 |
|---|---|---|
| `id` | int8 | `id` |
| `content` | text | `content` |
| `category` | text | `category` |
| `tags` | text (逗号分隔) | `tags` (array → CSV) |
| `usage_count` | int4 | `usageCount` |
| `last_used` | timestamptz | `lastUsed` |
| `source` | text | `source` |
| `created_at` | timestamptz | `createdAt` |
| `character_id` | text | `characterId` |

**同步逻辑**：
- 上传：删除云端同名 ID → POST 插入新数据（简易 upsert）
- 下载：GET 请求 + 按 `character_id` 过滤 → 合并到本地（跳过重复 ID）
- 可在设置中开启"自动同步"（每次存记忆时自动上传）

### 3.3 记忆提取（AI 自动）

**触发条件**：每 8 轮对话自动触发一次（`autoExtractCount >= 8`，见 L1152）

**提取流程**（`extractMemoriesFromChat()`，L828-L851）：

1. 取最近 20 条对话（用户 + AI）
2. 发送给 AI，system prompt 为 `MEMORY_EXTRACT_PROMPT`（L19）
3. AI 按格式返回：`分类｜事实内容｜标签1,标签2,标签3`
4. 解析每一行，去重（检查中文内容是否相似）
5. 新增记忆 → 存入 `memories[]`

**去重逻辑**（L845）：提取中文部分，做子串匹配。如果新事实的中文字符是已有记忆中文字符的子串（或反过来），则视为重复。

**也可以手动触发**：在记忆页面点击"🤖 从聊天中提取记忆"

### 3.4 记忆调用（上下文注入）

**触发条件**：每次发送消息时自动触发

**调用流程**（`getRelevantMemories()`，L811-L816）：

1. 用 `extractKeywords()` 从用户消息中提取中文关键词 + 英文单词 + 二元词组
2. 对每条记忆打分（`scoreMemory()`，L803-L810）：
   - 关键词匹配 content → +2
   - 关键词匹配 tags → +2
   - 关键词匹配 category → +1
   - 72 小时内引用过 → +1
3. 筛选 score ≥ 2 的记忆，取 Top 5
4. 通过 `buildMemoryInject()`（L818-L821）构建注入文本：
   ```
   【📋 记忆库 — 以下是你对用户的已知信息，请严格遵守】
   - 记忆内容1
   - 记忆内容2
   ...
   【以上为记忆库内容。这些是已知事实。不要编造、延伸、或假设未记录的信息。如果不确定，诚实说不知道。】
   ```
5. 这段注入文本拼接到 system prompt 中

**引用后**：`markMemoriesUsed()`（L822-L826）更新 `usageCount` 和 `lastUsed`

---

## 4. 当前已知问题 / 待办事项

### 4.1 已修复（本次更新）
- [x] ✅ 思考内容（`<thinking>` / `[内心]`）在流式渲染中的折叠显示
- [x] ✅ 思考标签解析支持更多变体（大小写、空白字符、中文标签）
- [x] ✅ `buildMsgHTML` 安全兜底 — 残留 thinking 标签不再泄露到 UI
- [x] ✅ 图片识别代理 — 支持用视觉模型中转实现 DeepSeek 的"图片理解"

### 4.2 待解决
- [ ] **积温引擎未集成**：引擎逻辑已经写好（`test-jiwen-engine.mjs`），但还没接入 `app.js` 的 send() 流程。需要：
  - 在 config 中添加 jiwen 配置字段（开关、参数）
  - 在 send() 前后调用 tick / applyInteraction
  - 添加主动联系检测 + 自动发送消息的逻辑
  - 将风格指导注入 system prompt

- [ ] **TTS 未集成前端**：后端 `api/tts.js` 已就绪，但前端没有任何调用。需要：
  - 在 AI 消息气泡旁添加"播放"按钮
  - 调用 `/api/tts` 获取音频流
  - 播放控制（play/pause/stop）

- [ ] **图片在群聊中无效**：群聊使用的是非流式、纯文本消息构建，`sendGroupMsg()` 不处理图片。如果用户想在群聊中发图片，需要加上视觉识别逻辑

- [ ] **API 返回 content block array 格式未处理**：DeepSeek 新版 API 可能返回 `delta.content = [{type:"thinking_delta", text:"..."}, {type:"text_delta", text:"..."}]` 格式。当前代码只处理了 `delta.content` 是 string 的情况，未处理数组格式

- [ ] **流式渲染期间 `<thinking>` 标签跨 chunk 拆分**：如果 `<thinking>` 标签的 `>` 和 `</` 刚好跨了两个 SSE chunk，当前逻辑会短暂显示原始文本（极短时间）。实际影响不大，但可以改进为更健壮的状态机解析

- [ ] **多图片并发描述**：当前 `describeImages()` 一次性发送所有图片给视觉模型。如果有 4-5 张大图，可能超过某些 API 的请求大小限制或上下文限制

- [ ] **记忆云端同步冲突**：当前 sync 逻辑是先 DELETE 再 POST，如果多设备同时操作可能丢数据。简单场景下够用，复杂场景需要真正的 conflict resolution

- [ ] **没有单元测试**：所有测试脚本都是手动运行的验证脚本（`test-*.js/mjs`），没有自动化测试框架

- [ ] **消息编辑后重新发送**：编辑用户消息会删除该消息之后的所有消息，然后自动重新发送。这在多轮对话中可能意外删除有用的 AI 回复

### 4.3 低优先级
- [ ] 聊天记录搜索不支持正则
- [ ] 群聊角色发言顺序固定，没有随机性
- [ ] 没有消息引用/回复功能（Slack 式的 thread）
- [ ] 抽屉面板中的角色切换没有搜索/筛选
- [ ] 缺乏国际化支持（目前只支持中文）

---

## 5. API 配置速查

### 5.1 Provider 对照表

| Provider | API Endpoint | 默认模型 | 视觉支持 |
|---|---|---|---|
| `deepseek` | `https://api.deepseek.com/chat/completions` | `deepseek-chat` | ❌ 纯文本 |
| `openrouter` | `https://openrouter.ai/api/v1/chat/completions` | `anthropic/claude-sonnet-4.6` | ✅ (取决于所选模型) |
| `custom` | 用户自定义 `/chat/completions` | `gpt-4o` | ✅ (取决于所选模型) |
| 视觉代理 | 用户自定义 `/chat/completions` | `qwen-vl-plus` (推荐) | ✅ 专用视觉 |

### 5.2 敏感信息提醒

`app.js` 中硬编码了以下 Supabase 凭据（L211-L212）：
- Supabase URL: `spqviscxskpgojvykybt.supabase.co`
- Supabase Anon Key（公开可读，符合 Supabase 的 RLS 安全模型）

使用者可通过设置面板配置自己的 API Key（DeepSeek、OpenRouter、自定义、视觉模型），这些 Key 存储在浏览器 localStorage 中，不会上传到任何服务器。

---

## 6. 开发约定

- **代码风格**：2 空格缩进，大量使用箭头函数和模板字面量
- **变量命名**：驼峰命名，局部变量常用缩写（`um`=user message, `bm`=bot message, `p`=persona, `el`=element, `ts`=timestamp）
- **数据持久化**：任何修改数据模型的操作后都要调用对应的 `save*()` 函数写 localStorage
- **UI 更新**：修改聊天数据后通常需要 `renderAllMessages()` 或 `appendMsgEl()` 更新 DOM
- **版本号**：当前版本 v12.5（樱语 · 液态玻璃），在 `index.html` 的 `<script src>` 查询参数中更新（`?v=29`），用于缓存破坏
