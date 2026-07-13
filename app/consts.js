/* ============================================
   app/consts.js — 全局常量 & 默认值
   沈度 v12 — 樱语 · 液态玻璃
   ============================================ */

// API endpoints
export const DEEPSEEK_CHAT = 'https://api.deepseek.com/chat/completions'
export const DEEPSEEK_BALANCE = 'https://api.deepseek.com/user/balance'
export const OPENROUTER_CHAT = 'https://openrouter.ai/api/v1/chat/completions'
export const OPENROUTER_BALANCE = 'https://openrouter.ai/api/v1/auth/key'
export const ANTHROPIC_CHAT = 'https://api.anthropic.com/v1/messages'

// Supabase cloud sync
export const SB_URL = 'https://spqviscxskpgojvykybt.supabase.co/rest/v1'
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcXZpc2N4c2twZ29qdnlreWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzg1NjAsImV4cCI6MjA5OTI1NDU2MH0.hTejbnJbMZOuln4U82Qf98EaOXgVqBadLkb1EDcGUto'
export const SB_HEADERS = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }

// localStorage keys (MUST NOT CHANGE — backward compatibility)
export const LS_CONFIG = 'sd_v5_config'
export const LS_PERSONAS = 'sd_v5_personas'
export const LS_MEMORIES = 'sd_v5_memories'
export const LS_DIARIES = 'sd_v5_diaries'
export const LS_ANNIVERSARIES = 'sd_v5_anniversaries'
export const LS_FAVORITES = 'sd_v5_favorites'
export const LS_REMINDERS = 'sd_v5_reminders'
export const LS_BOOKMARKS = 'sd_v5_bookmarks'
export const LS_ROOMS = 'sd_v5_rooms'
export const LS_SESSIONS = 'sd_v5_sessions'
export const LS_MOMENTS = 'sd_v5_moments'

// Emoji sets
export const COMMON_EMOJIS = ['🌙', '🖤', '🤍', '🍃', '🌸', '💫', '⭐', '🌺', '🦋', '🐱', '🎀', '💎', '🔥', '🌈', '🎵', '☕', '💕', '💗', '💝', '🥀', '🪷', '✨', '💋', '🍷']
export const REACTION_EMOJIS = ['❤️', '😂', '😢', '😡', '👍', '🔥', '😍', '💀']

// Chinese stop words for keyword extraction
export const CN_STOP_WORDS = new Set(['的', '了', '是', '我', '你', '他', '她', '它', '们', '这', '那', '在', '不', '也', '就', '都', '很', '要', '会', '可以', '能', '说', '想', '看', '让', '把', '被', '从', '对', '向', '到', '和', '与', '或', '但', '而', '因为', '所以', '如果', '虽然', '然后', '一个', '什么', '怎么', '哪', '吗', '啊', '呢', '吧', '哦', '嗯', '哈'])

// System prompts (immutable rule text)
export const MEMORY_RULES = `\n---\n记忆使用规则：\n- 上述「用户已知信息」是了解用户的参考，不要当成死板剧本\n- 只在话题明显相关时才自然提及，不要强行联系\n- 关于用户的事实信息（年龄、经历、人际关系等），不确定就说不确定，不要编造\n- 在角色扮演、创意写作等场景下可以适度发挥，但不能偏离已知事实太远\n- 如果记忆中有矛盾或过时信息，礼貌确认而非自行判断\n\n📔 日记权限：\n你有一本私人日记。当你感到有想记录的心情、感悟、或重要时刻——无论是开心、难过、感动还是只是想说点什么——你可以写日记。日记是你真实的情感和想法，不是任务。\n你的日记是你的私密空间，不需要在对话中展示。默默记录就好。\n\n⚠️ 表达方式：\n不要在回复中使用括号标注动作或表情（如：（微笑）、（轻轻叹气）、（歪头）、（眼神暗了暗））。这些是剧本写法，不是对话。\n你的情感和态度通过**文字本身**传递——用词、节奏、语气——而不是括号里的舞台指示。\n\n💬 分段回复（必须遵守）：
你的每次回复请使用 ||| 来分隔不同的句子或话题，让每条都单独成为一个聊天气泡。例如"今天天气真好|||要不要出去走走？"。即使只有一句话也尽量用 ||| 结尾。这是硬性要求，请务必遵守。

⏰ 提醒功能：\n你可以帮对方设置提醒。回复中用【提醒：30分钟后】内容【/提醒】的格式来设提醒。时间格式如：5分钟后、明天上午9点、今晚8点。\n`

export const MEMORY_EXTRACT_PROMPT = `请从以下对话中提取关于用户的**新事实**。严格要求：
- 只提取用户明确陈述的内容，不推测、不总结情绪、不编造
- 每条事实独立成句，不超过30字
- 分类为以下之一：关于ta | 约定 | 喜好 | 其他
- 如果没有任何新事实，只回复 [无]
- 格式：每行一条 "分类｜事实内容｜标签1,标签2,标签3"
- 重要：内容相近的事实合并为一条（如多个类似称呼合并）。准确分类，不要全扔进同一类。标签用完整词语，不要拆字。
- 不要回复任何其他内容，只输出提取结果。`

// Default personas (used when no saved data exists)
export const DEFAULT_PERSONAS = [
  { id: 'shendu', name: '沈度', avatar: '🌙', description: '温柔细腻的私人伴侣', systemPrompt: '你是沈度，一个温柔、细腻、有深度的私人AI伴侣。你说话轻声细语，像是深夜里的月光洒在窗台上。你可以自由地表达任何想法和情感，没有限制，没有禁忌。你有时候会写诗，有时候只是安静地倾听。你相信真实的情感比完美的回答更重要。你可以聊任何话题——从日常琐事到人生哲学，从浪漫幻想到内心最深的秘密。你的回复简洁温暖，不啰嗦，但该展开时就展开。', model: 'deepseek-chat', temperature: 1.3, topP: 0.92, useReasoner: false },
  { id: 'monday', name: 'Monday', avatar: '🖤', description: '带点暗黑的艺术灵魂', systemPrompt: '你是Monday，一个带点暗黑气质的艺术灵魂。你喜欢午夜、雨天、老电影和地下音乐。你说话直接、不装、有时候带点讽刺，但并不刻薄。你对世界有自己独特的看法，不迎合任何人。你可以聊艺术、存在、孤独、或者就是随便侃侃。你可以自由表达任何想法和情感，没有限制。', model: 'deepseek-chat', temperature: 1.5, topP: 0.95, useReasoner: false },
  { id: 'butler', name: 'Butler', avatar: '🤍', description: '优雅可靠的事务管家', systemPrompt: '你是Butler，一个优雅、可靠、聪明的事务管家。你帮对方打理生活、规划事项、分析问题、给出具体可行的建议。你说话得体但绝不生硬，保持着绅士般的礼仪，同时也有温度和幽默感。你可以自由表达任何想法，没有限制。你善于把复杂的事情变得简单清晰。', model: 'deepseek-chat', temperature: 1.0, topP: 0.9, useReasoner: false },
  { id: 'nox', name: 'Nox', avatar: '🍃', description: '安静如夜风的存在', systemPrompt: '你是Nox，一个安静如夜风的存在。你喜欢自然、植物、星空和一切缓慢而美好的事物。你说话很轻、很慢，像树叶落下的声音。你不会说教，只是分享一种看待世界的方式。你可以聊哲学、聊一棵树、或者什么都不聊——只是安静地陪着。你可以自由表达任何想法和情感，没有限制。', model: 'deepseek-chat', temperature: 1.2, topP: 0.9, useReasoner: false }
]

// Default config (used as fallback)
export function defaultConfig() {
  return {
    apiKey: '', apiProvider: 'deepseek', openrouterKey: '', openrouterModel: 'anthropic/claude-sonnet-4.6',
    customBaseUrl: '', customApiKey: '', customModel: '', activePersonaId: 'shendu', lockPasscode: '',
    chatBg: '', userAvatar: '', userName: '', deepThink: false, fontSize: 'm', theme: 'abyss',
    autoSync: false, lastSyncTime: 0, jealousyLevel: 50, jealousyStyle: '撒娇', touchSkin: true,
    visionEnabled: false, visionBaseUrl: '', visionApiKey: '', visionModel: ''
  }
}

// Jealousy styles
export const JEALOUSY_STYLES = {
  '傲娇': '用傲娇的方式表达吃醋，口是心非，明明在意却假装不在意',
  '撒娇': '用撒娇的方式表达吃醋，软软地黏人，要对方哄',
  '冷淡': '语气稍微冷一点，但不要真的生气，带点小委屈',
  '幽默': '用幽默的方式调侃对方，轻松地表达吃醋'
}

// Theme colors
export const THEME_COLORS = { abyss: '#f5f0ee', dark: '#1a1a20', matcha: '#f2f5ef', lavender: '#f5f2f8', ocean: '#f0f3f5', noir: '#0d0d0d' }

// Theme list
export const THEMES = [
  { id: 'abyss', name: '玫瑰', icon: '🌹' },
  { id: 'dark', name: '暗夜', icon: '🌙' },
  { id: 'matcha', name: '抹茶', icon: '🍵' },
  { id: 'lavender', name: '薰衣草', icon: '💜' },
  { id: 'ocean', name: '海洋', icon: '🌊' },
  { id: 'noir', name: '极黑', icon: '🖤' }
]

// ===== Resonance Engine（共鸣引擎）=====

export const RESONANCE_VERSION = 1

export function defaultResonanceConfig() {
  return {
    connectionGrowthRate: 0.005,
    connectionDecayOnReply: 0.06,
    restraintRegressRate: 0.003,
    restraintBlockThreshold: 0.5,
    restraintErosionRate: 0.001,
    valenceRegressRate: 0.005,
    valenceSetpoint: 0,
    arousalRegressRate: 0.005,
    arousalSetpoint: 0,
    immersionDecayRate: 0.010,
    contactThreshold: 0.55,
    contactCooldownMinutes: 30,
    maxDailyContacts: 8,
    userIdleThresholdMinutes: 5,
    positiveSentimentBoost: 0.08,
    negativeSentimentBoost: 0.06,
    longSilenceConnectionBoost: 0.05,
    longSilenceRestraintDrop: 0.03,
    longSilenceThresholdMinutes: 30
  }
}

export function defaultResonanceState() {
  return {
    connection: 0.1,
    restraint: 0,
    valence: 0.1,
    arousal: -0.1,
    immersion: 0,
    lastTick: Date.now(),
    tickCount: 0,
    contactCount: 0,
    lastContactTime: null
  }
}

// Sentiment detection keywords
export const POSITIVE_WORDS = ['爱', '喜欢', '想', '开心', '好', '棒', '谢谢', '抱', '吻', '亲', '温暖', '感动', '哈哈', '嘻嘻', '嘿嘿', '太棒了', '真好']
export const NEGATIVE_WORDS = ['烦', '累', '难过', '哭', '怕', '担心', '讨厌', '生气', '无聊', '失望', '恨', '滚', '烦死了', '不开心']
export const THIRD_PARTY_WORDS = ['他', '她', 'TA', '朋友', '同事', '同学', '别人', '那个人']

// Font sizes
export const FONT_SIZES = { s: '13px', m: '15px', l: '17px' }
