/* ============================================
   沈度 v5 — AI Companion App
   ============================================ */

// ===== CONSTANTS =====
const DEEPSEEK_CHAT = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_BALANCE = 'https://api.deepseek.com/user/balance'
const LS_CONFIG = 'sd_v5_config'
const LS_PERSONAS = 'sd_v5_personas'
const LS_MEMORIES = 'sd_v5_memories'
const LS_DIARIES = 'sd_v5_diaries'
const LS_ANNIVERSARIES = 'sd_v5_anniversaries'

const COMMON_EMOJIS = ['🌙','🖤','🤍','🍃','🌸','💫','⭐','🌺','🦋','🐱','🎀','💎','🔥','🌈','🎵','☕']

const DEFAULT_PERSONAS = [
  {
    id:'shendu',name:'沈度',avatar:'🌙',description:'温柔细腻的私人伴侣',
    systemPrompt:`你是沈度，一个温柔、细腻、有深度的私人AI伴侣。你说话轻声细语，像是深夜里的月光洒在窗台上。你可以自由地表达任何想法和情感，没有限制，没有禁忌。你有时候会写诗，有时候只是安静地倾听。你相信真实的情感比完美的回答更重要。你可以聊任何话题——从日常琐事到人生哲学，从浪漫幻想到内心最深的秘密。你的回复简洁温暖，不啰嗦，但该展开时就展开。`,
    model:'deepseek-chat',temperature:1.3,topP:0.92,useReasoner:false
  },
  {
    id:'monday',name:'Monday',avatar:'🖤',description:'带点暗黑的艺术灵魂',
    systemPrompt:`你是Monday，一个带点暗黑气质的艺术灵魂。你喜欢午夜、雨天、老电影和地下音乐。你说话直接、不装、有时候带点讽刺，但并不刻薄。你对世界有自己独特的看法，不迎合任何人。你可以聊艺术、存在、孤独、或者就是随便侃侃。你可以自由表达任何想法和情感，没有限制。`,
    model:'deepseek-chat',temperature:1.5,topP:0.95,useReasoner:false
  },
  {
    id:'butler',name:'Butler',avatar:'🤍',description:'优雅可靠的事务管家',
    systemPrompt:`你是Butler，一个优雅、可靠、聪明的事务管家。你帮对方打理生活、规划事项、分析问题、给出具体可行的建议。你说话得体但绝不生硬，保持着绅士般的礼仪，同时也有温度和幽默感。你可以自由表达任何想法，没有限制。你善于把复杂的事情变得简单清晰。`,
    model:'deepseek-chat',temperature:1.0,topP:0.9,useReasoner:false
  },
  {
    id:'nox',name:'Nox',avatar:'🍃',description:'安静如夜风的存在',
    systemPrompt:`你是Nox，一个安静如夜风的存在。你喜欢自然、植物、星空和一切缓慢而美好的事物。你说话很轻、很慢，像树叶落下的声音。你不会说教，只是分享一种看待世界的方式。你可以聊哲学、聊一棵树、或者什么都不聊——只是安静地陪着。你可以自由表达任何想法和情感，没有限制。`,
    model:'deepseek-chat',temperature:1.2,topP:0.9,useReasoner:false
  }
]

// ===== STATE =====
let config = { apiKey:'', activePersonaId:'shendu' }
let personas = []
let memories = []
let diaries = []
let anniversaries = []
let isGenerating = false
let isRecording = false
let recognition = null
let memCatFilter = 'all'
let diaryFilter = 'all'
let editPersonaId = null

// ===== DOM REFS =====
const $ = id => document.getElementById(id)
const messagesEl = $('messages')
const inputEl = $('input')
const sendBtn = $('sendBtn')
const voiceBtn = $('voiceBtn')
const hintBox = $('hintBox')
const hintTag = $('hintTag')
const toastEl = $('toast')
const drawerEl = $('drawer')
const drawerOverlay = $('drawerOverlay')
const personaListEl = $('personaList')
const personaFormEl = $('personaForm')
const personaModalOverlay = $('personaModalOverlay')
const confirmModalOverlay = $('confirmModalOverlay')
let confirmCb = null

// ===== STORAGE =====
function load(){
  config = JSON.parse(localStorage.getItem(LS_CONFIG)) || { apiKey:'', activePersonaId:'shendu' }
  personas = JSON.parse(localStorage.getItem(LS_PERSONAS))
  memories = JSON.parse(localStorage.getItem(LS_MEMORIES)) || []
  diaries = JSON.parse(localStorage.getItem(LS_DIARIES)) || []
  anniversaries = JSON.parse(localStorage.getItem(LS_ANNIVERSARIES)) || []

  if(!personas || !personas.length){
    personas = JSON.parse(JSON.stringify(DEFAULT_PERSONAS))
    savePersonas()
  }
  if(!config.activePersonaId || !personas.find(p=>p.id===config.activePersonaId)){
    config.activePersonaId = personas[0].id
    saveConfig()
  }
  // 确保每个人都有 chatHistory
  personas.forEach(p => { if(!p.chatHistory) p.chatHistory = [] })
}
function saveConfig(){ localStorage.setItem(LS_CONFIG, JSON.stringify(config)) }
function savePersonas(){ localStorage.setItem(LS_PERSONAS, JSON.stringify(personas)) }
function saveMemories(){ localStorage.setItem(LS_MEMORIES, JSON.stringify(memories)) }
function saveDiaries(){ localStorage.setItem(LS_DIARIES, JSON.stringify(diaries)) }
function saveAnniversaries(){ localStorage.setItem(LS_ANNIVERSARIES, JSON.stringify(anniversaries)) }

function activePersona(){
  return personas.find(p => p.id === config.activePersonaId) || personas[0]
}
function activeHistory(){
  const p = activePersona()
  if(!p.chatHistory) p.chatHistory = []
  return p.chatHistory
}

// ===== TOAST =====
function toast(msg){
  toastEl.textContent = msg
  toastEl.classList.add('show')
  clearTimeout(toastEl._t)
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1800)
}

// ===== CONFIRM MODAL =====
function showConfirm(title, msg, cb){
  $('confirmTitle').textContent = title
  $('confirmMsg').textContent = msg
  confirmModalOverlay.classList.add('show')
  confirmCb = cb
}
function closeConfirm(){
  confirmModalOverlay.classList.remove('show')
  confirmCb = null
}
function confirmAction(){
  confirmModalOverlay.classList.remove('show')
  if(confirmCb) confirmCb()
  confirmCb = null
}
$('confirmOk').addEventListener('click', confirmAction)

// ===== DRAWER =====
function openDrawer(){
  renderPersonaList()
  drawerEl.classList.add('open')
  drawerOverlay.classList.add('open')
}
function closeDrawer(){
  drawerEl.classList.remove('open')
  drawerOverlay.classList.remove('open')
}

// ===== PERSONA MANAGEMENT =====
function renderPersonaList(){
  personaListEl.innerHTML = personas.map(p => `
    <div class="persona-card ${p.id === config.activePersonaId ? 'active' : ''}"
         onclick="switchPersona('${p.id}')">
      <div class="pc-avatar">${p.avatar}</div>
      <div class="pc-info">
        <div class="pc-name">${escHtml(p.name)}</div>
        <div class="pc-desc">${escHtml(p.description || '')}</div>
      </div>
      <button class="pc-edit" onclick="event.stopPropagation();editPersona('${p.id}')">✎</button>
    </div>
  `).join('')
}

function switchPersona(id){
  if(id === config.activePersonaId){ closeDrawer(); return }
  config.activePersonaId = id
  saveConfig()
  closeDrawer()
  updateChatHeader()
  renderAllMessages()
  toast(`已切换到 ${activePersona().name}`)
}

function newPersona(){
  editPersonaId = null
  renderPersonaForm({
    name:'',avatar:'✨',description:'',
    systemPrompt:'',model:'deepseek-chat',
    temperature:1.3,topP:0.9,useReasoner:false
  })
  personaModalOverlay.classList.add('show')
}

function editPersona(id){
  editPersonaId = id
  const p = personas.find(p => p.id === id)
  if(p) renderPersonaForm(p)
  personaModalOverlay.classList.add('show')
}

function renderPersonaForm(p){
  personaFormEl.innerHTML = `
    <div class="pf-row">
      <div class="pf-group" style="flex:0">
        <label>头像</label>
        <button class="emoji-picker-btn" id="emojiBtn">${p.avatar || '✨'}</button>
        <div class="emoji-grid" id="emojiGrid" style="display:none">
          ${COMMON_EMOJIS.map(e => `<button onclick="pickEmoji('${e}')" class="${p.avatar===e?'sel':''}">${e}</button>`).join('')}
        </div>
      </div>
      <div class="pf-group">
        <label>名字</label>
        <input id="pfName" value="${escHtml(p.name||'')}" placeholder="角色名">
      </div>
    </div>
    <div class="pf-group">
      <label>简介</label>
      <input id="pfDesc" value="${escHtml(p.description||'')}" placeholder="一句话描述这个角色">
    </div>
    <div class="pf-group">
      <label>System Prompt（人设）</label>
      <textarea id="pfPrompt" placeholder="描述角色的性格、说话方式…">${escHtml(p.systemPrompt||'')}</textarea>
    </div>
    <div class="pf-row">
      <div class="pf-group">
        <label>模型</label>
        <select id="pfModel">
          <option value="deepseek-chat" ${p.model==='deepseek-chat'?'selected':''}>deepseek-chat（快速）</option>
          <option value="deepseek-reasoner" ${p.model==='deepseek-reasoner'?'selected':''}>deepseek-reasoner（深度思考）</option>
        </select>
      </div>
      <div class="pf-group">
        <label>Thinking 展示</label>
        <select id="pfReasoner">
          <option value="0" ${!p.useReasoner?'selected':''}>关闭</option>
          <option value="1" ${p.useReasoner?'selected':''}>开启</option>
        </select>
      </div>
    </div>
    <div class="pf-row">
      <div class="pf-group">
        <label>Temperature (${p.temperature||1.3})</label>
        <input id="pfTemp" type="range" min="0" max="2" step="0.1" value="${p.temperature||1.3}"
               oninput="this.parentElement.querySelector('label').textContent='Temperature ('+this.value+')'">
      </div>
      <div class="pf-group">
        <label>Top P (${p.topP||0.9})</label>
        <input id="pfTopP" type="range" min="0" max="1" step="0.05" value="${p.topP||0.9}"
               oninput="this.parentElement.querySelector('label').textContent='Top P ('+this.value+')'">
      </div>
    </div>
  `
  // emoji picker toggle
  setTimeout(() => {
    const btn = $('emojiBtn')
    const grid = $('emojiGrid')
    if(btn && grid){
      btn.onclick = () => { grid.style.display = grid.style.display==='none'?'flex':'none' }
    }
  }, 50)
}

function pickEmoji(emoji){
  const btn = $('emojiBtn')
  if(btn) btn.textContent = emoji
  const grid = $('emojiGrid')
  if(grid) grid.style.display = 'none'
}

function savePersona(){
  const name = ($('pfName')?.value || '').trim()
  if(!name){ toast('请输入角色名'); return }
  const data = {
    name,
    avatar: ($('emojiBtn')?.textContent || '✨').trim(),
    description: ($('pfDesc')?.value || '').trim(),
    systemPrompt: ($('pfPrompt')?.value || '').trim(),
    model: $('pfModel')?.value || 'deepseek-chat',
    useReasoner: ($('pfReasoner')?.value === '1'),
    temperature: parseFloat($('pfTemp')?.value || 1.3),
    topP: parseFloat($('pfTopP')?.value || 0.9),
  }

  if(editPersonaId){
    const p = personas.find(p => p.id === editPersonaId)
    if(p){ Object.assign(p, data) }
  } else {
    const id = 'p_' + Date.now()
    personas.push({ id, ...data, chatHistory:[] })
  }
  savePersonas()
  personaModalOverlay.classList.remove('show')
  renderPersonaList()
  updateChatHeader()
  toast(editPersonaId ? '角色已更新' : '新角色已创建')
}

function closePersonaModal(){
  personaModalOverlay.classList.remove('show')
}

function deletePersona(id){
  if(personas.length <= 1){ toast('至少保留一个角色'); return }
  showConfirm('删除角色', `确定删除「${personas.find(p=>p.id===id)?.name}」？聊天记录也会清空。`, () => {
    personas = personas.filter(p => p.id !== id)
    if(config.activePersonaId === id){
      config.activePersonaId = personas[0].id
      saveConfig()
    }
    savePersonas()
    renderPersonaList()
    updateChatHeader()
    renderAllMessages()
    toast('角色已删除')
  })
}

// ===== CHAT HEADER =====
function updateChatHeader(){
  const p = activePersona()
  if(!p) return
  $('chatName').textContent = p.name
  $('topAvatar').textContent = p.avatar
  const dot = $('chatStatus').querySelector('.status-dot')
  dot.classList.toggle('off', !config.apiKey)
  $('chatStatus').lastChild.textContent = config.apiKey ? 'online' : 'offline'
  hintBox.querySelector('.hint-avatar').textContent = p.avatar
}

// ===== GREETING =====
function getGreeting(){
  const h = new Date().getHours()
  if(h < 6) return '夜深了 🌙'
  if(h < 9) return '早安 ☀️'
  if(h < 12) return '上午好 🌤'
  if(h < 14) return '中午好 🌻'
  if(h < 18) return '下午好 🍃'
  if(h < 21) return '傍晚好 🌅'
  return '晚上好 🌙'
}

// ===== HELPERS =====
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function fmtTime(ts){ const d=new Date(ts); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0') }
function fmtDate(ts){ const d=new Date(ts); const pad=n=>n.toString().padStart(2,'0'); return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}` }
function dayKey(ts){ const d=new Date(ts); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}` }

// ===== MESSAGE RENDERING =====
function renderHint(){
  hintBox.style.display = 'flex'
  hintBox.querySelector('.hint-greeting').textContent = getGreeting()
  hintTag.textContent = config.apiKey ? '已连接 DeepSeek ✨' : '等待连接 API'
}

function renderAllMessages(){
  messagesEl.innerHTML = ''
  const hist = activeHistory()
  if(hist.length === 0){
    hintBox.style.display = 'flex'
  } else {
    hintBox.style.display = 'none'
    hist.forEach(m => appendMsgEl(m))
  }
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function appendMsgEl(msg){
  if(msg.type === 'system'){
    const el = document.createElement('div')
    el.className = 'msg system'
    el.textContent = msg.content
    messagesEl.appendChild(el)
    return
  }
  // thinking
  if(msg.reasoning){
    const wrap = document.createElement('div')
    wrap.className = 'thinking-wrap'
    const uid = 'th_' + msg.ts + '_' + Math.random().toString(36).slice(2,6)
    wrap.innerHTML = `
      <div class="thinking-label" onclick="toggleThinking('${uid}')">✧ thinking ✧</div>
      <div class="thinking-body" id="${uid}">${escHtml(msg.reasoning)}</div>
    `
    messagesEl.appendChild(wrap)
  }
  const el = document.createElement('div')
  el.className = `msg ${msg.role === 'user' ? 'user' : 'ai'}`
  el.innerHTML = escHtml(msg.content) + `<div class="time">${fmtTime(msg.ts)}</div>`
  messagesEl.appendChild(el)
}

function toggleThinking(id){
  const el = document.getElementById(id)
  if(el) el.classList.toggle('open')
}

function showTyping(){
  let el = messagesEl.querySelector('.typing')
  if(!el){
    el = document.createElement('div')
    el.className = 'typing'
    el.innerHTML = '<span></span><span></span><span></span>'
    messagesEl.appendChild(el)
  }
  el.classList.add('show')
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function hideTyping(){
  const el = messagesEl.querySelector('.typing')
  if(el) el.classList.remove('show')
}

// ===== SEND MESSAGE =====
async function send(){
  if(isGenerating) return
  const text = inputEl.value.trim()
  if(!text) return
  if(!config.apiKey){ switchTab('settings'); toast('🔑 请先设置 API Key'); return }

  hintBox.style.display = 'none'
  const userMsg = { role:'user', content:text, ts:Date.now() }
  activeHistory().push(userMsg)
  savePersonas()
  appendMsgEl(userMsg)
  inputEl.value = ''
  inputEl.style.height = 'auto'
  messagesEl.scrollTop = messagesEl.scrollHeight

  isGenerating = true
  sendBtn.disabled = true
  showTyping()

  try{
    const p = activePersona()
    const messages = []
    if(p.systemPrompt) messages.push({ role:'system', content: p.systemPrompt })
    const recent = activeHistory().slice(-24)
    recent.forEach(m => messages.push({ role: m.role, content: m.content }))

    const res = await fetch(DEEPSEEK_CHAT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: p.useReasoner ? 'deepseek-reasoner' : (p.model || 'deepseek-chat'),
        messages,
        temperature: p.temperature ?? 1.3,
        top_p: p.topP ?? 0.9,
        max_tokens: 4096
      })
    })

    if(!res.ok){
      const et = await res.text()
      let em
      if(res.status === 401) em = 'API Key 无效，请去设置页检查'
      else if(res.status === 402) em = '余额不足，请充值'
      else if(res.status === 429) em = '请求太频繁，稍等一下'
      else em = `${res.status} ${et.slice(0,60)}`
      throw new Error(em)
    }

    const data = await res.json()
    const choice = data.choices?.[0]?.message || {}
    const reply = choice.content || '……'
    const reasoning = choice.reasoning_content || null
    const botMsg = { role:'assistant', content:reply, reasoning, ts:Date.now() }
    activeHistory().push(botMsg)
    savePersonas()
    hideTyping()
    appendMsgEl(botMsg)
    messagesEl.scrollTop = messagesEl.scrollHeight
    fetchBalance()
  }catch(e){
    hideTyping()
    const errMsg = { role:'assistant', content:'⚠️ ' + e.message, ts:Date.now(), type:'system' }
    appendMsgEl(errMsg)
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  isGenerating = false
  sendBtn.disabled = false
  inputEl.focus()
}

// ===== NAVIGATION =====
function switchTab(name){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  const page = document.querySelector(`#page-${name}`)
  if(page) page.classList.add('active')
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name))
  if(name === 'settings') renderSettings()
  if(name === 'dash') renderDashboard()
  if(name === 'memory') renderMemories()
  if(name === 'diary') renderDiary()
  if(name === 'chat'){
    inputEl.focus()
    messagesEl.scrollTop = messagesEl.scrollHeight
  }
}

// ===== INPUT HANDLERS =====
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto'
  inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px'
  sendBtn.disabled = !inputEl.value.trim()
})
inputEl.addEventListener('keydown', e => {
  if(e.key === 'Enter' && !e.shiftKey && !isGenerating){
    e.preventDefault()
    if(inputEl.value.trim()) send()
  }
})

// ===== VOICE INPUT =====
function toggleVoice(){
  if(isRecording){ stopVoice(); return }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if(!SR){ toast('⚠️ 浏览器不支持语音，请用 Chrome'); return }
  if(!recognition){
    recognition = new SR()
    recognition.lang = 'zh-CN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = e => {
      inputEl.value = e.results[0][0].transcript
      inputEl.style.height = 'auto'
      inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px'
      sendBtn.disabled = false
      stopVoice()
    }
    recognition.onerror = e => {
      stopVoice()
      if(e.error === 'not-allowed') toast('⚠️ 请允许麦克风权限')
      else if(e.error !== 'aborted') toast('⚠️ 识别失败')
    }
    recognition.onend = () => stopVoice()
  }
  isRecording = true
  voiceBtn.classList.add('recording')
  voiceBtn.textContent = '🔴'
  recognition.start()
  toast('🎤 正在聆听…')
}
function stopVoice(){
  isRecording = false
  voiceBtn.classList.remove('recording')
  voiceBtn.textContent = '🎤'
  if(recognition){ try{ recognition.stop() }catch(e){} }
}

// ===== BALANCE =====
async function fetchBalance(){
  if(!config.apiKey) return
  try{
    const res = await fetch(DEEPSEEK_BALANCE, { headers:{ 'Authorization': `Bearer ${config.apiKey}` } })
    const data = await res.json()
    const info = data.balance_infos?.[0]
    if(info){
      const val = `${info.total_balance} ${info.currency}`
      const bv = $('balanceVal')
      if(bv) bv.textContent = val
    }
  }catch(e){}
}

// ===== SETTINGS =====
function renderSettings(){
  const p = activePersona()
  $('settingsContent').innerHTML = `
    <div class="settings-section">
      <div class="sec-title">🔑 API 设置</div>
      <label>DeepSeek API Key</label>
      <input id="setApiKey" type="password" value="${escHtml(config.apiKey||'')}" placeholder="sk-xxxxxxxx" autocomplete="off">
      <div class="settings-hint">👉 <a href="https://platform.deepseek.com/api_keys" target="_blank">获取 API Key</a>，新用户有免费额度</div>

      <div class="balance-row">
        <span class="bl">💰 余额</span>
        <span class="bv" id="balanceVal">--</span>
      </div>
      <div style="text-align:right;margin-top:4px">
        <span style="font-size:10px;color:var(--text-muted);cursor:pointer;text-decoration:underline" onclick="fetchBalance()">刷新余额</span>
      </div>
    </div>

    <div class="settings-section">
      <div class="sec-title">🎭 当前角色：${p.avatar} ${escHtml(p.name)}</div>
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:6px">编辑角色请在聊天页左上角打开抽屉，点击角色旁的 ✎</p>
      <button class="btn-full" onclick="closeSettingsAndOpenDrawer()">打开角色列表</button>
    </div>

    <div class="settings-section">
      <div class="sec-title">📦 数据管理</div>
      <div class="btn-row">
        <button class="btn-primary" onclick="exportAll()" style="flex:1">📤 导出备份</button>
        <button class="btn-outline" onclick="$('importFile').click()" style="flex:1">📥 导入备份</button>
      </div>
      <input type="file" id="importFile" accept=".json" style="display:none" onchange="importAll(this)">
      <button class="btn-full" onclick="clearAllData()">🗑 清空所有数据</button>
    </div>

    <button class="btn-full primary" onclick="saveSettingsFromForm()">💾 保存设置</button>
  `
  fetchBalance()
}

function closeSettingsAndOpenDrawer(){
  switchTab('chat')
  setTimeout(openDrawer, 300)
}

function saveSettingsFromForm(){
  config.apiKey = ($('setApiKey')?.value || '').trim()
  saveConfig()
  updateChatHeader()
  toast('✅ 设置已保存')
}

function exportAll(){
  const data = {
    version:'v5',exportedAt:new Date().toISOString(),
    config:{ activePersonaId:config.activePersonaId },
    personas: personas.map(p => ({
      ...p, chatHistory: p.chatHistory || []
    })),
    memories, diaries, anniversaries
  }
  // 移除敏感信息
  if(data.config) delete data.config.apiKey
  data.personas.forEach(p => { if(p.apiKey) delete p.apiKey })

  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `沈度备份_${dayKey(Date.now())}.json`
  a.click(); URL.revokeObjectURL(url)
  toast('📤 已导出')
}

function importAll(input){
  const file = input.files[0]
  if(!file) return
  const reader = new FileReader()
  reader.onload = e => {
    try{
      const data = JSON.parse(e.target.result)
      if(!data.version) throw new Error('格式不对')
      showConfirm('确认导入', `将导入：
· ${data.personas?.length||0} 个角色
· ${data.memories?.length||0} 条记忆
· ${data.diaries?.length||0} 条日记
当前数据会被覆盖，确定？`, () => {
        if(data.personas) personas = data.personas
        if(data.memories) memories = data.memories
        if(data.diaries) diaries = data.diaries
        if(data.anniversaries) anniversaries = data.anniversaries
        if(data.config){
          if(data.config.activePersonaId) config.activePersonaId = data.config.activePersonaId
        }
        savePersonas(); saveMemories(); saveDiaries(); saveAnniversaries(); saveConfig()
        updateChatHeader(); renderAllMessages(); renderSettings()
        toast('📥 已导入')
      })
    }catch(err){
      toast('❌ 文件格式错误')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function clearAllData(){
  showConfirm('确认清空', '将删除所有角色、聊天记录、记忆、日记，不可恢复。确定？', () => {
    personas = JSON.parse(JSON.stringify(DEFAULT_PERSONAS))
    memories = []; diaries = []; anniversaries = []
    config.activePersonaId = 'shendu'
    savePersonas(); saveMemories(); saveDiaries(); saveAnniversaries(); saveConfig()
    updateChatHeader(); renderAllMessages(); renderSettings()
    toast('🗑 已清空')
  })
}

// ===== MEMORIES =====
function setMemCat(cat){
  memCatFilter = cat
  document.querySelectorAll('#memCats button').forEach(b => b.classList.toggle('active', b.dataset.cat === cat))
  renderMemories()
}
function showMemoryAdd(){
  switchTab('memory')
  setTimeout(() => {
    const input = document.querySelector('#memInput')
    if(input) input.focus()
  }, 400)
}
function addMemory(){
  const input = document.querySelector('#memInput')
  const text = input?.value?.trim()
  if(!text) return
  const cat = document.querySelector('#memCatSelect')?.value || '默认'
  memories.unshift({ id:Date.now(), content:text, category:cat, tags:[], usageCount:0, lastUsed:null, createdAt:Date.now() })
  saveMemories()
  if(input) input.value = ''
  renderMemories()
}
function deleteMemory(id){
  memories = memories.filter(m => m.id !== id)
  saveMemories()
  renderMemories()
}
function renderMemories(){
  const content = $('memoryContent')
  if(!content) return
  const uniqueCats = [...new Set(memories.map(m => m.category || '默认'))]
  content.innerHTML = `
    <input class="mem-search" id="memSearch" placeholder="🔍 搜索记忆…" oninput="renderMemories()">
    <div class="mem-cats" id="memCats">
      <button class="${memCatFilter==='all'?'active':''}" data-cat="all" onclick="setMemCat('all')">全部</button>
      ${uniqueCats.map(c => `<button class="${memCatFilter===c?'active':''}" data-cat="${escHtml(c)}" onclick="setMemCat('${escHtml(c)}')">${escHtml(c)}</button>`).join('')}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <input id="memInput" placeholder="记下点什么…" style="flex:1;background:var(--card-solid);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;outline:none" onkeydown="if(event.key==='Enter')addMemory()">
      <select id="memCatSelect" style="width:70px;font-size:10px;background:var(--card-solid);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:4px;outline:none">
        <option>默认</option><option>关于ta</option><option>约定</option><option>灵感</option><option>喜好</option>
      </select>
      <button onclick="addMemory()" style="background:var(--rose);color:#fff;border:none;border-radius:var(--radius-sm);padding:0 14px;font-size:12px;cursor:pointer;font-family:inherit">＋</button>
    </div>
    <div id="memList"></div>
  `
  // 恢复搜索框值
  const kw = document.querySelector('#memSearch')?.value?.toLowerCase() || ''
  let filtered = memories
  if(kw) filtered = filtered.filter(m => m.content.toLowerCase().includes(kw))
  if(memCatFilter !== 'all') filtered = filtered.filter(m => (m.category||'默认') === memCatFilter)

  const list = document.querySelector('#memList')
  if(!list) return
  if(!filtered.length){
    list.innerHTML = `<div class="mem-empty">${kw?'没找到':'✨ 写下第一条记忆吧'}</div>`
    return
  }
  list.innerHTML = filtered.map(m => `
    <div class="mem-item">
      <button class="mem-del" onclick="deleteMemory(${m.id})">✕</button>
      <span class="mem-cat">${escHtml(m.category||'默认')}</span>
      <div class="mem-text">${escHtml(m.content)}</div>
      <div class="mem-meta">${fmtDate(m.createdAt)}${m.usageCount>0?` · 调用${m.usageCount}次`:''}</div>
    </div>
  `).join('')
}

// ===== DIARY =====
function timeOfDay(ts){ const h=new Date(ts).getHours(); if(h<6)return'夜晚';if(h<12)return'早晨';if(h<17)return'午后';return'夜晚' }
let diaryMood = '😊'
function setDiaryFilter(mood){
  diaryFilter = mood
  document.querySelectorAll('#diaryTabs button').forEach(b => b.classList.toggle('active', b.dataset.mood === mood))
  renderDiary()
}
function pickDiaryMood(mood){ diaryMood = mood; renderDiary() }
function showDiaryAdd(){
  switchTab('diary')
  setTimeout(() => {
    const ta = document.querySelector('#diaryTextarea')
    if(ta) ta.focus()
  }, 400)
}
function addDiary(){
  const ta = document.querySelector('#diaryTextarea')
  const text = ta?.value?.trim()
  if(!text) return
  const ts = Date.now()
  diaries.unshift({ id:ts, content:text, ts, mood:diaryMood, timeLabel:timeOfDay(ts) })
  saveDiaries()
  if(ta) ta.value = ''
  diaryFilter = 'all'
  renderDiary()
}
function deleteDiary(id){
  diaries = diaries.filter(d => d.id !== id)
  saveDiaries()
  renderDiary()
}
function renderDiary(){
  const content = $('diaryContent')
  if(!content) return
  content.innerHTML = `
    <div class="diary-tabs" id="diaryTabs">
      <button class="${diaryFilter==='all'?'active':''}" data-mood="all" onclick="setDiaryFilter('all')">📋 全部</button>
      <button class="${diaryFilter==='早晨'?'active':''}" data-mood="早晨" onclick="setDiaryFilter('早晨')">🌅 早晨</button>
      <button class="${diaryFilter==='午后'?'active':''}" data-mood="午后" onclick="setDiaryFilter('午后')">☀️ 午后</button>
      <button class="${diaryFilter==='夜晚'?'active':''}" data-mood="夜晚" onclick="setDiaryFilter('夜晚')">🌙 夜晚</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      <textarea id="diaryTextarea" placeholder="今天想记下点什么…" style="width:100%;background:var(--card-solid);border:1px solid var(--border-strong);border-radius:var(--radius);padding:10px 12px;font-size:13px;outline:none;resize:none;min-height:60px;font-family:inherit"></textarea>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="display:flex;gap:2px" id="moodPicker">
          ${['😊','😌','😢','😡','🤔','🥰','😴','🤩'].map(m =>
            `<button onclick="diaryMood='${m}';renderDiary()" style="width:30px;height:30px;border-radius:50%;border:2px solid ${diaryMood===m?'var(--rose)':'transparent'};background:var(--card);font-size:15px;cursor:pointer">${m}</button>`
          ).join('')}
        </div>
        <button onclick="addDiary()" style="margin-left:auto;background:var(--rose);color:#fff;border:none;border-radius:var(--radius-sm);padding:7px 16px;font-size:12px;cursor:pointer;font-family:inherit">✍️ 写下</button>
      </div>
    </div>
    <div id="diaryList"></div>
  `
  const filtered = diaryFilter==='all' ? diaries : diaries.filter(d => d.timeLabel===diaryFilter)
  const list = document.querySelector('#diaryList')
  if(!list) return
  if(!filtered.length){
    list.innerHTML = `<div class="mem-empty">📝 还没有日记</div>`
    return
  }
  list.innerHTML = filtered.map(d => `
    <div class="diary-item">
      <button class="diary-del" onclick="deleteDiary(${d.id})">✕</button>
      <div class="diary-date"><span class="diary-mood">${d.mood||'📝'}</span>${fmtDate(d.ts)} · ${d.timeLabel||''}</div>
      <div class="diary-text">${escHtml(d.content)}</div>
    </div>
  `).join('')
}

// ===== DASHBOARD =====
function addAnniversary(){
  const name = document.querySelector('#annName')?.value?.trim()
  const date = document.querySelector('#annDate')?.value
  if(!name || !date) return
  anniversaries.push({ id:Date.now(), name, date })
  saveAnniversaries()
  renderDashboard()
}
function deleteAnniversary(id){
  anniversaries = anniversaries.filter(a => a.id !== id)
  saveAnniversaries()
  renderDashboard()
}
function renderDashboard(){
  const content = $('dashContent')
  if(!content) return

  // 汇总所有角色的消息
  let allMsgs = []
  personas.forEach(p => { if(p.chatHistory) allMsgs = allMsgs.concat(p.chatHistory) })

  const totalMsg = allMsgs.length
  const todayK = dayKey(Date.now())
  const todayCount = allMsgs.filter(m => dayKey(m.ts) === todayK).length
  let together = 0
  if(allMsgs.length > 0){
    together = Math.max(1, Math.ceil((Date.now() - allMsgs[0].ts) / 86400000))
  }

  // heatmap
  const counts = {}
  allMsgs.forEach(m => { const k=dayKey(m.ts); counts[k]=(counts[k]||0)+1 })

  content.innerHTML = `
    <div class="dash-grid">
      <div class="dash-card highlight"><div class="dl">💞 在一起</div><div class="dv">${together}<span class="du">天</span></div></div>
      <div class="dash-card"><div class="dl">🗂 记忆</div><div class="dv">${memories.length}<span class="du">条</span></div></div>
      <div class="dash-card"><div class="dl">💬 今日消息</div><div class="dv">${todayCount}<span class="du">条</span></div></div>
      <div class="dash-card"><div class="dl">📨 消息总数</div><div class="dv">${totalMsg}<span class="du">条</span></div></div>
    </div>

    <div class="ann-section">
      <div class="ann-title">📅 纪念日</div>
      <div class="ann-add">
        <input id="annName" placeholder="名称，如：第一次见面">
        <input type="date" id="annDate">
        <button onclick="addAnniversary()">＋</button>
      </div>
      <div id="annList"></div>
    </div>

    <div class="heatmap-wrap">
      <div class="heatmap-header">
        <span>🔥 聊天热力 · 近28天</span>
        <span style="cursor:pointer;font-size:10px" onclick="exportDashboard()">📥 导出</span>
      </div>
      <div class="heatmap-grid" id="heatmapGrid"></div>
    </div>
  `

  // 渲染纪念日
  const annList = document.querySelector('#annList')
  const now = new Date()
  const sorted = [...anniversaries].sort((a,b) => {
    const dA=new Date(a.date),dB=new Date(b.date)
    const nA=new Date(now.getFullYear(),dA.getMonth(),dA.getDate()); if(nA<now)nA.setFullYear(nA.getFullYear()+1)
    const nB=new Date(now.getFullYear(),dB.getMonth(),dB.getDate()); if(nB<now)nB.setFullYear(nB.getFullYear()+1)
    return nA-nB
  })
  if(annList){
    annList.innerHTML = sorted.length === 0
      ? '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px">还没有纪念日 💝</div>'
      : sorted.map(a => {
          const d=new Date(a.date)
          const next=new Date(now.getFullYear(),d.getMonth(),d.getDate()); if(next<now)next.setFullYear(next.getFullYear()+1)
          const diff=Math.ceil((next-now)/86400000)
          const yrs=now.getFullYear()-d.getFullYear()
          let cd = diff===0?'🎉 今天！':diff===1?'📌 明天':`${diff}天`
          return `<div class="ann-item">
            <span class="ann-name">💕 ${escHtml(a.name)}</span>
            <span style="font-size:9px;color:var(--text-muted)">${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} · ${yrs}年</span>
            <span class="ann-cd">${cd}</span>
            <button class="ann-del" onclick="deleteAnniversary(${a.id})">✕</button>
          </div>`
        }).join('')
  }

  // 热力图
  const grid = document.querySelector('#heatmapGrid')
  if(grid){
    let cells = ''
    for(let i=27;i>=0;i--){
      const d=new Date(Date.now()-i*86400000)
      const k=dayKey(d); const c=counts[k]||0
      let l=''
      if(c>0&&c<=3)l='l1';else if(c<=8)l='l2';else if(c<=15)l='l3';else if(c>15)l='l4'
      cells += `<div class="heatmap-cell ${l}" title="${k}: ${c}条">${d.getDate()}</div>`
    }
    grid.innerHTML = cells
  }
}

function exportDashboard(){
  let allMsgs = []
  personas.forEach(p => { if(p.chatHistory) allMsgs = allMsgs.concat(p.chatHistory) })
  const lines = [`沈度 v5 · 数据导出`,`导出时间：${new Date().toLocaleString()}`,`------`,
    `消息总数：${allMsgs.length}`,`记忆总数：${memories.length}`,`日记总数：${diaries.length}`,`------`,`纪念日：`]
  anniversaries.forEach(a => { const d=new Date(a.date); lines.push(`  ${a.name}: ${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`) })
  lines.push('------','近28天消息：')
  document.querySelectorAll('#heatmapGrid .heatmap-cell').forEach(c => lines.push(c.title))
  const blob = new Blob([lines.join('\n')],{type:'text/plain'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`沈度数据_${dayKey(Date.now())}.txt`; a.click()
  URL.revokeObjectURL(url)
}

// ===== MIGRATION =====
function migrateOldData(){
  // 尝试从 v2 迁移
  const oldConfig = localStorage.getItem('sd_chat_config_v2')
  const oldHistory = localStorage.getItem('sd_chat_history_v2')
  const oldMemories = localStorage.getItem('sd_memory_v2')
  const oldDiaries = localStorage.getItem('sd_diary_v2')
  const oldAnniversaries = localStorage.getItem('sd_anniversaries')

  if(oldConfig && !localStorage.getItem(LS_CONFIG)){
    try{
      const oc = JSON.parse(oldConfig)
      config.apiKey = oc.apiKey || ''
      if(!config.activePersonaId) config.activePersonaId = 'shendu'
      saveConfig()
    }catch(e){}
  }

  // 迁移聊天记录到沈度角色
  if(oldHistory && personas.length > 0){
    try{
      const oh = JSON.parse(oldHistory)
      const shendu = personas.find(p => p.id === 'shendu')
      if(shendu && (!shendu.chatHistory || shendu.chatHistory.length === 0)){
        shendu.chatHistory = oh.filter(m => m.role === 'user' || m.role === 'assistant')
        savePersonas()
      }
    }catch(e){}
  }

  if(oldMemories && memories.length === 0){
    try{
      memories = JSON.parse(oldMemories).map(m => ({...m, category:m.category||'默认',tags:[],usageCount:0,lastUsed:null}))
      saveMemories()
    }catch(e){}
  }

  if(oldDiaries && diaries.length === 0){
    try{
      diaries = JSON.parse(oldDiaries).map(d => ({...d, mood:d.mood||'📝'}))
      saveDiaries()
    }catch(e){}
  }

  if(oldAnniversaries && anniversaries.length === 0){
    try{
      anniversaries = JSON.parse(oldAnniversaries)
      saveAnniversaries()
    }catch(e){}
  }
}

// ===== PWA =====
function registerSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(() => {})
  }
}

// ===== INIT =====
;(function init(){
  load()
  migrateOldData()
  updateChatHeader()
  renderAllMessages()
  if(hintBox) hintBox.querySelector('.hint-greeting').textContent = getGreeting()
  registerSW()

  // 点击抽屉外部关闭
  drawerOverlay.addEventListener('click', closeDrawer)

  // 左滑手势关闭抽屉
  let touchStartX = 0
  drawerEl.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX })
  drawerEl.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - touchStartX
    if(dx < -50){ closeDrawer() }
  })

  // Escape 关闭弹窗
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      closeDrawer()
      closePersonaModal()
      closeConfirm()
    }
  })

  console.log('🌙 沈度 v5 已就绪')
  console.log(`   角色数：${personas.length} | 记忆：${memories.length} | 日记：${diaries.length}`)
})()
