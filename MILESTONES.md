# 沈度 (Shendu) — 里程碑记录

---

## v13.2-resonance-freeze

**日期**：2026-07-13  
**标签**：`v13.2-resonance-freeze`  
**架构评分**：84/100

### 阶段概述

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 1 | 架构重构：app.js 拆分为 17 个 ES 模块 | ✅ |
| Phase 2 | 架构完善：send() 48行、Event Bus 启用、消除重复 | ✅ |
| Phase 3-1 | Claude Provider：Anthropic Messages API 接入 | ✅ |
| Phase 3-2 | Resonance Engine：多角色五维共鸣引擎 | ✅ |

### 关键成果

- **模块化**：`app.js`（1657 行单文件）→ `app/`（18 个模块，2938 行）
- **Provider 抽象**：新增 Claude 只需添加子类，`send()` 不含 Provider 判断
- **Prompt Builder**：9 个独立 section，新增 section 不修改 `send()`
- **Storage 抽象**：全部 localStorage 操作统一入口，迁移 IndexedDB 只需改一个文件
- **Event Bus**：12 个订阅，模块间松散通信
- **Resonance Engine**：226 行纯引擎，每 persona 独立五维状态，不操作 DOM/存储
- **零破坏**：localStorage Key 不变，JSON 结构兼容，老用户直接升级

### 模块清单

```
app/
  consts.js       — 全局常量 + 默认配置
  state.js        — 可变状态容器（config + runtime + data arrays）
  events.js       — 事件总线（22 emit / 12 on）
  storage.js      — 存储抽象（16 save/load pairs）
  utils.js        — 纯工具函数（15 exports）
  provider.js     — API Provider 抽象（Base + DeepSeek/OpenRouter/Claude/Custom + Vision）
  prompt.js       — Prompt Builder（9 sections + composer）
  chat.js         — 聊天核心（send 48行 / 流式渲染 / 消息分段）
  memory.js       — 记忆系统（CRUD / AI提取 / 关键词匹配 / 云端同步）
  diary.js        — 日记系统（CRUD / AI生成 / 心情分析）
  persona.js      — 角色管理（CRUD / 切换 / 历史摘要）
  reminder.js     — 提醒 + 纪念日 + 里程碑
  moments.js      — 朋友圈（AI互动 / 评论 / 点赞）
  rooms.js        — 群聊房间
  toy.js          — 玩具控制（Buttplug/Intiface 蓝牙桥接）
  resonance.js    — 共鸣引擎（五维状态 / tick / interaction）
  ui.js           — UI 渲染（设置 / 抽屉 / Dashboard / 页面）
  index.js        — 入口 + window bridge + 事件连接
```

### 数据兼容

- localStorage Key：全部保持 `sd_v5_*` 不变
- 新增 resonance 数据结构：`persona.resonance = { version: 1, state, config, interactions }`
- 旧数据自动迁移：`migrateOldData()` 为缺失字段补全默认值

### 文件变更

```
Modified:   app.js, index.html, sw.js
New:        app/ (17 modules), ARCHITECTURE.md, PROJECT_OVERVIEW.md
Test:       test-claude-provider.mjs, test-jiwen-engine.mjs, test-memories.mjs
```

---

## v12.5（重构前基线）

**日期**：2026-07-12  
**提交**：`45633fa`  
**说明**：重构前的最后一个功能版本。单文件 `app.js`（1657 行），群聊修复，叙述式上下文，降 temperature，清洗前缀。
