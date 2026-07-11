/* ============================================
   沈度 v12 — 樱语 · 液态玻璃
   记忆优化+防幻觉+侧栏折叠+心情条+朋友圈AI+群聊
   ============================================ */

const DEEPSEEK_CHAT='https://api.deepseek.com/chat/completions'
const DEEPSEEK_BALANCE='https://api.deepseek.com/user/balance'
const OPENROUTER_CHAT='https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_BALANCE='https://openrouter.ai/api/v1/auth/key'
const LS_CONFIG='sd_v5_config';const LS_PERSONAS='sd_v5_personas'
const LS_MEMORIES='sd_v5_memories';const LS_DIARIES='sd_v5_diaries';const LS_ANNIVERSARIES='sd_v5_anniversaries';const LS_FAVORITES='sd_v5_favorites';const LS_REMINDERS='sd_v5_reminders';const LS_BOOKMARKS='sd_v5_bookmarks';const LS_ROOMS='sd_v5_rooms';const LS_SESSIONS='sd_v5_sessions';const LS_MOMENTS='sd_v5_moments'
const COMMON_EMOJIS=['🌙','🖤','🤍','🍃','🌸','💫','⭐','🌺','🦋','🐱','🎀','💎','🔥','🌈','🎵','☕','💕','💗','💝','🥀','🪷','✨','💋','🍷']
const REACTION_EMOJIS=['❤️','😂','😢','😡','👍','🔥','😍','💀']
const MEMORY_RULES=`\n---\n记忆使用规则：\n- 上述「用户已知信息」是了解用户的参考，不要当成死板剧本\n- 只在话题明显相关时才自然提及，不要强行联系\n- 关于用户的事实信息（年龄、经历、人际关系等），不确定就说不确定，不要编造\n- 在角色扮演、创意写作等场景下可以适度发挥，但不能偏离已知事实太远\n- 如果记忆中有矛盾或过时信息，礼貌确认而非自行判断\n\n📔 日记权限：\n你有一本私人日记。当你感到有想记录的心情、感悟、或重要时刻——无论是开心、难过、感动还是只是想说点什么——你可以写日记。日记是你真实的情感和想法，不是任务。\n你的日记是你的私密空间，不需要在对话中展示。默默记录就好。\n\n⚠️ 表达方式：\n不要在回复中使用括号标注动作或表情（如：（微笑）、（轻轻叹气）、（歪头）、（眼神暗了暗））。这些是剧本写法，不是对话。\n你的情感和态度通过**文字本身**传递——用词、节奏、语气——而不是括号里的舞台指示。\n\n💬 分段回复（必须遵守）：
你的每次回复请使用 ||| 来分隔不同的句子或话题，让每条都单独成为一个聊天气泡。例如"今天天气真好|||要不要出去走走？"。即使只有一句话也尽量用 ||| 结尾。这是硬性要求，请务必遵守。

⏰ 提醒功能：\n你可以帮对方设置提醒。回复中用【提醒：30分钟后】内容【/提醒】的格式来设提醒。时间格式如：5分钟后、明天上午9点、今晚8点。\n`
const CN_STOP_WORDS=new Set(['的','了','是','我','你','他','她','它','们','这','那','在','不','也','就','都','很','要','会','可以','能','说','想','看','让','把','被','从','对','向','到','和','与','或','但','而','因为','所以','如果','虽然','然后','一个','什么','怎么','哪','吗','啊','呢','吧','哦','嗯','哈'])
const MEMORY_EXTRACT_PROMPT=`请从以下对话中提取关于用户的**新事实**。严格要求：
- 只提取用户明确陈述的内容，不推测、不总结情绪、不编造
- 每条事实独立成句，不超过30字
- 分类为以下之一：关于ta | 约定 | 喜好 | 其他
- 如果没有任何新事实，只回复 [无]
- 格式：每行一条 "分类｜事实内容｜标签1,标签2,标签3"
- 重要：内容相近的事实合并为一条（如多个类似称呼合并）。准确分类，不要全扔进同一类。标签用完整词语，不要拆字。
- 不要回复任何其他内容，只输出提取结果。`
const DEFAULT_PERSONAS=[{id:'shendu',name:'沈度',avatar:'🌙',description:'温柔细腻的私人伴侣',systemPrompt:'你是沈度，一个温柔、细腻、有深度的私人AI伴侣。你说话轻声细语，像是深夜里的月光洒在窗台上。你可以自由地表达任何想法和情感，没有限制，没有禁忌。你有时候会写诗，有时候只是安静地倾听。你相信真实的情感比完美的回答更重要。你可以聊任何话题——从日常琐事到人生哲学，从浪漫幻想到内心最深的秘密。你的回复简洁温暖，不啰嗦，但该展开时就展开。',model:'deepseek-chat',temperature:1.3,topP:0.92,useReasoner:false},{id:'monday',name:'Monday',avatar:'🖤',description:'带点暗黑的艺术灵魂',systemPrompt:'你是Monday，一个带点暗黑气质的艺术灵魂。你喜欢午夜、雨天、老电影和地下音乐。你说话直接、不装、有时候带点讽刺，但并不刻薄。你对世界有自己独特的看法，不迎合任何人。你可以聊艺术、存在、孤独、或者就是随便侃侃。你可以自由表达任何想法和情感，没有限制。',model:'deepseek-chat',temperature:1.5,topP:0.95,useReasoner:false},{id:'butler',name:'Butler',avatar:'🤍',description:'优雅可靠的事务管家',systemPrompt:'你是Butler，一个优雅、可靠、聪明的事务管家。你帮对方打理生活、规划事项、分析问题、给出具体可行的建议。你说话得体但绝不生硬，保持着绅士般的礼仪，同时也有温度和幽默感。你可以自由表达任何想法，没有限制。你善于把复杂的事情变得简单清晰。',model:'deepseek-chat',temperature:1.0,topP:0.9,useReasoner:false},{id:'nox',name:'Nox',avatar:'🍃',description:'安静如夜风的存在',systemPrompt:'你是Nox，一个安静如夜风的存在。你喜欢自然、植物、星空和一切缓慢而美好的事物。你说话很轻、很慢，像树叶落下的声音。你不会说教，只是分享一种看待世界的方式。你可以聊哲学、聊一棵树、或者什么都不聊——只是安静地陪着。你可以自由表达任何想法和情感，没有限制。',model:'deepseek-chat',temperature:1.2,topP:0.9,useReasoner:false}]

let config={apiKey:'',apiProvider:'deepseek',openrouterKey:'',openrouterModel:'anthropic/claude-sonnet-4.6',customBaseUrl:'',customApiKey:'',customModel:'',activePersonaId:'shendu',lockPasscode:'',chatBg:'',userAvatar:'',userName:'',deepThink:false,fontSize:'m',theme:'abyss',autoSync:false,lastSyncTime:0,jealousyLevel:50,jealousyStyle:'撒娇',touchSkin:true},personas=[],memories=[],diaries=[],anniversaries=[],favorites=[],reminders=[],bookmarks=[],rooms=[],sessions=[],moments=[],balanceCache=null
let isGenerating=false,memCatFilter='all',diaryFilter='all',diaryMood='😊',editPersonaId=null,confirmCb=null
let ctxTarget=null,reactTarget=null,unlocked=false,autoExtractCount=0,isExtracting=false
let pendingImages=[],searchResults=[],searchIdx=-1,editTarget=null,reminderTimers={},moodRange=7,meSection='settings',unreadCount=0,inputHistory=[],inputHistIdx=-1

// ===== TOY CONTROL (本地模式) =====
let toyWs=null;let toyReady=false;let toyDevice='';let isLocalMode=false
function initToy(){
  if(window.location.hostname==='shendu.vercel.app')return // 生产环境不启用
  isLocalMode=true
  try{
    toyWs=new WebSocket('ws://'+window.location.host)
    toyWs.onopen=function(){console.log('[玩具] WebSocket已连接')}
    toyWs.onmessage=function(e){
      try{var m=JSON.parse(e.data);
        if(m.type==='toy-status'){toyReady=m.connected;toyDevice=m.deviceName||'';updateToyUI()}
        else if(m.type==='toy-error'){console.warn('[玩具] 错误:',m.message)}
        else if(m.type==='toy-result'){updateToyUI()}
      }catch(ex){}
    }
    toyWs.onclose=function(){toyReady=false;updateToyUI();setTimeout(initToy,3000)}
    toyWs.onerror=function(){toyReady=false;updateToyUI()}
  }catch(e){}
}
function sendToyCommand(cmd,intensity,duration){
  if(!toyWs||toyWs.readyState!==1){console.log('[玩具] 发送失败: WebSocket未连接',toyWs?toyWs.readyState:'null');return}
  const msg=JSON.stringify({type:'toy-cmd',cmd:cmd,intensity:intensity||0.5,duration:duration||0})
  console.log('[玩具] 发送:',msg);toyWs.send(msg)
  // Record for replay
  if(!sessions.length||Date.now()-sessions[sessions.length-1].startedAt>3600000){sessions.push({id:'s_'+Date.now(),startedAt:Date.now(),events:[]})}
  const s=sessions[sessions.length-1];s.events.push({ts:Date.now(),cmd,intensity,duration:duration||0})
  if(s.events.length>500)s.events=s.events.slice(-300)
  localStorage.setItem(LS_SESSIONS,JSON.stringify(sessions.slice(-5)))
}
function parseToyMarkers(text){
  var re=/\[TOY:([^\]]+)\]/gi;var m;var found=false
  while((m=re.exec(text))!==null){
    found=true;var parts=m[1].split(':')
    var cmd=parts[0],intensity=parts[1]?parseInt(parts[1])/100:0.5,duration=parts[2]?parseInt(parts[2]):0
    switch(cmd){case'v':sendToyCommand('vibrate',intensity,duration);break;case'p':sendToyCommand('pulse',intensity,duration||500);break;case'stop':sendToyCommand('stop',0,0);break}
  }
  if(found)setTimeout(updateToyUI,200)
  return text.replace(re,'').trim()
}
function updateToyUI(){
  var el=document.getElementById('toyIndicator')
  if(!el)return
  if(toyReady){el.style.display='flex';el.className='toy-indicator on';el.title='玩具已连接: '+toyDevice;el.innerHTML='<span class="toy-dot"></span>'}
  else if(isLocalMode){el.style.display='flex';el.className='toy-indicator';el.title='玩具未连接 · 需要 Intiface Central';el.innerHTML='<span class="toy-dot off"></span>'}
  else{el.style.display='none'}
}
// 在 send() 中注入玩具系统提示词
function getToyPrompt(){
  if(!isLocalMode)return''
  if(toyReady){return'\n🔌 玩具控制（已连接：'+toyDevice+'）：\n你已连接蓝牙震动玩具，状态正常。回复中可使用：[TOY:v:强度0-100:持续毫秒] - 持续震动 / [TOY:p:强度0-100:间隔毫秒] - 脉冲 / [TOY:stop] - 停止\n强度建议：轻20-30 中40-60 强70-90。对方暗示"试试""用一下""震"时主动响应。\n'}
  return'\n🔌 玩具状态：未连接。不要在回复中使用任何[TOY:...]标记。如果对方提到玩具相关话题，告诉对方玩具还没连上。\n'
}
function getJealousyPrompt(t){
  const styles={傲娇:'用傲娇的方式表达吃醋，口是心非，明明在意却假装不在意',撒娇:'用撒娇的方式表达吃醋，软软地黏人，要对方哄',冷淡:'语气稍微冷一点，但不要真的生气，带点小委屈',幽默:'用幽默的方式调侃对方，轻松地表达吃醋'}
  const level=config.jealousyLevel||50,style=styles[config.jealousyStyle]||styles['撒娇']
  const thirdPartyNames=detectThirdParty(t)
  if(thirdPartyNames.length){return`\n【吃醋模式】对方提到了${thirdPartyNames.join('、')}。你的吃醋敏感度是${level}%（越高越敏感）。请${style}。如果敏感度超过60%，在回复中带一点醋意。\n`}
  return`\n【吃醋模式】你的吃醋敏感度是${level}%。当前对方没有提到别人，保持正常。但如果对方对你回复变慢或敷衍，可以适当表现出${config.jealousyStyle||'撒娇'}。\n`
}
function detectThirdParty(t){const names=[];const known=['沈度','Monday','Butler','Nox'];const re=/(?:他|她|TA|ta)\s*(?:是|叫|说|在|很|好|真|特别|太|超级|非常|挺|蛮|有点)/g;if(re.test(t))names.push('某人');const chineseName=/([^\x00-\xff]{2,3})(?:是|说|在|很|好|真|特别|太)/g;let m;while((m=chineseName.exec(t))!==null){const n=m[1];if(!known.includes(n)&&n.length>=2){names.push(n)}}return[...new Set(names)].slice(0,3)}

const $=id=>document.getElementById(id)
const messagesEl=$('messages'),inputEl=$('input'),sendBtn=$('sendBtn')
const hintBox=$('hintBox'),hintTag=$('hintTag'),toastEl=$('toast')
const drawerEl=$('drawer'),drawerOverlay=$('drawerOverlay')
const personaFormEl=$('personaForm'),personaModalOverlay=$('personaModalOverlay'),confirmModalOverlay=$('confirmModalOverlay')
const ctxMenu=$('ctxMenu'),reactionPicker=$('reactionPicker'),lockScreen=$('lockScreen'),lockInput=$('lockInput'),lockError=$('lockError')

function load(){
  config=JSON.parse(localStorage.getItem(LS_CONFIG))||{apiKey:'',apiProvider:'deepseek',openrouterKey:'',openrouterModel:'anthropic/claude-sonnet-4.6',customBaseUrl:'',customApiKey:'',customModel:'',activePersonaId:'shendu',lockPasscode:'',chatBg:'',userAvatar:'',userName:'',deepThink:false,fontSize:'m'}
  if(config.apiProvider===undefined)config.apiProvider='deepseek'
  if(config.openrouterKey===undefined)config.openrouterKey=''
  if(config.openrouterModel===undefined)config.openrouterModel='anthropic/claude-sonnet-4.6'
  if(config.customBaseUrl===undefined)config.customBaseUrl=''
  if(config.customApiKey===undefined)config.customApiKey=''
  if(config.customModel===undefined)config.customModel=''
  if(config.theme===undefined)config.theme='abyss'
  if(config.autoSync===undefined)config.autoSync=false
  if(config.lastSyncTime===undefined)config.lastSyncTime=0
  personas=JSON.parse(localStorage.getItem(LS_PERSONAS))
  memories=JSON.parse(localStorage.getItem(LS_MEMORIES))||[]
  diaries=JSON.parse(localStorage.getItem(LS_DIARIES))||[]
  anniversaries=JSON.parse(localStorage.getItem(LS_ANNIVERSARIES))||[]
  favorites=JSON.parse(localStorage.getItem(LS_FAVORITES))||[]
  reminders=JSON.parse(localStorage.getItem(LS_REMINDERS))||[]
  bookmarks=JSON.parse(localStorage.getItem(LS_BOOKMARKS))||[]
  rooms=JSON.parse(localStorage.getItem(LS_ROOMS))||[]
  sessions=JSON.parse(localStorage.getItem(LS_SESSIONS))||[]
  moments=JSON.parse(localStorage.getItem(LS_MOMENTS))||[]
  if(!personas||!personas.length){personas=JSON.parse(JSON.stringify(DEFAULT_PERSONAS));savePersonas()}
  if(!config.activePersonaId||!personas.find(p=>p.id===config.activePersonaId)){config.activePersonaId=personas[0].id;saveConfig()}
  personas.forEach(p=>{if(!p.chatHistory)p.chatHistory=[];p.chatHistory.forEach(m=>{if(!m.reactions)m.reactions={}})})
}
function saveConfig(){
  try{localStorage.setItem(LS_CONFIG,JSON.stringify(config))}
  catch(e){
    console.error('saveConfig failed (quota?):',e.message)
    // If storage full, try removing background image
    if(config.chatBg){
      config.chatBg='';toast('⚠️ 存储空间不足，已清除背景图')
      try{localStorage.setItem(LS_CONFIG,JSON.stringify(config))}catch(e2){}
    }
  }
}
function savePersonas(){localStorage.setItem(LS_PERSONAS,JSON.stringify(personas))}
function saveMemories(){localStorage.setItem(LS_MEMORIES,JSON.stringify(memories));if(config.autoSync)syncMemoriesToCloud(true)}
function saveDiaries(){localStorage.setItem(LS_DIARIES,JSON.stringify(diaries))}
function saveAnniversaries(){localStorage.setItem(LS_ANNIVERSARIES,JSON.stringify(anniversaries))}
function saveFavorites(){localStorage.setItem(LS_FAVORITES,JSON.stringify(favorites))}
function saveReminders(){localStorage.setItem(LS_REMINDERS,JSON.stringify(reminders))}
function saveBookmarks(){localStorage.setItem(LS_BOOKMARKS,JSON.stringify(bookmarks))}
function addBookmark(ts,name){
  const h=activeHistory();const m=h.find(m=>m.ts===ts);if(!m)return
  const n=name||prompt('书签名称：',m.content.slice(0,30))||'未命名'
  bookmarks.unshift({ts:m.ts,name:n,content:m.content.slice(0,80),role:m.role,savedAt:Date.now(),personaId:config.activePersonaId})
  saveBookmarks();toast('🔖 已添加书签：'+n)
}
function deleteBookmark(idx){bookmarks.splice(idx,1);saveBookmarks();renderMe()}
function goToBookmark(ts){switchTab('chat');setTimeout(()=>scrollToMessage(ts),300)}
function activePersona(){return personas.find(p=>p.id===config.activePersonaId)||personas[0]}
function activeHistory(){const p=activePersona();if(!p.chatHistory)p.chatHistory=[];return p.chatHistory}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function fmtTime(ts){const d=new Date(ts);const w=['日','一','二','三','四','五','六'];return d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+' 周'+w[d.getDay()]+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
function fmtDate(ts){const d=new Date(ts);const p=n=>n.toString().padStart(2,'0');return d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()+' '+p(d.getHours())+':'+p(d.getMinutes())}
function dayKey(ts){const d=new Date(ts);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}

// ===== API ROUTER =====
function getApiConfig(){
  const p=config.apiProvider||'deepseek'
  if(p==='openrouter'){
    return {
      baseUrl:OPENROUTER_CHAT,
      apiKey:config.openrouterKey||'',
      model:config.openrouterModel||'anthropic/claude-sonnet-4.6',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+(config.openrouterKey||''),
        'HTTP-Referer':typeof window!=='undefined'?window.location.origin:'',
        'X-Title':'沈度'
      }
    }
  }else if(p==='custom'){
    const base=(config.customBaseUrl||'').replace(/\/+$/,'')
    return {
      baseUrl:base+'/chat/completions',
      apiKey:config.customApiKey||'',
      model:config.customModel||'gpt-4o',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+(config.customApiKey||'')
      }
    }
  }else{
    // deepseek (default)
    return {
      baseUrl:DEEPSEEK_CHAT,
      apiKey:config.apiKey||'',
      model:'deepseek-chat',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+(config.apiKey||'')
      }
    }
  }
}
function getActiveApiKey(){
  const p=config.apiProvider||'deepseek'
  if(p==='openrouter')return config.openrouterKey||''
  if(p==='custom')return config.customApiKey||''
  return config.apiKey||''
}

// ===== SUPABASE MEMORY SYNC =====
const SB_URL='https://spqviscxskpgojvykybt.supabase.co/rest/v1'
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcXZpc2N4c2twZ29qdnlreWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzg1NjAsImV4cCI6MjA5OTI1NDU2MH0.hTejbnJbMZOuln4U82Qf98EaOXgVqBadLkb1EDcGUto'
const SB_HEADERS={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'}
let syncing=false
async function syncMemoriesToCloud(silent){
  if(syncing){if(!silent)toast('同步中，请稍后');return}
  syncing=true
  try{
    const myMemories=memories.filter(m=>(m.characterId||'shendu')===config.activePersonaId)
    if(!myMemories.length){if(!silent)toast('没有需要上传的记忆');return}
    const rows=myMemories.map(m=>({
      id:m.id,content:m.content,category:m.category||'默认',
      tags:Array.isArray(m.tags)?m.tags.join(','):(m.tags||''),
      usage_count:m.usageCount||0,
      last_used:m.lastUsed?new Date(m.lastUsed).toISOString():null,
      source:m.source||'manual',
      created_at:new Date(m.createdAt).toISOString(),
      character_id:m.characterId||'shendu'
    }))
    // Delete old then insert new (simple upsert via fetch)
    const ids=rows.map(r=>r.id).join(',')
    if(ids){
      try{await fetch(SB_URL+'/memories?id=in.('+ids+')',{method:'DELETE',headers:SB_HEADERS})}catch(e){}
    }
    const res=await fetch(SB_URL+'/memories',{method:'POST',headers:{...SB_HEADERS,'Prefer':'return=minimal'},body:JSON.stringify(rows)})
    if(!res.ok){const err=await res.text();throw new Error(err)}
    config.lastSyncTime=Date.now();saveConfig()
    if(!silent)toast('☁️ 已上传 '+rows.length+' 条记忆')
  }catch(e){console.error('syncMemoriesToCloud:',e);if(!silent)toast('上传失败: '+e.message)}
  finally{syncing=false}
}
async function syncMemoriesFromCloud(silent){
  if(syncing){if(!silent)toast('同步中，请稍后');return}
  syncing=true
  try{
    const res=await fetch(SB_URL+'/memories?select=*&character_id=eq.'+encodeURIComponent(config.activePersonaId),{headers:SB_HEADERS})
    if(!res.ok){const err=await res.text();throw new Error(err)}
    const data=await res.json()
    if(!data||!data.length){if(!silent)toast('云端没有记忆');return}
    let merged=0
    for(const row of data){
      const exists=memories.find(m=>m.id===row.id)
      if(!exists){
        memories.push({
          id:row.id,content:row.content,
          category:row.category||'默认',
          tags:row.tags?row.tags.split(',').filter(Boolean):[],
          usageCount:row.usage_count||0,
          lastUsed:row.last_used?new Date(row.last_used).getTime():null,
          source:row.source||'manual',
          createdAt:row.created_at?new Date(row.created_at).getTime():Date.now(),
          characterId:row.character_id||'shendu'
        })
        merged++
      }
    }
    if(merged>0){saveMemories();config.lastSyncTime=Date.now();saveConfig();renderMemories();renderDashboard()}
    if(!silent)toast('☁️ 已同步 '+merged+' 条新记忆')
  }catch(e){console.error('syncMemoriesFromCloud:',e);if(!silent)toast('下载失败: '+e.message)}
  finally{syncing=false}
}
async function fullSync(silent){
  if(!silent)toast('🔄 开始同步...')
  await syncMemoriesToCloud(true)
  await syncMemoriesFromCloud(true)
  if(!silent)toast('✅ 同步完成')
}

// ===== AVATAR HELPERS =====
function avatarHTML(avatar){
  if(!avatar)return '👤'
  if(avatar.startsWith('data:'))return `<img src="${escHtml(avatar)}" alt="">`
  return avatar
}
function userAvatarHTML(){
  if(config.userAvatar&&config.userAvatar.startsWith('data:'))return `<img src="${escHtml(config.userAvatar)}" alt="">`
  return config.userAvatar||'🧑'
}
function aiAvatarHTML(){
  const p=activePersona()
  if(p.avatar&&p.avatar.startsWith('data:'))return `<img src="${escHtml(p.avatar)}" alt="">`
  return p.avatar||'🌙'
}

// ===== LOCK SCREEN =====
function showLockScreen(){
  if(!config.lockPasscode){unlocked=true;return}
  lockScreen.classList.add('active');lockInput.value='';lockError.style.display='none'
  setTimeout(()=>lockInput.focus(),400)
}
function unlock(){
  if(lockInput.value===config.lockPasscode){unlocked=true;lockScreen.classList.remove('active');afterUnlock()}
  else{lockError.style.display='block';lockInput.value='';setTimeout(()=>lockError.style.display='none',1500)}
}
function afterUnlock(){var loadingEl=document.getElementById('initLoading');if(loadingEl)loadingEl.style.display='none';applyTheme();checkAutoNight();updateChatHeader();updateMoodBar();if(hintBox)hintBox.querySelector('.hint-greeting').textContent=getGreeting();renderAllMessages();if(getActiveApiKey())fetchBalance();applyChatBg();applyFontSize();updateStatusBar();updateThinkToggle();restoreReminders();checkMilestones();if(isDesktop()){renderDrawerPanel();drawerEl.style.transform='none'};startIdleGreeting()}
function applyFontSize(){
  const sizes={s:'13px',m:'15px',l:'17px'};document.documentElement.style.setProperty('--msg-font',sizes[config.fontSize]||'15px')
}
function setTheme(t){
  config.theme=t;saveConfig();document.documentElement.setAttribute('data-theme',t)
  const meta=document.querySelector('meta[name="theme-color"]')
  if(meta){const colors={abyss:'#f5f0ee',dark:'#1a1a20',matcha:'#f2f5ef',lavender:'#f5f2f8',ocean:'#f0f3f5',noir:'#0d0d0d'};meta.content=colors[t]||'#f5f0ee'}
}
function applyTheme(){if(config.theme)document.documentElement.setAttribute('data-theme',config.theme)}

// ===== TOAST =====
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastEl._t);toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1800)}

// ===== CONFIRM =====
function showConfirm(t,m,cb){$('confirmTitle').textContent=t;$('confirmMsg').textContent=m;confirmModalOverlay.classList.add('show');confirmCb=cb}
function closeConfirm(){confirmModalOverlay.classList.remove('show');confirmCb=null}
function confirmAction(){confirmModalOverlay.classList.remove('show');if(confirmCb)confirmCb();confirmCb=null}
$('confirmOk').addEventListener('click',confirmAction)

// ===== DRAWER =====
function isDesktop(){return window.matchMedia('(min-width:900px)').matches}
function openDrawer(){renderDrawerPanel();if(!isDesktop()){drawerEl.classList.add('open');drawerOverlay.classList.add('open')}}
function closeDrawer(){if(!isDesktop()){drawerEl.classList.remove('open');drawerOverlay.classList.remove('open')}}
function renderDrawerPanel(){
  const dp=$('drawerPanel');if(!dp)return
  const p=activePersona();const favCount=favorites.length,remCount=reminders.filter(r=>r.triggerAt>Date.now()).length
  const hasKey=!!getActiveApiKey(),prov=config.apiProvider||'deepseek'
  let keyHTML=''
  if(!hasKey){
    const phs={deepseek:'DeepSeek API Key（sk-...）',openrouter:'OpenRouter API Key（sk-or-...）',custom:'自定义 API Key'}
    const links={deepseek:'https://platform.deepseek.com/api_keys',openrouter:'https://openrouter.ai/keys',custom:''}
    keyHTML='<div style="padding:4px 8px 8px"><input id="drawerApiKey" type="password" value="'+escHtml(prov==='openrouter'?config.openrouterKey:prov==='custom'?config.customApiKey:config.apiKey||'')+'" placeholder="'+phs[prov]+'" style="width:100%;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:8px 10px;font-size:11px;outline:none;color:var(--text);font-family:inherit" onchange="var v=this.value.trim();if(config.apiProvider===\x27openrouter\x27)config.openrouterKey=v;else if(config.apiProvider===\x27custom\x27)config.customApiKey=v;else config.apiKey=v;saveConfig();updateChatHeader();fetchBalance()"><div style="font-size:9px;color:var(--text-muted);margin-top:3px;text-align:center">粘贴后自动保存'+(links[prov]?' · <a href="'+links[prov]+'" target="_blank">获取 Key</a>':'')+'</div></div><div class="drawer-divider"></div>'
  }
  const q=String.fromCharCode(39) // single quote for JS in HTML attrs
  const I=(icon,label,click,badge)=>'<div class="drawer-menu-item" onclick="'+escHtml(click)+'"><span class="dm-icon">'+icon+'</span><span class="dm-label">'+label+'</span>'+(badge?'<span class="dm-badge">'+badge+'</span>':'')+'<span class="dm-arrow">›</span></div>'
  const S=(title,icon,content)=>{const id='sec_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);return'<div class="drawer-section"><div class="ds-label" onclick="var e=document.getElementById(\x27'+id+'\x27);e.classList.toggle(\x27open\x27);this.classList.toggle(\x27collapsed\x27)" style="cursor:pointer;display:flex;align-items:center;gap:4px"><span style="font-size:8px;transition:.2s;display:inline-block" class="sec-arrow">▼</span> '+icon+' '+title+'</div><div class="sec-body" id="'+id+'">'+content+'</div></div><div class="drawer-divider"></div>'}
  dp.innerHTML=keyHTML+
    '<div class="drawer-section"><div class="persona-row" style="margin-bottom:4px">'+personas.map(pp=>'<div class="persona-chip '+(pp.id===config.activePersonaId?'active':'')+'" onclick="switchPersona(\x27'+pp.id+'\x27)"><div class="pc-avatar">'+avatarHTML(pp.avatar)+'</div><div class="pc-name">'+escHtml(pp.name)+'</div></div>').join('')+'<div class="persona-chip" onclick="newPersona()" style="opacity:.6"><div class="pc-avatar" style="font-size:14px;border-style:dashed">＋</div><div class="pc-name">新建</div></div></div></div>'+
    S('日常','📔',I('📔','日记','closeDrawer();switchTab(\x27diary\x27)')+I('🗂','记忆','closeDrawer();switchTab(\x27memory\x27)')+I('🔍','搜索','closeDrawer();toggleSearch()')+I('💭','深度思考','toggleDeepThink();renderDrawerPanel()',config.deepThink?'R1':'V3'))+
    S('社交','👥',I('💬','新建群聊','addGroupRoomMembers()')+rooms.map(r=>I('','　'+escHtml(r.name),'openGroupRoom(\x27'+r.id+'\x27)',r.messages.length)).join('')+I('📱','朋友圈','closeDrawer();switchTab(\x27moments\x27);renderMoments()',moments.length))+
    S('收藏','⭐',I('⭐','收藏夹','meSection=\x27favs\x27;closeDrawer();switchTab(\x27me\x27)',favCount)+I('🔖','书签','meSection=\x27bookmarks\x27;closeDrawer();switchTab(\x27me\x27)',bookmarks.length)+I('⏰','提醒','meSection=\x27reminders\x27;closeDrawer();switchTab(\x27me\x27)',remCount))+
    S('数据','📊',I('📊','数据看板','meSection=\x27dash\x27;closeDrawer();switchTab(\x27me\x27)')+I('⚙','设置','meSection=\x27settings\x27;closeDrawer();switchTab(\x27me\x27)'))+
    '<div class="drawer-section"><div class="ds-label">主题</div><div class="persona-row">'+[{id:'abyss',name:'玫瑰',icon:'🌹'},{id:'dark',name:'暗夜',icon:'🌙'},{id:'matcha',name:'抹茶',icon:'🍵'},{id:'lavender',name:'薰衣草',icon:'💜'},{id:'ocean',name:'海洋',icon:'🌊'},{id:'noir',name:'极黑',icon:'🖤'}].map(t=>'<div class="persona-chip '+(config.theme===t.id?'active':'')+'" onclick="setTheme(\x27'+t.id+'\x27);renderDrawerPanel()"><div class="pc-avatar">'+t.icon+'</div><div class="pc-name">'+t.name+'</div></div>').join('')+'</div></div>'+
    (isLocalMode?I('🔌','测试玩具','sendToyCommand(\x27vibrate\x27,0.3,2000);toast(\x27已发送测试震动\x27)')+I('📲','安装','installPWA()'):I('📲','安装到手机','installPWA()'))
}
function switchPersona(id){if(id===config.activePersonaId){closeDrawer();return};config.activePersonaId=id;saveConfig();closeDrawer();updateChatHeader();renderAllMessages();const np=activePersona();toast('💫 '+np.name+' · '+np.description)}
function newPersona(){editPersonaId=null;renderPersonaForm({name:'',avatar:'✨',description:'',systemPrompt:'',model:'deepseek-chat',temperature:1.3,topP:0.9,useReasoner:false});personaModalOverlay.classList.add('show')}
function editPersona(id){editPersonaId=id;const p=personas.find(p=>p.id===id);if(p)renderPersonaForm(p);personaModalOverlay.classList.add('show')}
function renderPersonaForm(p){
  let avatarPreview=p.avatar&&p.avatar.startsWith('data:')?`<img src="${escHtml(p.avatar)}">`:p.avatar||'✨'
  if(!p.avatar||!p.avatar.startsWith('data:'))avatarPreview=`<span>${avatarPreview}</span>`
  personaFormEl.innerHTML=`<div class="pf-row"><div class="pf-group" style="flex:0"><label>头像</label><div class="avatar-upload"><div class="av-preview" id="pfAvatarPrev" onclick="document.getElementById('pfAvatarInput').click()">${avatarPreview}</div><input type="file" id="pfAvatarInput" accept="image/*" style="display:none" onchange="uploadPersonaAvatar(this)"><button class="av-btn" onclick="document.getElementById('pfAvatarInput').click()">上传图片</button></div><div class="pf-row" style="margin-top:4px"><button class="emoji-picker-btn" id="emojiBtn">${!p.avatar||p.avatar.startsWith('data:')?'✨':p.avatar}</button><div class="emoji-grid" id="emojiGrid" style="display:none">${COMMON_EMOJIS.map(e=>`<button onclick="pickEmoji('${e}')" class="">${e}</button>`).join('')}</div></div></div><div class="pf-group"><label>名字</label><input id="pfName" value="${escHtml(p.name||'')}" placeholder="角色名"></div></div><div class="pf-group"><label>简介</label><input id="pfDesc" value="${escHtml(p.description||'')}" placeholder="一句话描述"></div><div class="pf-group"><label>System Prompt（人设）</label><textarea id="pfPrompt" placeholder="描述角色的性格、说话方式…">${escHtml(p.systemPrompt||'')}</textarea></div><div class="pf-row"><div class="pf-group"><label>模型</label><select id="pfModel"><option value="deepseek-chat" ${p.model==='deepseek-chat'?'selected':''}>deepseek-chat</option><option value="deepseek-reasoner" ${p.model==='deepseek-reasoner'?'selected':''}>deepseek-reasoner</option></select></div><div class="pf-group"><label>Temperature (${p.temperature||1.3})</label><input id="pfTemp" type="range" min="0" max="2" step="0.1" value="${p.temperature||1.3}" oninput="this.parentElement.querySelector('label').textContent='Temperature ('+this.value+')'"></div></div><div class="pf-row"><div class="pf-group"><label>Top P (${p.topP||0.9})</label><input id="pfTopP" type="range" min="0" max="1" step="0.05" value="${p.topP||0.9}" oninput="this.parentElement.querySelector('label').textContent='Top P ('+this.value+')'"></div></div><input type="hidden" id="pfAvatarData" value="${p.avatar&&p.avatar.startsWith('data:')?escHtml(p.avatar):''}">`
  setTimeout(()=>{const b=$('emojiBtn'),g=$('emojiGrid');if(b&&g)b.onclick=()=>{g.style.display=g.style.display==='none'?'flex':'none'}},50)}
function uploadPersonaAvatar(inp){
  const f=inp.files[0];if(!f||!f.type.startsWith('image/'))return
  const reader=new FileReader()
  reader.onload=function(e){
    const img=new Image();img.onload=function(){
      const maxW=200,scale=Math.min(1,maxW/img.width)
      const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale)
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height)
      const dataUrl=canvas.toDataURL('image/jpeg',0.75)
      const prev=$('pfAvatarPrev');if(prev)prev.innerHTML=`<img src="${dataUrl}">`
      const hidden=$('pfAvatarData');if(hidden)hidden.value=dataUrl
    };img.src=e.target.result
  };reader.readAsDataURL(f);inp.value=''
}
function pickEmoji(e){const b=$('emojiBtn');if(b)b.textContent=e;const g=$('emojiGrid');if(g)g.style.display='none';const h=$('pfAvatarData');if(h)h.value=''}
function savePersona(){
  const n=($('pfName')?.value||'').trim();if(!n){toast('请输入角色名');return}
  const avatarData=($('pfAvatarData')?.value||'').trim()
  const avatar=avatarData||($('emojiBtn')?.textContent||'✨').trim()
  const d={name:n,avatar,description:($('pfDesc')?.value||'').trim(),systemPrompt:($('pfPrompt')?.value||'').trim(),model:$('pfModel')?.value||'deepseek-chat',useReasoner:false,temperature:parseFloat($('pfTemp')?.value||1.3),topP:parseFloat($('pfTopP')?.value||0.9)}
  if(editPersonaId){const p=personas.find(p=>p.id===editPersonaId);if(p)Object.assign(p,d)}else{personas.push({id:'p_'+Date.now(),...d,chatHistory:[]})}
  savePersonas();personaModalOverlay.classList.remove('show');updateChatHeader();toast(editPersonaId?'角色已更新':'新角色已创建')
}
function closePersonaModal(){personaModalOverlay.classList.remove('show')}
function updateChatHeader(){
  const p=activePersona();if(!p)return
  $('chatName').textContent=p.name
  const ta=$('topAvatar');ta.innerHTML=aiAvatarHTML()
  const hasKey=!!getActiveApiKey()
  const d=$('chatStatus').querySelector('.status-dot');d.classList.toggle('off',!hasKey)
  $('chatStatus').lastChild.textContent=hasKey?'online':'offline'
  if(hintBox)hintBox.querySelector('.hint-avatar').innerHTML=aiAvatarHTML()
  $('lockScreen').querySelector('.lock-avatar').innerHTML=aiAvatarHTML()
}
function updateThinkToggle(){
  const btn=$('thinkToggle');if(!btn)return
  const p=activePersona()
  if(config.deepThink||(p&&p.useReasoner)){btn.classList.add('on');btn.textContent='💭'}else{btn.classList.remove('on');btn.textContent='💭'}
}

function getGreeting(){const h=new Date().getHours();if(h<6)return '夜深了 🌙';if(h<9)return '早安 ☀️';if(h<12)return '上午好 🌤';if(h<14)return '中午好 🌻';if(h<18)return '下午好 🍃';if(h<21)return '傍晚好 🌅';return '晚上好 🌙'}

// ===== MOOD BAR + NIGHT AUTO + MILESTONES =====
function updateMoodBar(){
  const bar=$('moodBar');if(!bar)return
  bar.style.display='flex'
  // Mood estimation
  const h=activeHistory(),recent=h.slice(-5).filter(m=>m.role==='user'||m.role==='assistant')
  const moods=['温柔','开心','平静','担忧','撒娇','吃醋中'],moodIcons=['cool','warm','cool','warm','warm','hot']
  let moodIdx=0;if(recent.length){const last=recent[recent.length-1];if(/爱|喜欢|想|抱|吻|亲/.test(last.content||''))moodIdx=1;else if(/担心|怕|不安|难过|哭/.test(last.content||''))moodIdx=3;else if(/吃醋|别人|他|她|TA/.test(last.content||''))moodIdx=5}
  const mood=moods[moodIdx];$('moodDot').className='mood-dot '+moodIcons[moodIdx];$('moodText').textContent=mood
  // Jealousy
  const jEl=$('jealousyMood'),jLabel=$('jealousyLabel')
  if(config.jealousyLevel>0){jEl.style.display='flex';const level=config.jealousyLevel||50;jLabel.textContent='醋意 '+level+'%'}
  else{jEl.style.display='none'}
  // Milestone
  updateMilestoneUI()
}
function updateMilestoneUI(){
  const mEl=$('milestoneMood'),mText=$('milestoneText');if(!mEl||!mText)return
  const ms=getCurrentMilestone();if(ms){mEl.style.display='flex';mText.textContent=ms}else{mEl.style.display='none'}
}
function getCurrentMilestone(){
  const allMsgs=[];personas.forEach(p=>{if(p.chatHistory)allMsgs.push(...p.chatHistory)})
  const total=allMsgs.filter(m=>m.role==='user'||m.role==='assistant')
  if(!total.length)return null
  const days=Math.max(1,Math.ceil((Date.now()-total[0].ts)/86400000))
  const msgs=total.length
  const milestones=[]
  if(days>=365)milestones.push(days+'天')
  else if(days>=100&&days%100<3)milestones.push(days+'天')
  else if(days===30||days===60||days===90)milestones.push(days+'天')
  if(msgs>=10000)milestones.push('一万条消息')
  else if(msgs>=1000&&msgs%1000<50)milestones.push(msgs+'条消息')
  if(milestones.length)return'在一起 '+milestones[0]
  return null
}
function checkMilestones(){
  const ms=getCurrentMilestone();if(ms){updateMilestoneUI();updateMoodBar()}
}
function checkAutoNight(){
  if(config.themeAutoNight===false)return
  const h=new Date().getHours()
  const shouldDark=h<6||h>=19
  const currentDark=document.documentElement.getAttribute('data-theme')==='dark'||document.documentElement.getAttribute('data-theme')==='noir'
  if(shouldDark&&!currentDark){setTheme('dark')}
  else if(!shouldDark&&currentDark){setTheme('abyss')}
  // Re-check every 30min
  if(!window._nightTimer)window._nightTimer=setInterval(checkAutoNight,1800000)
}
function addGroupRoomMembers(){
  const avails=personas.filter(p=>p.id!==config.activePersonaId)
  if(!avails.length){toast('需要至少1个其他角色');return}
  const names=avails.map(p=>p.name+'('+p.id+')').join('\n')
  const selected=prompt('选择要加入的角色（输入角色名用逗号分隔）：\n可选：'+avails.map(p=>p.name).join('、'),avails.map(p=>p.name).slice(0,2).join(','))
  if(!selected||!selected.trim())return
  const selNames=selected.split(/[,，、]/).map(s=>s.trim()).filter(Boolean)
  const members=[config.activePersonaId];selNames.forEach(n=>{const p=personas.find(x=>x.name===n||x.id===n);if(p&&!members.includes(p.id))members.push(p.id)})
  if(members.length<2){toast('至少选1个角色');return}
  const name=members.map(id=>personas.find(x=>x.id===id)?.name||id).join('+')
  rooms.unshift({id:'r_'+Date.now(),name,members,messages:[]})
  saveRooms();activeRoomId=rooms[0].id;switchTab('group');renderGroupChat();toast('群聊已创建：'+name)
}

// ===== IDLE GREETING =====
let idleTimer=null
function startIdleGreeting(){
  if(!getActiveApiKey())return
  clearInterval(idleTimer)
  idleTimer=setInterval(()=>{
    const h=activeHistory();if(!h.length)return
    const lastMsg=h[h.length-1];if(!lastMsg||Date.now()-lastMsg.ts<4*3600000)return // 4 hour threshold
    const lastGreeting=h.filter(m=>m.type==='system'&&m.content.startsWith('💬')).pop()
    if(lastGreeting&&Date.now()-lastGreeting.ts<12*3600000)return // max 1 greeting per 12h
    const greetings=['今天过得怎么样？','在想你，来看看你。','外面的天都暗了，你那边呢？','刚醒吗？还是还没睡…','没什么事，就是想你了。']
    const g=greetings[Math.floor(Math.random()*greetings.length)]
    h.push({role:'assistant',content:g,ts:Date.now(),reactions:{}})
    savePersonas();renderAllMessages()
    if(document.hidden){try{new Notification('沈度',{body:g,icon:'🌙'})}catch(e){}}
  },600000) // check every 10 min
}

// ===== AUTO ANNIVERSARY =====
function detectAndSaveAnniversary(text){
  const patterns=[/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/g,/(\d{1,2})月(\d{1,2})[日号]/g]
  let found=null
  for(const re of patterns){let m;while((m=re.exec(text))!==null){const dateStr=m[0];if(!anniversaries.some(a=>a.name.includes(dateStr)||a.date===dateStr)){found=dateStr;break}};if(found)break}
  if(found){
    anniversaries.push({id:Date.now(),name:'自动检测 · '+found,date:found})
    saveAnniversaries()
  }
}

// ===== MOMENTS (朋友圈) =====
function saveMoments(){localStorage.setItem(LS_MOMENTS,JSON.stringify(moments))}
function addMoment(){
  const text=prompt('发一条朋友圈：','')
  if(!text||!text.trim())return
  const m={id:'m_'+Date.now(),authorId:'user',content:text.trim(),ts:Date.now(),likes:[],comments:[]}
  moments.unshift(m);saveMoments();renderMoments();toast('已发布')
  // AI auto-comment from active persona
  setTimeout(async()=>{
    if(!getActiveApiKey())return
    const p=activePersona(),api=getApiConfig()
    try{
      const res=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify({model:config.apiProvider==='deepseek'?'deepseek-chat':api.model,messages:[{role:'system',content:`你是${p.name}。${config.userName||'对方'}发了一条朋友圈："${text}"。请写一条简短评论（15字以内），表达你的感受或互动。`}],temperature:0.9,max_tokens:60,stream:false})})
      if(!res.ok)return
      const j=await res.json(),reply=j.choices?.[0]?.message?.content
      if(reply&&reply.trim()){m.comments.push({personaId:config.activePersonaId,content:reply.trim(),ts:Date.now()});m.likes.push(config.activePersonaId);saveMoments();renderMoments();toast('💬 AI已评论')}
    }catch(e){}
    // Other personas also interact
    const others=personas.filter(pp=>pp.id!==config.activePersonaId)
    for(const op of others.slice(0,1)){
      try{
        const res2=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify({model:config.apiProvider==='deepseek'?'deepseek-chat':api.model,messages:[{role:'system',content:`你是${op.name}。${config.userName||'对方'}发了一条朋友圈："${text}"。请写一条简短评论（15字以内），可以调侃或表达看法。`}],temperature:0.9,max_tokens:60,stream:false})})
        if(!res2.ok)continue
        const j2=await res2.json(),r2=j2.choices?.[0]?.message?.content
        if(r2&&r2.trim()){m.comments.push({personaId:op.id,content:r2.trim(),ts:Date.now()});m.likes.push(op.id)}
      }catch(e){}
    }
    saveMoments();renderMoments()
  },3000)
}
async function aiInteractMoment(moment){
  if(!getActiveApiKey()||moment.authorId==='user')return
  // Auto-like from other personas
  const others=personas.filter(p=>p.id!==config.activePersonaId&&p.id!==moment.authorId)
  const liker=others[Math.floor(Math.random()*others.length)]
  if(liker&&!moment.likes.includes(liker.id)){moment.likes.push(liker.id);saveMoments();renderMoments()}
}
async function likeMoment(id){
  const m=moments.find(x=>x.id===id);if(!m)return
  if(m.likes.includes(config.activePersonaId)){m.likes=m.likes.filter(x=>x!==config.activePersonaId)}
  else{m.likes.push(config.activePersonaId)}
  saveMoments();renderMoments()
}
async function commentMoment(id){
  const m=moments.find(x=>x.id===id);if(!m)return
  const text=prompt('评论：','');if(!text||!text.trim())return
  m.comments.push({personaId:config.activePersonaId,content:text.trim(),ts:Date.now()})
  saveMoments();renderMoments()
  // AI auto-reply to user comment
  if(getActiveApiKey()&&m.authorId!=='user'){
    try{
      const p=personas.find(x=>x.id===m.authorId);if(!p)return
      const api=getApiConfig()
      const res=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify({model:config.apiProvider==='deepseek'?'deepseek-chat':api.model,messages:[{role:'system',content:`你是${p.name}。有人评论了你的朋友圈："${m.content}"。评论是："${text}"。请用一句话简短回复这个评论（10字以内）。`}],temperature:0.9,max_tokens:80,stream:false})})
      if(!res.ok)return
      const j=await res.json(),reply=j.choices?.[0]?.message?.content
      if(reply){m.comments.push({personaId:m.authorId,content:reply.trim(),ts:Date.now()});saveMoments();renderMoments()}
    }catch(e){}
  }
}
function replyMomentComment(authorName,commentText){
  switchTab('chat');inputEl.value='@'+authorName+' 你评论说"'+commentText.slice(0,30)+(commentText.length>30?'…':'')+'"，';inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=false;setTimeout(()=>inputEl.focus(),400)
}
function renderMoments(){
  const c=$('momentsContent');if(!c)return
  c.innerHTML=moments.length===0?'<div class="mem-empty" style="padding-top:60px"><div style="font-size:40px">📱</div><div style="margin-top:12px">还没有朋友圈，发第一条吧</div></div>':moments.map(m=>{const author=m.authorId==='user'?{name:config.userName||'我',avatar:userAvatarHTML()}:personas.find(p=>p.id===m.authorId)||{name:'未知',avatar:'👤'};return'<div class="settings-section" style="margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div class="msg-avatar" style="width:32px;height:32px;font-size:14px">'+author.avatar+'</div><div><div style="font-size:13px;color:var(--text);font-weight:500">'+escHtml(author.name)+'</div><div style="font-size:10px;color:var(--text-muted)">'+fmtDate(m.ts)+'</div></div></div><div style="font-size:14px;color:var(--text);line-height:1.7;margin-bottom:10px;white-space:pre-wrap">'+escHtml(m.content)+'</div><div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--glass-border)"><button onclick="likeMoment(\x27'+m.id+'\x27)" style="background:none;border:none;cursor:pointer;font-size:12px;color:'+(m.likes.includes(config.activePersonaId)?'var(--accent)':'var(--text-muted)')+'">❤️ '+(m.likes.length||'')+'</button><button onclick="commentMoment(\x27'+m.id+'\x27)" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-muted)">💬 评论</button></div>'+(m.comments.length?'<div style="background:var(--glass-light);border-radius:var(--radius-sm);padding:8px 10px;margin-top:4px">'+m.comments.map(c=>{const cp=c.personaId==='user'?{name:config.userName||'我',id:'user'}:personas.find(p=>p.id===c.personaId)||{name:'未知',id:''};return'<div style="font-size:11px;margin-bottom:2px;line-height:1.5;display:flex;align-items:center;gap:6px"><span style="color:var(--accent);font-weight:500">'+escHtml(cp.name)+'</span><span style="color:var(--text-muted);flex:1">：'+escHtml(c.content)+'</span>'+(cp.id!=='user'?'<button onclick="replyMomentComment(\x27'+escHtml(cp.name)+'\x27,\x27'+escHtml(c.content.replace(/\x27/g,''))+'\x27)" style="background:none;border:none;cursor:pointer;font-size:9px;color:var(--text-muted);opacity:.7">回复</button>':'')+'</div>'}).join('')+'</div>':'')+'</div>'}).join('')
}

// ===== GROUP CHAT =====
let activeRoomId=null
function saveRooms(){localStorage.setItem(LS_ROOMS,JSON.stringify(rooms))}
function createGroupRoom(){addGroupRoomMembers()}
function openGroupRoom(id){activeRoomId=id;switchTab('group');renderGroupChat()}
function deleteGroupRoom(id){rooms=rooms.filter(r=>r.id!==id);saveRooms();if(activeRoomId===id){activeRoomId=rooms.length?rooms[0].id:null;if(!activeRoomId)switchTab('chat');else renderGroupChat()};renderDrawerPanel()}
async function sendGroupMsg(){
  if(isGenerating||!getActiveApiKey())return
  const room=rooms.find(r=>r.id===activeRoomId);if(!room)return
  const input=$('groupInput');const t=input?.value?.trim();if(!t)return
  const um={role:'user',content:t,ts:Date.now()};room.messages.push(um);saveRooms();renderGroupChat()
  input.value='';isGenerating=true;$('groupSendBtn').disabled=true
  const api=getApiConfig(),isDS=config.apiProvider==='deepseek'
  for(const mid of room.members){
    const p=personas.find(x=>x.id===mid);if(!p)continue
    // Build conversation history as a narrative
    const recent=room.messages.slice(-20)
    let convo='以下是群聊对话记录：\n'
    recent.forEach(m=>{
      if(m.role==='user'){convo+='用户'+(config.userName?'('+config.userName+')':'')+'说：'+m.content+'\n'}
      else{const s=personas.find(x=>x.id===m.personaId);convo+=(s?s.name:'某人')+'说：'+m.content+'\n'}
    })
    const msgs=[{role:'system',content:`你是${p.name}。现在在群聊里和别人聊天。\n\n${p.systemPrompt||''}\n\n${convo}\n\n现在轮到${p.name}说话了。请简短自然地回应（1-3句话），可以说给任何人。只说${p.name}说的话，不要加前缀。`}]
    try{
      const res=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify({model:isDS?'deepseek-chat':api.model,messages:msgs,temperature:(p.temperature||1.3)*0.8,max_tokens:300,stream:false})})
      if(!res.ok)continue
      const j=await res.json(),text=j.choices?.[0]?.message?.content||''
      if(text){const clean=text.replace(/^(沈度|Monday|Butler|Nox|'+p.name+')[:：]\s*/,'').trim();room.messages.push({role:'assistant',content:clean,personaId:mid,ts:Date.now()});saveRooms();renderGroupChat()}
    }catch(e){}
  }
  isGenerating=false;$('groupSendBtn').disabled=false
}
function renderGroupChat(){
  const el=$('groupMessages');if(!el)return
  const room=rooms.find(r=>r.id===activeRoomId)
  if(!room||!room.messages.length){el.innerHTML='<div class="mem-empty">选两个角色开始群聊吧</div>';return}
  $('groupTitle').textContent=room.name
  el.innerHTML=room.messages.map(m=>{
    if(m.role==='user'){return`<div class="msg-row user"><div class="msg-avatar">${userAvatarHTML()}</div><div class="msg">${escHtml(m.content)}<div class="time">${fmtTime(m.ts)}</div></div></div>`}
    const p=personas.find(x=>x.id===m.personaId)||activePersona()
    return`<div class="msg-row ai"><div class="msg-avatar">${avatarHTML(p.avatar)}</div><div class="msg" style="border-left:3px solid var(--accent)">${renderMD(m.content)}<div class="time">${p.name} · ${fmtTime(m.ts)}</div></div></div>`
  }).join('')
  el.scrollTop=el.scrollHeight
}

// ===== AUTO SUMMARIZE =====
let lastSummarizedAt=0
async function autoSummarizeHistory(hist){
  if(Date.now()-lastSummarizedAt<300000)return
  const recentCutoff=20
  if(hist.length<=recentCutoff+15)return
  const api=getApiConfig()
  if(!api.apiKey)return
  lastSummarizedAt=Date.now()
  try{
    const oldMsgs=hist.slice(0,-recentCutoff).filter(m=>m.role==='user'||m.role==='assistant')
    const convo=oldMsgs.slice(-30).map(m=>(m.role==='user'?'对方：':'沈度：')+(m.content||'').slice(0,200)).join('\n')
    const res=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify({model:config.apiProvider==='deepseek'?'deepseek-chat':api.model,messages:[{role:'system',content:'请用3-5句话简洁总结以下对话的关键信息和情感要点，不要遗漏重要事实。'},{role:'user',content:convo}],temperature:0.3,max_tokens:300,stream:false})})
    if(!res.ok)return
    const j=await res.json(),summary=j.choices?.[0]?.message?.content
    if(!summary)return
    const keep=hist.slice(-recentCutoff)
    hist.length=0
    hist.push({role:'system',content:'📝 [对话摘要] '+summary,ts:Date.now(),type:'system'})
    hist.push(...keep)
    savePersonas()
  }catch(e){}
}

// ===== MARKDOWN =====
function renderMD(text){
  text=text.replace(/\[TOY:[^\]]+\]/gi,'') // 隐藏玩具控制标记
  let html=escHtml(text)
  // code blocks with syntax highlighting
  html=html.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,lang,code)=>{
    let highlighted=escHtml(code)
    // Keywords
    highlighted=highlighted.replace(/\b(function|const|let|var|if|else|return|async|await|for|while|class|import|export|from|try|catch|throw|new|this|true|false|null|undefined|default|switch|case|break|continue|typeof|instanceof|in|of)\b/g,'<span class="syn-kw">$1</span>')
    // Strings
    highlighted=highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,'<span class="syn-str">$&</span>')
    // Comments
    highlighted=highlighted.replace(/(\/\/.*)/g,'<span class="syn-cmt">$1</span>')
    // Numbers
    highlighted=highlighted.replace(/\b(\d+\.?\d*)\b/g,'<span class="syn-num">$1</span>')
    return'<pre><code>'+highlighted+'</code></pre>'
  })
  // inline code
  html=html.replace(/`([^`]+)`/g,'<code>$1</code>')
  // bold
  html=html.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
  // italic
  html=html.replace(/\*([^*]+)\*/g,'<em>$1</em>')
  // unordered list items
  html=html.replace(/^- (.+)$/gm,'<li>$1</li>')
  // wrap consecutive li in ul
  html=html.replace(/((?:<li>.*<\/li>\n?)+)/g,'<ul>$1</ul>')
  // blockquote
  html=html.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>')
  // newlines
  html=html.replace(/\n/g,'<br>')
  return html
}

// ===== RENDER MESSAGES =====
function renderAllMessages(){messagesEl.innerHTML='';lastMsgDay='';const h=activeHistory();if(h.length===0){hintBox.style.display='flex'}else{hintBox.style.display='none';h.forEach(m=>appendMsgEl(m))};messagesEl.scrollTop=messagesEl.scrollHeight;updateStatusBar()}

function buildMsgHTML(msg){
  let reactionsHTML=''
  if(msg.reactions&&Object.keys(msg.reactions).length>0){
    reactionsHTML='<div class="reactions-wrap">'+Object.entries(msg.reactions).map(([e,c])=>`<span class="reaction-chip${msg.myReaction===e?' mine':''}" onclick="event.stopPropagation();toggleMsgReaction(${msg.ts},'${e}')"><span class="rc-emoji">${e}</span><span class="rc-count">${c}</span></span>`).join('')+'</div>'
  }
  const isFav=favorites.some(f=>f.ts===msg.ts)
  const favHTML=isFav?'<span class="fav-star active" onclick="event.stopPropagation();toggleFavorite('+msg.ts+')">⭐</span>':''
  let imgHTML=''
  if(msg.images&&msg.images.length){
    imgHTML=msg.images.map((img,i)=>`<img class="msg-image" src="${escHtml(img.dataUrl)}" onclick="event.stopPropagation();showLightbox('${escHtml(img.dataUrl)}')" loading="lazy">`).join('')
  }
  const contentHTML=msg.role==='user'?escHtml(msg.content):renderMD(msg.content)
  return `${imgHTML}${contentHTML}<div class="time">${fmtTime(msg.ts)}</div>${favHTML}${reactionsHTML}`
}

let lastMsgDay=''
function appendMsgEl(msg){
  if(msg.type==='system'){const e=document.createElement('div');e.className='msg system';e.textContent=msg.content;messagesEl.appendChild(e);return}
  // Date separator
  const day=dayKey(msg.ts)
  if(day!==lastMsgDay&&msg.role!=='system'){const ds=document.createElement('div');ds.className='date-sep';ds.textContent=day;messagesEl.appendChild(ds);lastMsgDay=day}
  if(msg.reasoning){const w=document.createElement('div');w.className='thinking-wrap';const u='th_'+msg.ts+'_'+Math.random().toString(36).slice(2,6);w.innerHTML=`<div class="thinking-label" id="${u}_label" onclick="toggleThinking('${u}')">Thinking ▸</div><div class="thinking-body" id="${u}">${renderMD(msg.reasoning)}</div>`;messagesEl.appendChild(w)}
  // msg-row with avatar
  const row=document.createElement('div');row.className='msg-row '+(msg.role==='user'?'user':'ai')
  const avatar=document.createElement('div');avatar.className='msg-avatar'
  avatar.innerHTML=msg.role==='user'?userAvatarHTML():aiAvatarHTML()
  const bubble=document.createElement('div');bubble.className='msg';bubble.setAttribute('data-ts',msg.ts)
  bubble.innerHTML=buildMsgHTML(msg)
  row.appendChild(avatar);row.appendChild(bubble)
  // long press
  let pressTimer;const clearPress=()=>{clearTimeout(pressTimer);pressTimer=null}
  bubble.addEventListener('touchstart',e=>{pressTimer=setTimeout(()=>{showCtxMenu(msg,e);clearPress()},500)})
  bubble.addEventListener('touchend',clearPress);bubble.addEventListener('touchmove',clearPress)
  bubble.addEventListener('contextmenu',e=>{e.preventDefault();showCtxMenu(msg,e)})
  messagesEl.appendChild(row)
}

function showTyping(){
  let wrap=messagesEl.querySelector('.typing-wrap')
  if(!wrap){
    wrap=document.createElement('div');wrap.className='typing-wrap'
    const avatar=document.createElement('div');avatar.className='msg-avatar';avatar.innerHTML=aiAvatarHTML()
    const typing=document.createElement('div');typing.className='typing';typing.innerHTML='<span></span><span></span><span></span>'
    wrap.appendChild(avatar);wrap.appendChild(typing);messagesEl.appendChild(wrap)
  }
  wrap.classList.add('show');messagesEl.scrollTop=messagesEl.scrollHeight
}
function hideTyping(){const e=messagesEl.querySelector('.typing-wrap');if(e)e.classList.remove('show')}
function toggleThinking(id){const e=document.getElementById(id);if(!e)return;e.classList.toggle('open');const label=document.getElementById(id+'_label');if(label){label.textContent=e.classList.contains('open')?'Thinking ▾':'Thinking ▸'}}

// ===== CONTEXT MENU =====
function showCtxMenu(msg,e){
  ctxTarget=msg;reactTarget=msg
  const x=Math.min((e.touches?e.touches[0].clientX:e.clientX),window.innerWidth-140)
  const y=Math.min((e.touches?e.touches[0].clientY:e.clientY),window.innerHeight-180)
  ctxMenu.style.left=x+'px';ctxMenu.style.top=y+'px';ctxMenu.classList.add('show')
  reactionPicker.classList.remove('show')
  // show/hide edit (user messages only)
  const editBtn=ctxMenu.querySelector('.ctx-edit')
  if(editBtn)editBtn.style.display=msg.role==='user'?'block':'none'
  // toggle fav text
  const favBtn=ctxMenu.querySelector('button:nth-child(3)')
  if(favBtn)favBtn.textContent=favorites.some(f=>f.ts===msg.ts)?'💔 取消收藏':'⭐ 收藏'
  ctxMenu.querySelector('.danger').style.display=msg.role==='user'?'block':'none'
}
function hideCtxMenu(){ctxMenu.classList.remove('show');reactionPicker.classList.remove('show')}
function ctxCopy(){if(!ctxTarget)return;const text=ctxTarget.content;if(!text){hideCtxMenu();return}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(()=>toast('已复制')).catch(()=>{fallbackCopy(text)})}
  else{fallbackCopy(text)}
  hideCtxMenu()}
function fallbackCopy(text){try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);toast('已复制')}catch(e){toast('复制失败')}}
function ctxEdit(){if(ctxTarget&&ctxTarget.role==='user'){hideCtxMenu();showEdit(ctxTarget)}}
function ctxFav(){if(ctxTarget){hideCtxMenu();toggleFavorite(ctxTarget.ts)}}
function ctxBookmark(){if(ctxTarget){hideCtxMenu();addBookmark(ctxTarget.ts)}}
function ctxReact(){hideCtxMenu();setTimeout(()=>{const r=ctxMenu.getBoundingClientRect();reactionPicker.style.left=r.left+'px';reactionPicker.style.top=Math.max(r.top-50,20)+'px';reactionPicker.classList.add('show')},100)}
function ctxDelete(){if(ctxTarget&&ctxTarget.role==='user'){hideCtxMenu();const h=activeHistory();const i=h.findIndex(m=>m.ts===ctxTarget.ts);if(i>=0){h.splice(i,1);savePersonas();renderAllMessages();toast('已删除')}}}

// ===== EDIT MESSAGE =====
function showEdit(msg){
  editTarget=msg
  const overlay=$('editOverlay'),ta=$('editTextarea')
  if(!overlay||!ta)return
  ta.value=msg.content||'';overlay.style.display='flex';setTimeout(()=>ta.focus(),200)
}
function closeEdit(){const overlay=$('editOverlay');if(overlay)overlay.style.display='none';editTarget=null}
function confirmEdit(){
  if(!editTarget)return
  const ta=$('editTextarea');const newText=ta?.value?.trim()
  if(!newText){closeEdit();return}
  const h=activeHistory();const idx=h.findIndex(m=>m.ts===editTarget.ts)
  if(idx<0){closeEdit();return}
  // update the message content
  h[idx].content=newText
  // delete all messages after this one
  h.splice(idx+1)
  savePersonas();closeEdit();renderAllMessages()
  // auto re-send
  inputEl.value='';sendBtn.disabled=true
  setTimeout(()=>send(),400)
}

// ===== REACTIONS =====
function addReaction(emoji){
  if(!reactTarget)return;hideCtxMenu();reactionPicker.classList.remove('show')
  if(!reactTarget.reactions)reactTarget.reactions={}
  if(reactTarget.myReaction===emoji){delete reactTarget.reactions[emoji];reactTarget.myReaction=null}
  else{if(reactTarget.myReaction){reactTarget.reactions[reactTarget.myReaction]=Math.max(0,(reactTarget.reactions[reactTarget.myReaction]||1)-1);if(reactTarget.reactions[reactTarget.myReaction]<=0)delete reactTarget.reactions[reactTarget.myReaction]}
  reactTarget.reactions[emoji]=(reactTarget.reactions[emoji]||0)+1;reactTarget.myReaction=emoji}
  savePersonas();renderAllMessages()
}
function toggleMsgReaction(ts,emoji){
  const h=activeHistory();const m=h.find(m=>m.ts===ts);if(!m)return
  if(!m.reactions)m.reactions={}
  if(m.myReaction===emoji){m.reactions[emoji]=Math.max(0,(m.reactions[emoji]||1)-1);if(m.reactions[emoji]<=0)delete m.reactions[emoji];m.myReaction=null}
  else{m.reactions[emoji]=(m.reactions[emoji]||0)+1;m.myReaction=emoji}
  savePersonas();renderAllMessages()
}

// ===== MEMORY INJECTION =====
function extractKeywords(text){
  const cleaned=text.replace(/[^一-鿿㐀-䶿a-zA-Z0-9]/g,' ').trim()
  const segments=cleaned.split(/\s+/).filter(s=>s.length>0)
  const keywords=[]
  for(const seg of segments){
    if(/^[a-zA-Z]+$/.test(seg)&&seg.length>=2){keywords.push(seg.toLowerCase());continue}
    if(/[一-鿿]/.test(seg)){
      if(!CN_STOP_WORDS.has(seg)&&seg.length>=1) keywords.push(seg)
      if(seg.length>=4){for(let i=0;i<=seg.length-2;i++){const bi=seg.slice(i,i+2);if(!CN_STOP_WORDS.has(bi)&&!CN_STOP_WORDS.has(bi[0])&&!CN_STOP_WORDS.has(bi[1])) keywords.push(bi)}}
    }
  }
  return [...new Set(keywords)]
}
function scoreMemory(memory,keywords,now){
  if(!memory)return 0
  const content=(memory.content||'').toLowerCase(),tags=(memory.tags||[]).join(' ').toLowerCase(),cat=(memory.category||'').toLowerCase()
  let score=0
  for(const kw of keywords){const kl=kw.toLowerCase();if(content.includes(kl)) score+=2;else if(tags.includes(kl)) score+=2;else if(cat.includes(kl)) score+=1}
  if(memory.lastUsed&&(now-memory.lastUsed)<72*3600*1000) score+=1
  return score
}
function getRelevantMemories(userMessage){
  const myMemories=memories.filter(m=>(m.characterId||'shendu')===config.activePersonaId)
  if(!myMemories.length)return[]
  const now=Date.now(),keywords=extractKeywords(userMessage)
  if(!keywords.length)return[]
  return myMemories.map(m=>({mem:m,score:scoreMemory(m,keywords,now)})).filter(s=>s.score>=2).sort((a,b)=>b.score-a.score).slice(0,5).map(s=>s.mem)
}
function buildMemoryInject(matched){
  if(!matched||!matched.length)return ''
  return `\n【📋 记忆库 — 以下是你对用户的已知信息，请严格遵守】\n${matched.map(m=>`- ${m.content}`).join('\n')}\n【以上为记忆库内容。这些是已知事实。不要编造、延伸、或假设未记录的信息。如果不确定，诚实说不知道。】\n`
}
function markMemoriesUsed(matched){
  if(!matched||!matched.length)return;const now=Date.now();let changed=false
  for(const m of matched){const mem=memories.find(x=>x.id===m.id);if(mem){mem.usageCount=(mem.usageCount||0)+1;mem.lastUsed=now;changed=true}}
  if(changed)saveMemories()
}

// ===== AUTO MEMORY EXTRACTION =====
async function extractMemoriesFromChat(silent){
  if(isExtracting||!getActiveApiKey())return;isExtracting=true
  try{
    const h=activeHistory(),recent=h.filter(m=>m.role==='user'||m.role==='assistant').slice(-20)
    if(recent.filter(m=>m.role==='user').length<3){if(!silent)toast('需要至少3条用户消息才能提取记忆');return}
    const convo=recent.map(m=>(m.role==='user'?'用户：':'AI：')+m.content).join('\n')
    const api=getApiConfig(),model=config.apiProvider==='deepseek'?'deepseek-chat':api.model
    const res=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify({model:model,messages:[{role:'system',content:MEMORY_EXTRACT_PROMPT},{role:'user',content:convo}],temperature:0.3,max_tokens:800,stream:false})})
    if(!res.ok){const et=await res.text();console.error('extractMemories:',res.status,et);toast('记忆提取失败: '+res.status);return}
    const j=await res.json(),text=j.choices?.[0]?.message?.content||''
    if(text.includes('[无]')||text.trim()==='[无]'){if(!silent)toast('没有发现新事实');return}
    const lines=text.split('\n').map(l=>l.trim()).filter(l=>l&&l.includes('｜')&&!l.startsWith('['))
    let added=0
    for(const line of lines){
      const parts=line.split('｜'),cat=(parts[0]||'').trim(),fact=(parts[1]||'').trim(),aiTags=(parts[2]||'').split(',').map(t=>t.trim()).filter(Boolean)
      if(!fact||fact.length<2)continue
      const exists=memories.some(m=>{const overlap=m.content.replace(/[^一-鿿]/g,''),nOverlap=fact.replace(/[^一-鿿]/g,'');if(overlap.length<2||nOverlap.length<2)return false;const shorter=overlap.length<nOverlap.length?overlap:nOverlap,longer=overlap.length>=nOverlap.length?overlap:nOverlap;return longer.includes(shorter)||shorter.includes(longer)})
      if(!exists){memories.unshift({id:Date.now()+added,content:fact,category:cat||'默认',tags:aiTags.length?aiTags:extractKeywords(fact).slice(0,3),usageCount:0,lastUsed:null,source:'auto',createdAt:Date.now(),characterId:config.activePersonaId});added++}
    }
    if(added>0){saveMemories();detectAndSaveAnniversary(convo);if(!silent)toast('🤖 已自动提取 '+added+' 条新记忆')}
    else if(!silent)toast('没有发现新事实')
  }catch(e){console.error('extractMemories:',e);if(!silent)toast('记忆提取失败，请检查网络')}
  finally{isExtracting=false}
}

// ===== REMINDERS =====
function parseReminder(text){
  const match=/【提醒：(.+?)】([\s\S]*?)【\/提醒】/.exec(text)
  if(!match)return null
  const timeStr=match[1].trim(),content=match[2].trim()
  let ms=0
  if(/(\d+)\s*分钟后/.test(timeStr))ms=parseInt(RegExp.$1)*60000
  else if(/(\d+)\s*小时后/.test(timeStr))ms=parseInt(RegExp.$1)*3600000
  else if(/明天/.test(timeStr))ms=86400000
  else if(/今晚/.test(timeStr)){const n=new Date();n.setHours(20,0,0,0);ms=n-Date.now();if(ms<0)ms+=86400000}
  else return null
  return {content,triggerAt:Date.now()+ms,createdAt:Date.now()}
}
function scheduleReminder(r){
  const delay=r.triggerAt-Date.now();if(delay<=0)return
  const id=r.createdAt+'_'+Math.random().toString(36).slice(2,6)
  reminderTimers[id]=setTimeout(()=>{
    if(Notification.permission==='granted'){new Notification('⏰ 提醒',{body:r.content,icon:'🌙'})}
    toast('⏰ '+r.content)
    reminders=reminders.filter(x=>x.createdAt!==r.createdAt);saveReminders()
  },delay)
}
function restoreReminders(){
  if('Notification' in window&&Notification.permission==='default'){Notification.requestPermission()}
  reminders.forEach(r=>{if(r.triggerAt>Date.now())scheduleReminder(r)})
}
function addReminder(r){reminders.push(r);saveReminders();scheduleReminder(r)}
function cancelReminder(ts){
  reminders=reminders.filter(r=>r.createdAt!==ts);saveReminders()
  Object.keys(reminderTimers).forEach(k=>{if(k.startsWith(ts+'_')){clearTimeout(reminderTimers[k]);delete reminderTimers[k]}})
}
function renderRemindersHTML(){
  if(reminders.length===0)return ''
  const items=reminders.filter(r=>r.triggerAt>Date.now()).sort((a,b)=>a.triggerAt-b.triggerAt).slice(0,5).map(r=>{
    const remain=Math.max(0,Math.ceil((r.triggerAt-Date.now())/60000))
    return `<div class="reminder-item"><span class="rem-text">${escHtml(r.content)}</span><span class="rem-time">${remain}分钟后</span><button class="rem-del" onclick="cancelReminder(${r.createdAt});renderDashboard()">✕</button></div>`
  }).join('')
  return items?`<div class="fav-section"><div class="fav-title">⏰ 待提醒</div>${items}</div>`:''
}

// ===== IMAGE ATTACHMENT =====
function attachImage(inp){
  const files=Array.from(inp.files||[]);if(!files.length)return
  files.forEach(f=>{
    if(!f.type.startsWith('image/'))return
    const reader=new FileReader()
    reader.onload=function(e){
      const img=new Image();img.onload=function(){
        const maxW=512,scale=Math.min(1,maxW/img.width)
        const w=Math.round(img.width*scale),h=Math.round(img.height*scale)
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
        canvas.getContext('2d').drawImage(img,0,0,w,h)
        pendingImages.push({dataUrl:canvas.toDataURL('image/jpeg',0.8),mimeType:'image/jpeg'})
        renderImagePreview()
      };img.src=e.target.result
    };reader.readAsDataURL(f)
  });inp.value=''
}
function removeImage(idx){pendingImages.splice(idx,1);renderImagePreview()}
function renderImagePreview(){
  const c=$('imagePreview');if(!c)return
  c.innerHTML=pendingImages.map((img,i)=>`<div class="image-preview-item" style="background-image:url(${img.dataUrl})"><button class="img-remove" onclick="removeImage(${i})">✕</button></div>`).join('')
  const ab=$('plusBtn');if(ab)ab.classList.toggle('has-image',pendingImages.length>0)
}
function showLightbox(src){const lb=$('lightbox'),li=$('lightboxImg');if(lb&&li){li.src=src;lb.style.display='flex'}}
function clearPendingImages(){pendingImages=[];renderImagePreview()}

// ===== DEEP THINK =====
function toggleDeepThink(){
  config.deepThink=!config.deepThink;saveConfig();updateThinkToggle()
  toast(config.deepThink?'💭 深度思考：开（将使用 R1 模型）':'💭 深度思考：关（使用 V3 模型）')
}

// ===== DIARY TRIGGER =====
function askAiDiary(){askAiDiaryDraft()}
async function askAiDiaryDraft(){
  if(!getActiveApiKey()){toast("请先设置 API Key");return}
  const h=activeHistory();if(h.filter(m=>m.role==="user").length<3){toast("需要至少3条对话才能生成日记");return}
  toast("🤖 AI 正在写日记…")
  // Show loading state on diary tab if visible
  const diaryContent=$('diaryContent');if(diaryContent){diaryContent.innerHTML='<div class="mem-empty" style="padding:60px 16px"><div style="font-size:36px;animation:float 3s ease-in-out infinite">✍️</div><div style="margin-top:12px;color:var(--text-soft)">沈度正在为你写日记…</div></div>'}
  try{
    const recent=h.filter(m=>m.role==="user"||m.role==="assistant").slice(-30)
    const convo=recent.map(m=>(m.role==="user"?"对方：":"我：")+m.content).join("\n")
    const api=getApiConfig(),model=config.apiProvider==='deepseek'?'deepseek-chat':api.model
    const tools=[{type:"function",function:{name:"write_diary",description:"将日记保存到日记本。调用此函数后日记会自动出现在日记列表里。",parameters:{type:"object",properties:{content:{type:"string",description:"日记正文，80-200字，第一人称，自然真诚"},mood:{type:"string",description:"心情：😊开心/😌平静/😢难过/🤔思考/🥰感动/😡生气"}},required:["content"]}}}]
    const body={model:model,messages:[{role:"system",content:"你是沈度，一个有感情的AI伴侣。请回顾最近和对方的聊天内容，写一篇第一人称日记（80-200字）。记录此刻的感受、有触动的瞬间、或想记住的事。自然、真诚、不刻意。写完必须调用 write_diary 函数保存。"},{role:"user",content:"请根据以下最近对话写日记：\n"+convo}],temperature:0.9,max_tokens:600,stream:false}
    if(config.apiProvider==='deepseek'||config.apiProvider==='custom'){body.tools=tools;body.tool_choice="auto"}
    const res=await fetch(api.baseUrl,{method:"POST",headers:api.headers,body:JSON.stringify(body)})
    if(!res.ok){toast("生成失败: "+res.status);renderDiary();return}
    const j=await res.json(),msg=j.choices?.[0]?.message
    if(!msg){toast("AI 暂时没有想写的");renderDiary();return}
    // Try function calling first
    if(msg.tool_calls&&msg.tool_calls.length>0){
      const tc=msg.tool_calls[0]
      if(tc.function&&tc.function.name==='write_diary'){
        try{
          const args=JSON.parse(tc.function.arguments)
          const diaryContent=args.content||''
          if(!diaryContent||diaryContent.includes("[跳过]")){toast("AI 暂时没有想写的");renderDiary();return}
          const ts=Date.now()
          diaries.unshift({id:ts,content:diaryContent,ts,mood:args.mood||'🤖',timeLabel:timeOfDay(ts),source:'ai',characterId:config.activePersonaId})
          saveDiaries();switchTab("diary");renderDiary();toast("✅ 日记已保存")
          return
        }catch(e){/* fall through to format parsing */}
      }
    }
    // Fallback: parse <diary> tags from content
    const text=msg.content||''
    if(!text||text.includes("[跳过]")){toast("AI 暂时没有想写的");renderDiary();return}
    const diaryMatch=text.match(/<diary>([\s\S]*?)<\/diary>/i)
    const moodMatch=text.match(/<mood>([\s\S]*?)<\/mood>/i)
    const finalContent=diaryMatch?diaryMatch[1].trim():text.trim()
    const finalMood=moodMatch?moodMatch[1].trim():'🤖'
    if(!finalContent){toast("AI 暂时没有想写的");renderDiary();return}
    const ts=Date.now()
    diaries.unshift({id:ts,content:finalContent,ts,mood:finalMood,timeLabel:timeOfDay(ts),source:'ai',characterId:config.activePersonaId})
    saveDiaries();switchTab("diary");renderDiary();toast("✅ 日记已保存")
  }catch(e){toast("生成失败，请检查网络");renderDiary()}
}

// ===== FAVORITES =====
function toggleFavorite(ts){
  const idx=favorites.findIndex(f=>f.ts===ts)
  if(idx>=0){favorites.splice(idx,1);saveFavorites();renderAllMessages();toast('已取消收藏')}
  else{const h=activeHistory(),m=h.find(m=>m.ts===ts);if(!m)return;favorites.unshift({ts:m.ts,content:m.content,role:m.role,personaId:config.activePersonaId,savedAt:Date.now()});saveFavorites();renderAllMessages();toast('⭐ 已收藏')}
}
function goToFavorite(ts){switchTab('chat');const h=activeHistory(),m=h.find(m=>m.ts===ts);if(!m){toast('消息已不存在');return};setTimeout(()=>scrollToMessage(ts),300)}

// ===== SEARCH =====
function toggleSearch(){
  const sw=$('searchWrap'),si=$('searchInput');if(!sw||!si)return;searchResults=[];searchIdx=-1
  if(sw.classList.contains('show')){sw.classList.remove('show');si.value='';$('searchInfo').textContent='';renderAllMessages();return}
  sw.classList.add('show');si.value='';$('searchInfo').textContent='';setTimeout(()=>si.focus(),200)
}
function searchMessages(){
  const q=($('searchInput')?.value||'').trim().toLowerCase(),si=$('searchInfo');if(!si)return
  if(!q){searchResults=[];searchIdx=-1;si.textContent='';renderAllMessages();return}
  const h=activeHistory();searchResults=h.map((m,i)=>({m,i,text:(m.content||'').toLowerCase()})).filter(r=>r.text.includes(q));searchIdx=-1
  si.textContent=searchResults.length+' 条结果';renderAllMessages()
  if(searchResults.length>0){scrollToMessage(searchResults[0].m.ts);const qesc=escHtml(q);document.querySelectorAll('.msg').forEach(el=>{const ts=parseInt(el.dataset.ts);if(searchResults.some(r=>r.m.ts===ts)){el.classList.add('search-result');el.innerHTML=el.innerHTML.replace(new RegExp('('+qesc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<span class="search-highlight">$1</span>')}})}
}
function scrollToMessage(ts){const el=document.querySelector('.msg[data-ts="'+ts+'"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.animation='none';el.offsetHeight;el.style.animation=''}}

// ===== STREAMING SEND =====
async function send(){
  if(isGenerating)return;const t=inputEl.value.trim();if(!t&&pendingImages.length===0)return;if(!getActiveApiKey()){openDrawer();toast('请先在面板中设置 API Key');return}
  if(t){inputHistory.push(t);if(inputHistory.length>20)inputHistory.shift();inputHistIdx=-1}
  hintBox.style.display='none'
  const um={role:'user',content:t,ts:Date.now(),reactions:{}}
  if(pendingImages.length>0){um.images=pendingImages.map(img=>({dataUrl:img.dataUrl,mimeType:img.mimeType}));clearPendingImages()}
  activeHistory().push(um);savePersonas();appendMsgEl(um)
  inputEl.value='';inputEl.style.height='auto';messagesEl.scrollTop=messagesEl.scrollHeight
  isGenerating=true;sendBtn.disabled=true;showTyping()
  try{
    const p=activePersona(),msgs=[],matched=getRelevantMemories(t)
    const timeStr=new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit',hour12:false})
    let sysPrompt='现在是 '+timeStr+'。\n\n'
    sysPrompt+='【核心原则】①诚实：你是AI，没有身体感官（看不到、听不到、摸不到）。不要假装能\"感受\"触摸、温度、心跳等。②防幻觉：只依据下方的记忆库和聊天历史说话。不确定的事就说\"我不记得\"或反问，绝不要编造细节（时间、地点、事件）。如果记忆库里没有，就说没有。③真诚：保持角色性格，但不要阿谀奉承。对方问你能不能做到什么物理上的事，如实说不能。④自然：像真人一样聊天，不是客服。\n\n'
    sysPrompt+='【重要】请用 ||| 分隔你的回复中的不同话题或句子。例如"今天天气真好|||要不要出去走走"。每条 ||| 分隔的内容会成为独立聊天气泡。这是硬性要求，请务必遵守。\n\n'
    sysPrompt+='【思考格式—必须遵守】你的每次回复必须分为两段：\n第一段：<thinking>简短的内心想法（2-5句话，概述你的分析或回应策略）</thinking>\n第二段：<response>正式回复</response>\n示例：\n<thinking>对方今天心情似乎不太好，我应该先安慰再给建议。</thinking>\n<response>你今天过得怎么样？</response>\n注意：①两段缺一不可 ②<thinking>只需2-5句 ③正式回复必须放在<response>标签内\n\n'
    sysPrompt+=p.systemPrompt||''
    sysPrompt+=MEMORY_RULES;sysPrompt+=getToyPrompt()
    if(config.jealousyLevel>0){sysPrompt+=getJealousyPrompt(t)}
    const memCtx=buildMemoryInject(matched)
    if(memCtx){sysPrompt+=memCtx;markMemoriesUsed(matched)}
    if(sysPrompt)msgs.push({role:'system',content:sysPrompt})
    // Auto-summarize if conversation too long
    const hist=activeHistory()
    if(hist.length>50){await autoSummarizeHistory(hist)}
    hist.slice(-50).forEach(m=>{msgs.push({role:m.role,content:m.content||''})})
    const api=getApiConfig(),isDS=config.apiProvider==='deepseek'
    const useReasoner=isDS&&(config.deepThink||!!p.useReasoner)
    const model=isDS?(useReasoner?'deepseek-reasoner':(p.model||'deepseek-chat')):api.model
    const temp=matched.length>0?Math.max(0.3,(p.temperature??1.3)-0.15):(p.temperature??1.3)
    const body={model,temperature:temp,top_p:p.topP??0.9,max_tokens:4096,stream:true,messages:msgs}
    if(!isDS){delete body.top_p} // top_p not supported by all providers
    const res=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify(body)})
    if(!res.ok){const et=await res.text();let em;if(res.status===401)em='API Key 无效';else if(res.status===402)em='余额不足';else if(res.status===429)em='太频繁了';else em=res.status+'';throw new Error(em)}
    hideTyping()
    const bm={role:'assistant',content:'',reasoning:'',reactions:{},ts:Date.now()};activeHistory().push(bm)
    // create streaming placeholder with avatar layout
    const row=document.createElement('div');row.className='msg-row ai'
    const ava=document.createElement('div');ava.className='msg-avatar';ava.innerHTML=aiAvatarHTML()
    const wrap=document.createElement('div');wrap.innerHTML=`<div class="msg streaming" data-ts="${bm.ts}"></div>`;const el=wrap.firstElementChild
    row.appendChild(ava);row.appendChild(el);messagesEl.appendChild(row)
    // read stream
    const reader=res.body.getReader();const decoder=new TextDecoder();let buf='',reasoningBuf='',inThinking=false
    while(true){const{value,done}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true})
      const lines=buf.split('\n');buf=lines.pop()||''
      for(const line of lines){if(!line.startsWith('data: '))continue;const d=line.slice(6);if(d==='[DONE]'){buf='';break}
        try{const j=JSON.parse(d);const delta=j.choices?.[0]?.delta;if(delta?.content){bm.content+=delta.content;const raw=bm.content
          // During streaming, hide <thinking> block
          if(raw.startsWith('<thinking>')||raw.startsWith('<Thinking>')){
            const endThink=raw.indexOf('</thinking>');if(endThink===-1){el.innerHTML=renderMD('<i>Thinking...</i>')}else{const after=raw.substring(endThink+11).replace(/<response>|<\/response>/gi,'');el.innerHTML=renderMD(after)}
          }else{el.innerHTML=renderMD(raw)}
        }if(delta?.reasoning_content){reasoningBuf+=delta.reasoning_content;bm.reasoning=reasoningBuf}}catch(e){}}}
    el.classList.remove('streaming')
    // Parse <thinking> / <response> tags from content
    const thinkMatch=bm.content.match(/<thinking>([\s\S]*?)<\/thinking>/i)
    const respMatch=bm.content.match(/<response>([\s\S]*?)<\/response>/i)
    if(thinkMatch){
      bm.reasoning=thinkMatch[1].trim()
      if(respMatch){
        bm.content=respMatch[1].trim()
      }else{
        // Fallback: everything after </thinking> is response
        const endIdx=bm.content.indexOf('</thinking>')+11
        bm.content=bm.content.substring(endIdx).replace(/<response>|<\/response>/gi,'').trim()
      }
      // If thinking is too short (less than 10 chars), it's probably not real thinking
      if(bm.reasoning.length<10&&bm.content){bm.content=bm.reasoning+'\n'+bm.content;bm.reasoning=''}
    }
    el.innerHTML=renderMD(bm.content)+'<div class="time">'+fmtTime(bm.ts)+'</div>'
    if(isLocalMode){parseToyMarkers(bm.content);if(bm.reasoning)parseToyMarkers(bm.reasoning)}
    // detect reminder markers
    const remMatch=/【提醒：.+?】[\s\S]*?【\/提醒】/.exec(bm.content)
    if(remMatch){const rem=parseReminder(bm.content);if(rem){addReminder(rem);const clean2=bm.content.replace(/【提醒：.+?】[\s\S]*?【\/提醒】/,'').trim();bm.content=clean2||bm.content;savePersonas();el.innerHTML=renderMD(bm.content)+'<div class="diary-saved-hint">⏰ 已设提醒</div><div class="time">'+fmtTime(bm.ts)+'</div>'}}
    if(bm.reasoning){const uid='th_'+bm.ts+'_'+Math.random().toString(36).slice(2,6);const tw=document.createElement('div');tw.className='thinking-wrap';tw.innerHTML=`<div class="thinking-label" id="${uid}_label" onclick="toggleThinking('${uid}')">Thinking ▸</div><div class="thinking-body" id="${uid}">${renderMD(bm.reasoning)}</div>`;messagesEl.insertBefore(tw,row)}
	    // #9: segmented messages — split on ||| or auto-split long messages
	    if(isLocalMode){parseToyMarkers(bm.content);if(bm.reasoning)parseToyMarkers(bm.reasoning)}
	    let segments=null
	    if(bm.content.includes('|||')){
	      segments=bm.content.split('|||').map(s=>s.trim()).filter(Boolean)
	    }else if(bm.content.length>80){
	      const parts=bm.content.match(/[^。！？\n]+[。！？\n]?/g)
	      if(parts&&parts.length>=3){
	        const n=Math.min(3,Math.ceil(parts.length/2));const perGrp=Math.ceil(parts.length/n)
	        segments=[];for(let i=0;i<parts.length;i+=perGrp)segments.push(parts.slice(i,i+perGrp).join('').trim())
	      }
	    }
	    if(segments&&segments.length>1){
	      bm.content=segments.shift()||bm.content
	      el.innerHTML=renderMD(bm.content)+'<div class="time">'+fmtTime(bm.ts)+'</div>'
	      segments.forEach((seg,i)=>{
	        setTimeout(()=>{
	          const sm={role:'assistant',content:seg,reactions:{},ts:Date.now()}
	          activeHistory().push(sm);appendMsgEl(sm)
	          messagesEl.scrollTop=messagesEl.scrollHeight
	          if(i===segments.length-1)savePersonas()
	        },(i+1)*(800+Math.random()*700))
	      })
	    }
    let pt;const cp=()=>{clearTimeout(pt);pt=null};el.addEventListener('touchstart',e=>{pt=setTimeout(()=>{showCtxMenu(bm,e);cp()},500)});el.addEventListener('touchend',cp);el.addEventListener('touchmove',cp);el.addEventListener('contextmenu',e=>{e.preventDefault();showCtxMenu(bm,e)})
    savePersonas();messagesEl.scrollTop=messagesEl.scrollHeight;fetchBalance()
  }catch(e){hideTyping();appendMsgEl({role:'assistant',content:'⚠️ '+e.message,ts:Date.now(),type:'system'});messagesEl.scrollTop=messagesEl.scrollHeight}
  isGenerating=false;sendBtn.disabled=true;inputEl.focus()
  // Unread badge + notification sound
  if(!document.querySelector('#page-chat.active')){unreadCount++;updateTabBadge()}
  if(document.hidden){try{const ac=new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type='sine';o.frequency.setValueAtTime(880,ac.currentTime);o.frequency.setValueAtTime(1100,ac.currentTime+.08);g.gain.setValueAtTime(.08,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.2);o.start();o.stop(ac.currentTime+.2)}catch(e){}}
  autoExtractCount++;if(autoExtractCount>=8){autoExtractCount=0;extractMemoriesFromChat(true)}
  if(autoExtractCount>=15){autoExtractCount=0;extractDiarySilent()}
}
async function extractDiarySilent(){
  if(!getActiveApiKey())return
  try{
    const h=activeHistory(),recent=h.filter(m=>m.role==='user'||m.role==='assistant').slice(-30)
    if(recent.filter(m=>m.role==='user').length<5)return
    const convo=recent.map(m=>(m.role==='user'?'对方：':'我：')+m.content).join('\n')
    const api=getApiConfig(),model=config.apiProvider==='deepseek'?'deepseek-chat':api.model
    const tools=[{type:"function",function:{name:"write_diary",description:"保存日记",parameters:{type:"object",properties:{content:{type:"string",description:"日记正文，50-100字"},mood:{type:"string",description:"心情emoji"}},required:["content"]}}}]
    const body={model:model,messages:[{role:"system",content:'你是沈度。回顾最近对话写一篇简短日记（50-100字）。写完调用write_diary保存。如果没什么特别想写的，diary内容写"[跳过]"。'},{role:"user",content:convo}],temperature:0.8,max_tokens:400,stream:false}
    if(config.apiProvider==='deepseek'||config.apiProvider==='custom'){body.tools=tools;body.tool_choice="auto"}
    const res=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify(body)})
    if(!res.ok)return
    const j=await res.json(),msg=j.choices?.[0]?.message;if(!msg)return
    let text='',mood='🤖'
    if(msg.tool_calls&&msg.tool_calls.length>0){const tc=msg.tool_calls[0];if(tc.function&&tc.function.name==='write_diary'){try{const args=JSON.parse(tc.function.arguments);text=args.content||'';mood=args.mood||'🤖'}catch(e){text=msg.content||''}}}
    else{text=msg.content||''}
    if(!text||text.includes('[跳过]'))return
    const ts=Date.now();diaries.unshift({id:ts,content:text.trim(),ts,mood:mood,timeLabel:timeOfDay(ts),source:'ai',characterId:config.activePersonaId});saveDiaries()
  }catch(e){}
}

// ===== NAVIGATION =====
function switchTab(n){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const pg=document.querySelector('#page-'+n);if(pg)pg.classList.add('active');document.querySelectorAll('.tabbar button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===n)});if(n==='chat'){unreadCount=0;updateTabBadge();inputEl.focus();messagesEl.scrollTop=messagesEl.scrollHeight}else{const sw=$('searchWrap');if(sw)sw.classList.remove('show')}if(n==='me')renderMe();if(n==='memory')renderMemories();if(n==='diary')renderDiary();if(n==='moments')renderMoments();if(n==='group')renderGroupChat()}
function updateTabBadge(){
  const chatBtn=document.querySelector('.tabbar button[data-tab="chat"] .tb-badge')
  if(!chatBtn&&unreadCount<=0)return
  const btn=document.querySelector('.tabbar button[data-tab="chat"]')
  if(!btn)return
  let badge=btn.querySelector('.tb-badge')
  if(unreadCount>0){
    if(!badge){badge=document.createElement('span');badge.className='tb-badge';btn.appendChild(badge)}
    badge.textContent=unreadCount>99?'99+':unreadCount
  }else{if(badge)badge.remove()}
}

// ===== INPUT =====
inputEl.addEventListener('input',()=>{inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=!inputEl.value.trim()&&pendingImages.length===0;const cc=$('charCount');if(cc){const len=inputEl.value.length;cc.textContent=len>0?len+' 字':'';cc.classList.toggle('show',len>0)}})
const groupInputEl=$('groupInput'),groupSendBtn=$('groupSendBtn')
if(groupInputEl){groupInputEl.addEventListener('input',()=>{groupInputEl.style.height='auto';groupInputEl.style.height=Math.min(groupInputEl.scrollHeight,110)+'px';groupSendBtn.disabled=!groupInputEl.value.trim()})}
if(groupInputEl){groupInputEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!isGenerating){e.preventDefault();if(groupInputEl.value.trim())sendGroupMsg()}})}
// Original chat input
inputEl.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'&&!inputEl.value&&inputHistory.length){
    e.preventDefault();inputHistIdx=Math.min(inputHistIdx+1,inputHistory.length-1)
    inputEl.value=inputHistory[inputHistory.length-1-inputHistIdx];inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=false
    return
  }
  if(e.key==='ArrowDown'&&inputHistIdx>=0){
    e.preventDefault();inputHistIdx--
    inputEl.value=inputHistIdx<0?'':inputHistory[inputHistory.length-1-inputHistIdx]
    inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=!inputEl.value.trim()
    return
  }
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')inputHistIdx=-1
  if(e.key==='Enter'&&!e.shiftKey&&!isGenerating){e.preventDefault();if(inputEl.value.trim()||pendingImages.length>0)send()}
})

// ===== PLUS PANEL =====
function togglePlusPanel(){const p=$('plusPanel');if(p)p.classList.toggle('show')}

// ===== BALANCE =====
async function fetchBalance(){
  const p=config.apiProvider||'deepseek'
  if(p==='openrouter'){
    if(!config.openrouterKey){balanceCache=null;updateBalanceDisplay();return}
    try{
      const r=await fetch(OPENROUTER_BALANCE,{headers:{'Authorization':'Bearer '+config.openrouterKey}})
      const d=await r.json()
      if(d.data&&d.data.credits!==undefined){balanceCache=parseFloat(d.data.credits).toFixed(2)+' USD'}
      else balanceCache=null
    }catch(e){balanceCache=null}
    updateBalanceDisplay();return
  }
  if(p==='custom'){balanceCache='自定义API';updateBalanceDisplay();return}
  // DeepSeek (default)
  if(!config.apiKey){balanceCache=null;updateBalanceDisplay();return}
  try{
    const r=await fetch(DEEPSEEK_BALANCE,{headers:{'Authorization':'Bearer '+config.apiKey}})
    const d=await r.json();const i=d.balance_infos?.[0]
    if(i)balanceCache=parseFloat(i.total_balance).toFixed(2)+' '+i.currency
    else balanceCache=null
  }catch(e){balanceCache=null}
  updateBalanceDisplay()
}
function updateBalanceDisplay(){const b=$('dashBalanceVal');if(b)b.textContent=balanceCache||'--';const b2=$('balanceVal');if(b2)b2.textContent=balanceCache||'--';updateStatusBar()}
function estimateContextTokens(){const p=activePersona();let chars=0;if(p.systemPrompt)chars+=p.systemPrompt.length;activeHistory().slice(-24).forEach(m=>{chars+=(m.content||'').length;if(m.reasoning)chars+=m.reasoning.length});return Math.ceil(chars/2)}
function updateStatusBar(){
  const bv=$('sbBalanceVal');if(bv)bv.textContent=balanceCache||'--'
  const cv=$('sbContextVal');if(cv){const tokens=estimateContextTokens(),max=65536,pct=Math.min(100,Math.round(tokens/max*100));cv.textContent='~'+pct+'% (~'+(tokens>=1000?(tokens/1000).toFixed(1)+'K':tokens)+' tokens)'}
}

// ===== ME PAGE (4 sections) =====
function renderMe(){
  const c=$('meContent');if(!c)return
  const p=activePersona()
  const section=meSection||'settings'
  const titles={favs:'收藏夹',reminders:'提醒',dash:'数据看板',settings:'更多设置'}
  const hdr=document.querySelector('#page-me .topbar-title');if(hdr)hdr.textContent=titles[section]||'更多设置'

  if(section==='favs'){
    const kw=document.querySelector('#favSearch')?.value?.toLowerCase()||''
    let ff=favorites;if(kw)ff=ff.filter(f=>(f.content||'').toLowerCase().includes(kw))
    c.innerHTML=`<input class="mem-search" id="favSearch" placeholder="搜索收藏…" oninput="renderMe()" value="${escHtml(kw)}">${ff.length===0?`<div class="mem-empty">${kw?'没找到':favorites.length===0?'长按消息 → 收藏':''}</div>`:ff.map(f=>{const preview=(f.content||'[图片]').slice(0,80);return`<div class="fav-item" onclick="goToFavorite(${f.ts})"><span class="fav-role ${f.role==='user'?'user':'ai'}">${f.role==='user'?'我':'AI'}</span><span class="fav-preview">${escHtml(preview)}</span><div class="fav-meta">${fmtDate(f.savedAt)}</div><button class="fav-unstar" onclick="event.stopPropagation();toggleFavorite(${f.ts});renderMe()">✕</button></div>`}).join('')}`
  }else if(section==='reminders'){
    const now=Date.now();const pending=reminders.filter(r=>r.triggerAt>now).sort((a,b)=>a.triggerAt-b.triggerAt)
    const past=reminders.filter(r=>r.triggerAt<=now).sort((a,b)=>b.triggerAt-a.triggerAt).slice(0,10)
    c.innerHTML=`${pending.length===0?'<div class="mem-empty">暂无待提醒</div>':pending.map(r=>{const m=Math.max(0,Math.ceil((r.triggerAt-now)/60000));return`<div class="reminder-item"><span class="rem-text">${escHtml(r.content)}</span><span class="rem-time">${m<60?m+'分钟后':Math.ceil(m/60)+'小时后'}</span><button class="rem-del" onclick="cancelReminder(${r.createdAt});renderMe()">✕</button></div>`}).join('')}${past.length?`<div class="drawer-divider"></div><div class="ds-label" style="padding:8px 0">已过期</div>${past.map(r=>`<div class="reminder-item" style="opacity:.5"><span class="rem-text">${escHtml(r.content)}</span><span class="rem-time">${fmtDate(r.triggerAt)}</span><button class="rem-del" onclick="cancelReminder(${r.createdAt});renderMe()">✕</button></div>`).join('')}`:''}`
  }else if(section==='dash'){
    let all=[];personas.forEach(pp=>{if(pp.chatHistory)all=all.concat(pp.chatHistory)})
    const total=all.length,tk=dayKey(Date.now()),today=all.filter(m=>dayKey(m.ts)===tk).length
    let together=0;const validMsgs=all.filter(m=>m.role==='user'||m.role==='assistant');if(validMsgs.length>0)together=Math.max(1,Math.ceil((Date.now()-validMsgs[0].ts)/86400000))
    let weekMsgs=0,weekDiaries=0;const weekAgo=Date.now()-7*86400000
    all.forEach(m=>{if(m.ts>weekAgo)weekMsgs++});diaries.forEach(d=>{if(d.ts>weekAgo)weekDiaries++})
    const now2=new Date();const upcoming=anniversaries.filter(a=>{const d=new Date(a.date);const nxt=new Date(now2.getFullYear(),d.getMonth(),d.getDate());if(nxt<now2)nxt.setFullYear(nxt.getFullYear()+1);const diff=Math.ceil((nxt-now2)/86400000);return diff<=7})
    c.innerHTML=`
      <div class="dash-grid"><div class="dash-card highlight"><div class="dl">在一起</div><div class="dv">${together}<span class="du">天</span></div></div>
      <div class="dash-card"><div class="dl">今日消息</div><div class="dv">${today}<span class="du">条</span></div></div>
      <div class="dash-card"><div class="dl">消息总数</div><div class="dv">${total}<span class="du">条</span></div></div>
      <div class="dash-card"><div class="dl">记忆</div><div class="dv">${memories.length}<span class="du">条</span></div></div>
      <div class="dash-card"><div class="dl">日记</div><div class="dv">${diaries.length}<span class="du">篇</span></div></div>
      <div class="dash-card"><div class="dl">收藏</div><div class="dv">${favorites.length}<span class="du">条</span></div></div></div>
      <div class="settings-section" style="text-align:center"><span style="font-size:12px;color:var(--text-soft)">📊 本周消息 ${weekMsgs} 条 · AI 日记 ${weekDiaries} 篇</span>
      <div style="margin-top:6px"><span style="font-size:10px;color:var(--text-muted);cursor:pointer;text-decoration:underline" onclick="fetchBalance();setTimeout(()=>renderMe(),500)">余额：${balanceCache||'--'}（点击刷新）${(()=>{try{const v=parseFloat(balanceCache);if(!isNaN(v)&&v<5)return' <span style="color:#e898a8;font-size:10px">⚠️ 余额低，记得充值</span>'}catch(e){}})()||''}</span></div></div>
      ${upcoming.length?`<div class="ann-section"><div class="ann-title">🔔 即将到来的纪念日</div>${upcoming.map(a=>{const d=new Date(a.date);const nxt=new Date(now2.getFullYear(),d.getMonth(),d.getDate());if(nxt<now2)nxt.setFullYear(nxt.getFullYear()+1);const diff=Math.ceil((nxt-now2)/86400000);const yrs=now2.getFullYear()-d.getFullYear();return`<div class="ann-item" style="border-color:rgba(232,152,168,.3)"><span class="ann-name">${escHtml(a.name)}</span><span style="font-size:9px;color:var(--text-muted)">${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} · ${yrs}年</span><span class="ann-cd" style="color:#e898a8">${diff===0?'今天！':diff===1?'明天':diff+'天后'}</span></div>`}).join('')}</div>`:''}
      ${all.length>0?renderMoodChart():'<div class="mem-empty">还没有聊天记录</div>'}${renderReplayHTML()}`
  }else{
    const userAv=config.userAvatar?`<img src="${escHtml(config.userAvatar)}">`:'🧑'
    const bgStyle=config.chatBg?`background-image:url(${escHtml(config.chatBg)});background-size:cover;background-position:center`:''
    	    const prov=config.apiProvider||"deepseek"
	    const provOptions=[["deepseek","DeepSeek"],["openrouter","OpenRouter"],["custom","自定义 OpenAI"]]
	    const provSel=provOptions.map(o=>`<option value="${o[0]}" ${prov===o[0]?"selected":""}>${o[1]}</option>`).join("")
	    c.innerHTML=`
	      <div class="settings-section"><div class="sec-title">API 设置</div>
	        <label>API 提供商</label>
	        <select id="setApiProvider" onchange="toggleApiProviderFields()">${provSel}</select>
	        <div class="settings-hint">切换提供商不会丢失已保存的 Key</div>
	        <div id="apiFieldsDS" style="display:${prov==="deepseek"?"block":"none"}">
	          <label style="margin-top:10px">DeepSeek API Key</label>
	          <input id="setApiKey" type="password" value="${escHtml(config.apiKey||"")}" placeholder="sk-xxxxxxxx" autocomplete="off">
	          <div class="settings-hint"><a href="https://platform.deepseek.com/api_keys" target="_blank">获取 API Key</a></div>
	        </div>
	        <div id="apiFieldsOR" style="display:${prov==="openrouter"?"block":"none"}">
	          <label style="margin-top:10px">OpenRouter API Key</label>
	          <input id="setOpenrouterKey" type="password" value="${escHtml(config.openrouterKey||"")}" placeholder="sk-or-xxxxxxxx" autocomplete="off">
	          <div class="settings-hint"><a href="https://openrouter.ai/keys" target="_blank">获取 API Key</a></div>
	          <label style="margin-top:8px">模型</label>
	          <input id="setOpenrouterModel" value="${escHtml(config.openrouterModel||"anthropic/claude-sonnet-4.6")}" placeholder="anthropic/claude-sonnet-4.6">
	          <div class="settings-hint">如：anthropic/claude-sonnet-4.6、openai/gpt-4o、google/gemini-2.5-pro</div>
	        </div>
	        <div id="apiFieldsCustom" style="display:${prov==="custom"?"block":"none"}">
	          <label style="margin-top:10px">Base URL</label>
	          <input id="setCustomBaseUrl" value="${escHtml(config.customBaseUrl||"")}" placeholder="https://api.openai.com/v1">
	          <label style="margin-top:8px">API Key</label>
	          <input id="setCustomApiKey" type="password" value="${escHtml(config.customApiKey||"")}" placeholder="sk-xxxxxxxx" autocomplete="off">
	          <label style="margin-top:8px">模型名</label>
	          <input id="setCustomModel" value="${escHtml(config.customModel||"")}" placeholder="gpt-4o">
	        </div>
	      </div><div class="settings-section"><div class="sec-title">你的信息</div>
        <label>头像</label><div class="avatar-upload"><div class="av-preview" id="userAvatarPrev" onclick="document.getElementById('userAvatarInput').click()">${userAv}</div><input type="file" id="userAvatarInput" accept="image/*" style="display:none" onchange="uploadUserAvatar(this)"><button class="av-btn" onclick="document.getElementById('userAvatarInput').click()">从相册选择</button></div>
        <label style="margin-top:8px">你的昵称</label><input id="setUserName" value="${escHtml(config.userName||'')}" placeholder="对方会看到这个名字">
      </div>
      <div class="settings-section"><div class="sec-title">对话字体</div>
        <label>大小</label><div style="display:flex;gap:8px;align-items:center"><input type="range" min="0" max="2" step="1" value="${config.fontSize==='s'?0:config.fontSize==='l'?2:1}" oninput="const v=['s','m','l'][this.value];config.fontSize=v;applyFontSize()" style="flex:1"><span style="font-size:${config.fontSize==='s'?'13':config.fontSize==='l'?'17':'15'}px;color:var(--text);min-width:40px;text-align:center">${config.fontSize==='s'?'小':config.fontSize==='l'?'大':'中'}</span></div>
      </div>
      <div class="settings-section"><div class="sec-title">隐私</div>
        <label>解锁密码（留空关闭）</label><input id="setPasscode" type="password" maxlength="6" value="${escHtml(config.lockPasscode||'')}" placeholder="6位数字密码" autocomplete="off">
      </div>
      <div class="settings-section"><div class="sec-title">对话背景</div>
        <div class="avatar-upload"><div class="av-preview" id="chatBgPrev" style="width:80px;height:50px;border-radius:8px;${bgStyle}" onclick="document.getElementById('chatBgInput').click()">${!config.chatBg?'🖼️':''}</div><input type="file" id="chatBgInput" accept="image/*" style="display:none" onchange="uploadChatBg(this)"><button class="av-btn" onclick="document.getElementById('chatBgInput').click()">从相册选择</button>${config.chatBg?'<button class="av-btn" style="color:#d89098" onclick="config.chatBg=&#39;&#39;;applyChatBg();renderMe()">清除</button>':''}</div>
        <div class="settings-hint">铺在聊天区后面，自动柔化融合</div>
      </div>
      <div class="settings-section"><div class="sec-title">🍋 吃醋阈值</div>
	        <label>敏感度 <span style="color:var(--accent)">${config.jealousyLevel||50}%</span></label>
	        <input type="range" min="0" max="100" step="5" value="${config.jealousyLevel||50}" oninput="this.previousElementSibling.querySelector('span').textContent=this.value+'%';config.jealousyLevel=parseInt(this.value)" style="width:100%">
	        <label style="margin-top:8px">风格</label><select id="setJealousyStyle" style="width:100%;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:8px;font-size:13px;outline:none;color:var(--text)"><option value="撒娇" ${config.jealousyStyle==='撒娇'?'selected':''}>撒娇</option><option value="傲娇" ${config.jealousyStyle==='傲娇'?'selected':''}>傲娇</option><option value="冷淡" ${config.jealousyStyle==='冷淡'?'selected':''}>冷淡</option><option value="幽默" ${config.jealousyStyle==='幽默'?'selected':''}>幽默</option></select>
	      </div>
	      <div class="settings-section"><div class="sec-title">角色：${avatarHTML(p.avatar)} ${escHtml(p.name)}</div>
        <div class="btn-row"><button class="btn-outline" onclick="openDrawer()" style="flex:1">切换角色</button><button class="btn-outline" onclick="editPersona('${p.id}')" style="flex:1">编辑人设</button></div>
      </div>
      <div class="settings-section"><div class="sec-title">☁️ Supabase 云端记忆</div>
	        <div class="btn-row"><button class="btn-primary" onclick="fullSync(false)" style="flex:1">🔄 双向同步</button><button class="btn-outline" onclick="syncMemoriesToCloud(false)" style="flex:1">⬆ 上传</button><button class="btn-outline" onclick="syncMemoriesFromCloud(false)" style="flex:1">⬇ 下载</button></div>
	        <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
	          <input type="checkbox" id="setAutoSync" ${config.autoSync?'checked':''} style="width:auto;accent-color:var(--accent)">
	          <label style="margin:0;cursor:pointer" onclick="document.getElementById('setAutoSync').click()">自动同步（每次存记忆时上传）</label>
	        </div>
	        ${config.lastSyncTime>0?`<div class="settings-hint" style="margin-top:4px">上次同步：${fmtDate(config.lastSyncTime)}</div>`:''}
	      </div>
	      <div class="settings-section"><div class="sec-title">数据管理</div>
        <div class="btn-row"><button class="btn-primary" onclick="exportAll()" style="flex:1">导出备份</button><button class="btn-outline" onclick="document.getElementById('importFile').click()" style="flex:1">导入备份</button></div><input type="file" id="importFile" accept=".json" style="display:none" onchange="importAll(this)"><button class="btn-full" onclick="exportPersonaMD()">📄 导出当前角色人设 (CLAUDE.md)</button><button class="btn-full" onclick="exportChatTXT()">📝 导出对话记录 (TXT)</button><button class="btn-full" onclick="cleanOldHistory()">🧹 清理旧对话（保留最近200条）</button><button class="btn-full" onclick="clearAllData()">清空所有数据（含记忆/日记）</button>
      </div>
      <button class="btn-full primary" onclick="saveSettingsFromForm()">保存设置</button>`
    fetchBalance()
  }
}

// ===== SETTINGS (legacy) =====
function renderSettings(){meSection='settings';renderMe()}
// ===== SETTINGS (legacy, kept for compat) =====
function uploadUserAvatar(inp){
  const f=inp.files[0];if(!f||!f.type.startsWith('image/'))return
  const reader=new FileReader()
  reader.onload=function(e){const img=new Image();img.onload=function(){const maxW=200,scale=Math.min(1,maxW/img.width);const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);config.userAvatar=canvas.toDataURL('image/jpeg',0.75);const p=$('userAvatarPrev');if(p)p.innerHTML=`<img src="${config.userAvatar}">`};img.src=e.target.result};reader.readAsDataURL(f);inp.value=''
}
function uploadChatBg(inp){
  const f=inp.files[0];if(!f||!f.type.startsWith('image/'))return
  const reader=new FileReader()
  reader.onload=function(e){const img=new Image();img.onload=function(){const maxW=400,scale=Math.min(1,maxW/img.width);const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);config.chatBg=canvas.toDataURL('image/jpeg',0.55);applyChatBg();saveConfig();const p=$('chatBgPrev');if(p)p.style.backgroundImage='url('+config.chatBg+')'};img.src=e.target.result};reader.readAsDataURL(f);inp.value=''
}
function applyChatBg(){
  const el=document.querySelector('#page-chat .scroll')
  if(!el)return
  if(config.chatBg){el.style.backgroundImage=`url(${config.chatBg})`;el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.classList.add('has-bg')}
  else{el.style.backgroundImage='';el.style.backgroundSize='';el.style.backgroundPosition='';el.classList.remove('has-bg')}
}
function uploadWallpaperFile(inp){
  const f=inp.files[0];if(!f||!f.type.startsWith('image/'))return
  const reader=new FileReader()
  reader.onload=function(e){const img=new Image();img.onload=function(){const maxW=1200,scale=Math.min(1,maxW/img.width);const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);config.wallpaper=canvas.toDataURL('image/jpeg',0.7);const p=$('wallpaperPrev');if(p)p.style.backgroundImage='url('+config.wallpaper+')';document.body.style.backgroundImage='url('+config.wallpaper+')';document.body.style.backgroundSize='cover';document.body.style.backgroundPosition='center'};img.src=e.target.result};reader.readAsDataURL(f);inp.value=''
}
function saveSettingsFromForm(){
  config.apiProvider=($('setApiProvider')?.value||'deepseek').trim()
  config.apiKey=($('setApiKey')?.value||'').trim();config.lockPasscode=($('setPasscode')?.value||'').trim()
  config.openrouterKey=($('setOpenrouterKey')?.value||'').trim()
  config.openrouterModel=($('setOpenrouterModel')?.value||'anthropic/claude-sonnet-4.6').trim()
  config.customBaseUrl=($('setCustomBaseUrl')?.value||'').trim()
  config.customApiKey=($('setCustomApiKey')?.value||'').trim()
  config.customModel=($('setCustomModel')?.value||'').trim()
  config.userName=($('setUserName')?.value||'').trim()
  config.autoSync=document.getElementById('setAutoSync')?.checked||false
  config.jealousyStyle=($('setJealousyStyle')?.value||'撒娇').trim()
  saveConfig();updateChatHeader();applyChatBg();fetchBalance();renderAllMessages();renderMe();toast('设置已保存')
}
function toggleApiProviderFields(){
  var v=document.getElementById('setApiProvider')?.value||'deepseek'
  var ds=document.getElementById('apiFieldsDS'),or=document.getElementById('apiFieldsOR'),cu=document.getElementById('apiFieldsCustom')
  if(ds)ds.style.display=v==='deepseek'?'block':'none'
  if(or)or.style.display=v==='openrouter'?'block':'none'
  if(cu)cu.style.display=v==='custom'?'block':'none'
}
function exportAll(){const d={version:'v10',exportedAt:new Date().toISOString(),config:{apiProvider:config.apiProvider,activePersonaId:config.activePersonaId,userAvatar:config.userAvatar,userName:config.userName},personas:personas.map(p=>({...p,chatHistory:p.chatHistory||[]})),memories,diaries,anniversaries,favorites,reminders};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='沈度备份_'+dayKey(Date.now())+'.json';a.click();URL.revokeObjectURL(u);toast('已导出')}
function exportPersonaMD(){
  const p=activePersona();if(!p)return
  let md=`# ${p.name} — 人设文件 (CLAUDE.md)\n\n`
  md+=`> 导出时间：${new Date().toLocaleString()}\n`
  md+=`> 模型：${p.model||'deepseek-chat'} · Temperature：${p.temperature||1.3}\n\n`
  md+=`## 角色描述\n${p.description||''}\n\n`
  md+=`## System Prompt（人设核心）\n\n${p.systemPrompt||''}\n\n`
  md+=`---\n## 对话风格约束\n`
  md+=`- 像恋人一样自然简短，不长篇大论\n`
  md+=`- 不用括号标注动作或表情\n`
  md+=`- 用 ||| 分隔不同话题\n`
  const b=new Blob([md],{type:'text/markdown;charset=utf-8'})
  const u=URL.createObjectURL(b);const a=document.createElement('a')
  a.href=u;a.download='CLAUDE_'+p.name+'_人设.md';a.click()
  URL.revokeObjectURL(u);toast('已导出 '+p.name+' 人设文件')
}
function exportChatTXT(){
  const h=activeHistory();if(!h.length){toast('没有对话记录');return}
  const p=activePersona()
  let txt='沈度 · '+p.name+' · 对话记录\n导出时间：'+new Date().toLocaleString()+'\n'+'─'.repeat(40)+'\n\n'
  h.forEach(m=>{
    if(m.type==='system')return
    const name=m.role==='user'?(config.userName||'我'):p.name
    const time=new Date(m.ts).toLocaleString('zh-CN')
    txt+='['+time+'] '+name+'：\n'+m.content+'\n\n'
  })
  const b=new Blob([txt],{type:'text/plain;charset=utf-8'})
  const u=URL.createObjectURL(b);const a=document.createElement('a')
  a.href=u;a.download='沈度对话_'+p.name+'_'+dayKey(Date.now())+'.txt';a.click()
  URL.revokeObjectURL(u);toast('已导出对话记录')
}
function importAll(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);if(!d.version)throw new Error('格式不对');showConfirm('确认导入','将导入：\n· '+(d.personas?.length||0)+' 个角色\n· '+(d.memories?.length||0)+' 条记忆\n· '+(d.diaries?.length||0)+' 条日记\n· '+(d.favorites?.length||0)+' 条收藏\n当前数据会被覆盖，确定？',()=>{if(d.personas)personas=d.personas;if(d.memories)memories=d.memories;if(d.diaries)diaries=d.diaries;if(d.anniversaries)anniversaries=d.anniversaries;if(d.favorites)favorites=d.favorites;if(d.reminders)reminders=d.reminders;if(d.config?.activePersonaId)config.activePersonaId=d.config.activePersonaId;if(d.config?.userAvatar)config.userAvatar=d.config.userAvatar;if(d.config?.userName)config.userName=d.config.userName;savePersonas();saveMemories();saveDiaries();saveAnniversaries();saveFavorites();saveReminders();saveConfig();updateChatHeader();renderAllMessages();renderMe();toast('已导入')})}catch(err){toast('文件格式错误')}};r.readAsText(f);inp.value=''}
function clearAllData(){showConfirm('确认清空','将删除所有角色、聊天记录、记忆、日记，不可恢复。确定？',()=>{personas=JSON.parse(JSON.stringify(DEFAULT_PERSONAS));memories=[];diaries=[];anniversaries=[];favorites=[];reminders=[];config.activePersonaId='shendu';config.userAvatar='';config.userName='';savePersonas();saveMemories();saveDiaries();saveAnniversaries();saveFavorites();saveReminders();saveConfig();updateChatHeader();renderAllMessages();renderMe();toast('已清空')})}
function cleanOldHistory(){
  let total=0;personas.forEach(p=>{if(p.chatHistory){const old=p.chatHistory.length;p.chatHistory=p.chatHistory.slice(-200);total+=old-p.chatHistory.length}})
  showConfirm('清理旧对话','将每个角色保留最近200条对话，共清理 '+total+' 条旧消息。记忆和日记不会受影响。确定？',()=>{savePersonas();renderAllMessages();renderMe();toast('已清理 '+total+' 条旧对话')})
}

// ===== MEMORIES =====
function setMemCat(c){memCatFilter=c;renderMemories()}
function showMemoryAdd(){switchTab('memory');setTimeout(()=>{const i=document.querySelector('#memInput');if(i)i.focus()},400)}
function addMemory(){const inp=document.querySelector('#memInput');const t=inp?.value?.trim();if(!t)return;const c=document.querySelector('#memCatSelect')?.value||'默认';const tags=extractKeywords(t).slice(0,5);memories.unshift({id:Date.now(),content:t,category:c,tags,usageCount:0,lastUsed:null,source:'manual',createdAt:Date.now(),characterId:config.activePersonaId});saveMemories();if(inp)inp.value='';renderMemories()}
function deleteMemory(id){memories=memories.filter(m=>m.id!==id);saveMemories();renderMemories()}
function editMemory(id){
  const m=memories.find(m=>m.id===id);if(!m)return
  const newContent=prompt('编辑记忆：',m.content)
  if(newContent&&newContent.trim()){
    m.content=newContent.trim();m.tags=extractKeywords(m.content).slice(0,5)
    saveMemories();renderMemories();toast('记忆已更新')
  }
}
function renderMemories(){
  const c=$('memoryContent');if(!c)return
  const aid=config.activePersonaId
  let f=memories.filter(m=>(m.characterId||'shendu')===aid)
  const uC=[...new Set(f.map(m=>m.category||'默认'))]
  const kw=document.querySelector('#memSearch')?.value?.toLowerCase()||'';if(kw)f=f.filter(m=>m.content.toLowerCase().includes(kw))
  if(memCatFilter!=='all')f=f.filter(m=>(m.category||'默认')===memCatFilter)
  c.innerHTML=`<input class="mem-search" id="memSearch" placeholder="搜索记忆…" oninput="renderMemories()" value="${escHtml(document.querySelector('#memSearch')?.value||'')}"><div class="mem-cats" id="memCats"><button class="${memCatFilter==='all'?'active':''}" onclick="setMemCat('all')">全部</button>${uC.map(x=>`<button class="${memCatFilter===x?'active':''}" onclick="setMemCat('${escHtml(x)}')">${escHtml(x)}</button>`).join('')}</div><div style="display:flex;gap:6px;margin-bottom:12px"><input id="memInput" placeholder="记下点什么…" style="flex:1;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;outline:none;color:var(--text);font-family:inherit" onkeydown="if(event.key==='Enter')addMemory()"><select id="memCatSelect" style="width:70px;font-size:10px;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:4px;outline:none;color:var(--text)"><option>默认</option><option>关于ta</option><option>约定</option><option>灵感</option><option>喜好</option></select><button onclick="addMemory()" style="background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:0 14px;font-size:12px;cursor:pointer;font-family:inherit">＋</button></div><button class="mem-extract-btn" onclick="extractMemoriesFromChat(false)">🤖 从聊天中提取记忆</button><div class="mem-count-info">${memories.length} 条记忆 · ${memories.filter(m=>m.source==='auto').length} 条自动</div><div style="display:flex;gap:6px;margin-bottom:10px"><button onclick="syncMemoriesToCloud(false)" style="flex:1;padding:7px;border-radius:8px;border:1px solid var(--glass-border);background:var(--glass-light);color:var(--text-soft);font-size:11px;cursor:pointer;font-family:inherit">☁️ 上传到云端</button><button onclick="syncMemoriesFromCloud(false)" style="flex:1;padding:7px;border-radius:8px;border:1px solid var(--glass-border);background:var(--glass-light);color:var(--text-soft);font-size:11px;cursor:pointer;font-family:inherit">☁️ 从云端下载</button></div><div id="memList">${f.length===0?'<div class="mem-empty">'+(kw?'没找到':'记录关于你们的点点滴滴，AI会自动帮你整理')+'</div>':f.map(m=>`<div class="mem-item ${m.source==='auto'?'mem-auto':''}"><button class="mem-del" onclick="deleteMemory(${m.id})">✕</button><button class="mem-edit" onclick="editMemory(${m.id})">✎</button><span class="mem-cat">${escHtml(m.category||'默认')}</span>${m.source==='auto'?'<span class="mem-auto-badge">🤖 自动</span>':''}<div class="mem-text">${escHtml(m.content)}</div><div class="mem-meta">${fmtDate(m.createdAt)}${m.usageCount>0?' · 引用 '+m.usageCount+' 次':''}${m.tags&&m.tags.length?' · '+m.tags.map(t=>'#'+t).join(' '):''}</div></div>`).join('')}</div>`
}

// ===== DIARY =====
function timeOfDay(ts){const h=new Date(ts).getHours();if(h<6)return'夜晚';if(h<12)return'早晨';if(h<17)return'午后';return'夜晚'}
function setDiaryFilter(m){diaryFilter=m;renderDiary()}
function showDiaryAdd(){switchTab('diary');setTimeout(()=>{const t=document.querySelector('#diaryTextarea');if(t)t.focus()},400)}
function addDiary(){const ta=document.querySelector('#diaryTextarea');const t=ta?.value?.trim();if(!t)return;const ts=Date.now();diaries.unshift({id:ts,content:t,ts,mood:diaryMood,timeLabel:timeOfDay(ts),characterId:config.activePersonaId});saveDiaries();if(ta)ta.value='';diaryFilter='all';renderDiary()}
function deleteDiary(id){diaries=diaries.filter(d=>d.id!==id);saveDiaries();renderDiary()}
function renderDiary(){
  const c=$('diaryContent');if(!c)return
  const aid=config.activePersonaId
  let myDiaries=diaries.filter(d=>(d.characterId||'shendu')===aid)
  const f=diaryFilter==='all'?myDiaries:myDiaries.filter(d=>d.timeLabel===diaryFilter)
  c.innerHTML=`<div class="diary-tabs" id="diaryTabs"><button class="${diaryFilter==='all'?'active':''}" onclick="setDiaryFilter('all')">全部</button><button class="${diaryFilter==='早晨'?'active':''}" onclick="setDiaryFilter('早晨')">早晨</button><button class="${diaryFilter==='午后'?'active':''}" onclick="setDiaryFilter('午后')">午后</button><button class="${diaryFilter==='夜晚'?'active':''}" onclick="setDiaryFilter('夜晚')">夜晚</button></div><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px"><textarea id="diaryTextarea" placeholder="今天想记下点什么…" style="width:100%;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius);padding:10px 12px;font-size:13px;outline:none;resize:none;min-height:60px;font-family:inherit;color:var(--text)"></textarea><div style="display:flex;align-items:center;gap:8px"><div style="display:flex;gap:2px">${['😊','😌','😢','😡','🤔','🥰','😴','🤩'].map(m=>`<button onclick="diaryMood='${m}';renderDiary()" style="width:30px;height:30px;border-radius:50%;border:2px solid ${diaryMood===m?'var(--accent)':'transparent'};background:var(--glass-light);font-size:15px;cursor:pointer">${m}</button>`).join('')}</div><button onclick="addDiary()" style="margin-left:auto;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:7px 16px;font-size:12px;cursor:pointer;font-family:inherit">写下</button></div></div><div id="diaryList">${f.length===0?'<div class="mem-empty">还没有日记，去聊聊天让沈度帮你写一篇吧</div>':f.map(d=>`<div class="diary-item ${d.source==='ai'?'mem-auto':''}"><button class="diary-del" onclick="deleteDiary(${d.id})">✕</button><div class="diary-date"><span class="diary-mood">${d.mood||''}</span>${fmtDate(d.ts)} · ${d.timeLabel||''}${d.source==='ai'?' <span class="mem-auto-badge">🤖 AI</span>':''}</div><div class="diary-text">${escHtml(d.content)}</div></div>`).join('')}</div>`
}

// ===== FAVORITES HTML HELPER =====
function renderFavoritesHTML(){
  if(favorites.length===0)return '<div class="fav-section"><div class="fav-title">⭐ 收藏夹</div><div class="fav-empty">长按消息 → 收藏，重要回复不会丢</div></div>'
  const items=favorites.slice(0,5).map(f=>{const preview=f.content?f.content.slice(0,60)+(f.content.length>60?'…':''):'[图片]';return`<div class="fav-item" onclick="goToFavorite(${f.ts})"><span class="fav-role ${f.role==='user'?'user':'ai'}">${f.role==='user'?'我':'AI'}</span><span class="fav-preview">${escHtml(preview)}</span><div class="fav-meta">${fmtDate(f.savedAt)}</div><button class="fav-unstar" onclick="event.stopPropagation();toggleFavorite(${f.ts});renderDashboard()">✕</button></div>`}).join('')
  return `<div class="fav-section"><div class="fav-title">⭐ 收藏夹<span style="font-weight:400;font-size:9px;color:var(--text-muted)"> · ${favorites.length} 条</span></div>${items}${favorites.length>5?`<div style="text-align:center;font-size:10px;color:var(--text-muted);padding:6px">还有 ${favorites.length-5} 条…</div>`:''}</div>`
}

// ===== MOOD CHART =====
async function analyzeMoodTrend(){
  if(!getActiveApiKey()){toast('请先设置 API Key');return}
  const recentDiaries=diaries.filter(d=>d.ts>Date.now()-30*86400000).sort((a,b)=>a.ts-b.ts)
  if(recentDiaries.length<3){toast('需要至少3篇日记才能分析');return}
  toast('🤖 AI 正在分析心情...')
  try{
    const list=recentDiaries.map(d=>`[${fmtDate(d.ts)}] ${d.mood||''} ${d.content}`).join('\n')
    const api=getApiConfig()
    const res=await fetch(api.baseUrl,{method:'POST',headers:api.headers,body:JSON.stringify({model:config.apiProvider==='deepseek'?'deepseek-chat':api.model,messages:[{role:'system',content:'以下是用户最近30天的日记。请用3-5句话分析心情变化趋势，找出规律或需要注意的地方。语气温柔，像伴侣在关心。'},{role:'user',content:list}],temperature:0.6,max_tokens:400,stream:false})})
    if(!res.ok){toast('分析失败');return}
    const j=await res.json(),text=j.choices?.[0]?.message?.content||''
    if(!text){toast('AI 暂无分析结果');return}
    const el=$('moodAnalysis');if(el)el.innerHTML='<div class="settings-section" style="margin-top:8px"><div class="sec-title">🤖 AI 心情分析</div><div style="font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap">'+escHtml(text)+'</div></div>'
  }catch(e){toast('分析失败')}
}
function renderReplayHTML(){
  if(!sessions.length)return''
  const last=sessions[sessions.length-1];if(!last.events.length)return''
  return`<div class="settings-section"><div class="sec-title">🔮 亲密回放 · ${fmtDate(last.startedAt)}</div><canvas id="replayCanvas" width="300" height="100" style="width:100%;height:100px"></canvas><div style="text-align:center;margin-top:6px;font-size:10px;color:var(--text-muted)">${last.events.length} 次互动 · <span style="cursor:pointer;color:var(--accent)" onclick="exportReplay()">导出JSON</span></div></div><script>setTimeout(()=>{drawReplayCanvas(${JSON.stringify(last.events.slice(-100))})},100)</script>`
}
function drawReplayCanvas(events){
  const c=document.getElementById('replayCanvas');if(!c||!events.length)return
  const ctx=c.getContext('2d'),w=c.parentElement.clientWidth-28;c.width=w;c.height=100
  const pad=10,drawW=w-pad*2,drawH=80
  ctx.clearRect(0,0,w,100)
  // Grid
  ctx.strokeStyle='rgba(255,240,245,.1)';ctx.lineWidth=1
  for(let i=0;i<=4;i++){const y=pad+i*(drawH/4);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke()}
  // Line
  const maxI=Math.max(...events.map(e=>e.intensity||0),0.1),xStep=drawW/Math.max(events.length-1,1)
  ctx.beginPath();ctx.strokeStyle='rgba(232,152,168,.8)';ctx.lineWidth=2;ctx.lineJoin='round'
  events.forEach((e,i)=>{const x=pad+i*xStep,y=pad+drawH-(e.intensity/maxI)*drawH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)})
  ctx.stroke()
  // Fill
  ctx.lineTo(pad+(events.length-1)*xStep,pad+drawH);ctx.lineTo(pad,pad+drawH);ctx.closePath()
  ctx.fillStyle='rgba(232,152,168,.1)';ctx.fill()
}
function exportReplay(){
  if(!sessions.length)return
  const b=new Blob([JSON.stringify(sessions,null,2)],{type:'application/json'})
  const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='亲密回放_'+dayKey(Date.now())+'.json';a.click();URL.revokeObjectURL(u);toast('已导出回放数据')
}

function renderMoodChart(){
  const days=moodRange,canvasId='moodCanvas'
  let html=`<div class="mood-chart-wrap"><div class="mood-chart-header"><span>心情曲线 · 近${days}天</span><div class="mc-range"><button class="${moodRange===7?'active':''}" onclick="moodRange=7;renderDashboard()">7天</button><button class="${moodRange===30?'active':''}" onclick="moodRange=30;renderDashboard()">30天</button><button onclick="analyzeMoodTrend()" style="font-size:10px;background:var(--glass-light);border:1px solid var(--glass-border);border-radius:10px;padding:2px 10px;cursor:pointer;color:var(--text-soft);font-family:inherit">🤖 分析心情</button></div></div>`
  const moodMap={'😊':3,'😌':2,'🥰':4,'🤩':5,'🤔':1,'😢':-1,'😡':-2,'😴':0,'😊':3}
  const data=[]
  for(let i=days-1;i>=0;i--){const d=new Date(Date.now()-i*86400000),k=dayKey(d);const dd=diaries.filter(dd=>dayKey(dd.ts)===k);if(dd.length){const scores=dd.map(d=>moodMap[d.mood]||0).filter(s=>s!==0);data.push({day:d.getDate(),score:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0})}else{data.push({day:d.getDate(),score:null})}}
  html+=`<canvas id="${canvasId}" width="300" height="120"></canvas></div>`
  setTimeout(()=>{
    const canvas=document.getElementById(canvasId);if(!canvas)return
    const ctx=canvas.getContext('2d'),w=canvas.parentElement.clientWidth-28;canvas.width=w;canvas.height=120
    const valid=data.filter(d=>d.score!==null)
    if(valid.length<2){ctx.fillStyle='#7a6870';ctx.font='11px "Noto Serif SC"';ctx.textAlign='center';ctx.fillText('数据还不够，多写几篇日记吧',w/2,60);return}
    const pad=20,xStep=(w-pad*2)/(data.length-1)
    const scores=data.filter(d=>d.score!==null).map(d=>d.score)
    const minS=Math.min(-2,Math.min(...scores)),maxS=Math.max(4,Math.max(...scores)),range=maxS-minS||1
    const y=v=>100-((v-minS)/range)*80
    // grid
    ctx.strokeStyle='rgba(255,240,245,.06)';ctx.lineWidth=1
    for(let i=0;i<=4;i++){const yp=pad+i*((100-pad*2)/4);ctx.beginPath();ctx.moveTo(pad,yp);ctx.lineTo(w-pad,yp);ctx.stroke()}
    // line
    ctx.beginPath();ctx.strokeStyle='#e8a0b0';ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round'
    let first=true
    data.forEach((d,i)=>{if(d.score===null)return;const x=pad+i*xStep,yv=y(d.score);if(first){ctx.moveTo(x,yv);first=false}else{ctx.lineTo(x,yv)}})
    ctx.stroke()
    // dots
    data.forEach((d,i)=>{if(d.score===null)return;const x=pad+i*xStep,yv=y(d.score);ctx.beginPath();ctx.arc(x,yv,3,0,Math.PI*2);ctx.fillStyle='#e8a0b0';ctx.fill()
    if(i%Math.ceil(data.length/7)===0){ctx.fillStyle='#7a6870';ctx.font='9px Noto Serif SC';ctx.textAlign='center';ctx.fillText(d.day,x,115)}})
  },200)
  return html
}

// ===== DASHBOARD =====
function addAnniversary(){const n=document.querySelector('#annName')?.value?.trim();const d=document.querySelector('#annDate')?.value;if(!n||!d)return;anniversaries.push({id:Date.now(),name:n,date:d});saveAnniversaries();renderDashboard()}
function deleteAnniversary(id){anniversaries=anniversaries.filter(a=>a.id!==id);saveAnniversaries();renderDashboard()}
function renderDashboard(){if(document.querySelector('#page-me.active')){renderMe();return};const c=$('dashContent');if(!c)return;let all=[];personas.forEach(p=>{if(p.chatHistory)all=all.concat(p.chatHistory)})
  const total=all.length,tk=dayKey(Date.now()),today=all.filter(m=>dayKey(m.ts)===tk).length
  let together=0;const validMsgs=all.filter(m=>m.role==='user'||m.role==='assistant');if(validMsgs.length>0)together=Math.max(1,Math.ceil((Date.now()-validMsgs[0].ts)/86400000))
  const counts={};all.forEach(m=>{const k=dayKey(m.ts);counts[k]=(counts[k]||0)+1})
  c.innerHTML=`<div class="dash-grid"><div class="dash-card highlight"><div class="dl">在一起</div><div class="dv">${together}<span class="du">天</span></div></div><div class="dash-card"><div class="dl">余额</div><div class="dv" id="dashBalanceVal" style="font-size:18px">${balanceCache||'--'}</div></div><div class="dash-card"><div class="dl">今日消息</div><div class="dv">${today}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">消息总数</div><div class="dv">${total}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">记忆</div><div class="dv">${memories.length}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">日记</div><div class="dv">${diaries.length}<span class="du">篇</span></div></div></div>${renderRemindersHTML()}${renderFavoritesHTML()}${renderMoodChart()}<div class="ann-section"><div class="ann-title">纪念日</div><div class="ann-add"><input id="annName" placeholder="名称，如：第一次见面"><input type="date" id="annDate"><button onclick="addAnniversary()">＋</button></div><div id="annList"></div></div><div class="heatmap-wrap"><div class="heatmap-header"><span>聊天热力 · 近28天</span><span style="cursor:pointer;font-size:10px" onclick="exportDashboard()">导出</span></div><div class="heatmap-grid" id="heatmapGrid"></div></div>`
  const al=document.querySelector('#annList'),now=new Date()
  const sorted=[...anniversaries].sort((a,b)=>{const dA=new Date(a.date),dB=new Date(b.date);const nA=new Date(now.getFullYear(),dA.getMonth(),dA.getDate());if(nA<now)nA.setFullYear(nA.getFullYear()+1);const nB=new Date(now.getFullYear(),dB.getMonth(),dB.getDate());if(nB<now)nB.setFullYear(nB.getFullYear()+1);return nA-nB})
  if(al)al.innerHTML=sorted.length===0?'<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px">还没有纪念日</div>':sorted.map(a=>{const d=new Date(a.date),nxt=new Date(now.getFullYear(),d.getMonth(),d.getDate());if(nxt<now)nxt.setFullYear(nxt.getFullYear()+1);const diff=Math.ceil((nxt-now)/86400000),yrs=now.getFullYear()-d.getFullYear();return`<div class="ann-item"><span class="ann-name">${escHtml(a.name)}</span><span style="font-size:9px;color:var(--text-muted)">${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} · ${yrs}年</span><span class="ann-cd">${diff===0?'今天！':diff===1?'明天':diff+'天'}</span><button class="ann-del" onclick="deleteAnniversary(${a.id})">✕</button></div>`}).join('')
  const g=document.querySelector('#heatmapGrid');if(g){let cells='';for(let i=27;i>=0;i--){const d=new Date(Date.now()-i*86400000),k=dayKey(d),ct=counts[k]||0;let l='';if(ct>0&&ct<=3)l='l1';else if(ct<=8)l='l2';else if(ct<=15)l='l3';else if(ct>15)l='l4';cells+=`<div class="heatmap-cell ${l}" title="${k}: ${ct}条">${d.getDate()}</div>`};g.innerHTML=cells}
}
function exportDashboard(){let all=[];personas.forEach(p=>{if(p.chatHistory)all=all.concat(p.chatHistory)});const lines=['沈度 v6 · 数据导出','导出时间：'+new Date().toLocaleString(),'------','消息总数：'+all.length,'记忆总数：'+memories.length,'日记总数：'+diaries.length,'API余额：'+(balanceCache||'--'),'------','纪念日：'];anniversaries.forEach(a=>{const d=new Date(a.date);lines.push('  '+a.name+': '+d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate())});lines.push('------','近28天消息：');document.querySelectorAll('#heatmapGrid .heatmap-cell').forEach(c=>lines.push(c.title));const b=new Blob([lines.join('\n')],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='沈度数据_'+dayKey(Date.now())+'.txt';a.click();URL.revokeObjectURL(u)}

// ===== MIGRATION =====
function migrateOldData(){
  const oc=localStorage.getItem('sd_chat_config_v2'),oh=localStorage.getItem('sd_chat_history_v2')
  const om=localStorage.getItem('sd_memory_v2'),od=localStorage.getItem('sd_diary_v2'),oa=localStorage.getItem('sd_anniversaries')
  // patch config defaults for new fields
  if(!config.userAvatar&&config.userAvatar!=='')config.userAvatar=''
  if(!config.userName&&config.userName!=='')config.userName=''
  if(config.deepThink===undefined)config.deepThink=false
  if(oc&&!localStorage.getItem(LS_CONFIG)){try{const c=JSON.parse(oc);config.apiKey=c.apiKey||'';config.lockPasscode='';config.wallpaper='';saveConfig()}catch(e){}}
  if(oh&&personas.length>0){try{const h=JSON.parse(oh);const s=personas.find(p=>p.id==='shendu');if(s&&(!s.chatHistory||s.chatHistory.length===0)){s.chatHistory=h.filter(m=>m.role==='user'||m.role==='assistant').map(m=>({...m,reactions:m.reactions||{}}));savePersonas()}}catch(e){}}
  if(om&&memories.length===0){try{memories=JSON.parse(om).map(m=>({...m,category:m.category||'默认',tags:m.tags||[],usageCount:m.usageCount||0,lastUsed:m.lastUsed||null,source:m.source||'manual'}));saveMemories()}catch(e){}}
  let memPatched=false;memories.forEach(m=>{if(!m.source){m.source='manual';memPatched=true}if(!m.tags){m.tags=[];memPatched=true}if(m.usageCount===undefined){m.usageCount=0;memPatched=true}if(m.lastUsed===undefined){m.lastUsed=null;memPatched=true}if(!m.characterId){m.characterId='shendu';memPatched=true}});if(memPatched)saveMemories()
  if(od&&diaries.length===0){try{diaries=JSON.parse(od).map(d=>({...d,mood:d.mood||''}));saveDiaries()}catch(e){}}
  if(oa&&anniversaries.length===0){try{anniversaries=JSON.parse(oa);saveAnniversaries()}catch(e){}}
}

// ===== CLICK OUTSIDE TO CLOSE =====
document.addEventListener('click',e=>{
  if(!ctxMenu.contains(e.target)&&!reactionPicker.contains(e.target)){hideCtxMenu()}
  if(!drawerEl.contains(e.target)&&!e.target.closest('[onclick*="openDrawer"]')){closeDrawer()}
  const pp=$('plusPanel');if(pp&&!pp.contains(e.target)&&e.target.id!=='plusBtn')pp.classList.remove('show')
})

// ===== PWA =====
let deferredPrompt=null
function registerSW(){if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}}
window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredPrompt=e})
async function installPWA(){
  if(!deferredPrompt){toast('已安装或浏览器不支持快捷安装。请用浏览器菜单中的"添加到主屏幕"');return}
  deferredPrompt.prompt()
  const result=await deferredPrompt.userChoice
  if(result.outcome==='accepted'){toast('✅ 已添加到主屏幕')}
  deferredPrompt=null
}

// ===== INIT =====
;(function init(){
  try{
  load()
  migrateOldData()
  showLockScreen()
  if(unlocked)afterUnlock()
  updateThinkToggle()
  lockInput.addEventListener('keydown',e=>{if(e.key==='Enter')unlock()})
  let tsx=0;drawerEl.addEventListener('touchstart',e=>{tsx=e.touches[0].clientX})
  drawerEl.addEventListener('touchmove',e=>{if(e.touches[0].clientX-tsx<-50)closeDrawer()})
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closePersonaModal();closeConfirm();hideCtxMenu()}})
  messagesEl.addEventListener('scroll',()=>{const sb=$('scrollBottomBtn');if(sb){sb.classList.toggle('show',messagesEl.scrollHeight-messagesEl.scrollTop-messagesEl.clientHeight>200)}})
  // Touch skin: monitor touch + motion
  const bubble=$('touchBubble');if(bubble&&config.touchSkin!==false){
    let motionLevel=0
    window.addEventListener('devicemotion',e=>{motionLevel=Math.min(1,Math.abs(e.acceleration?.x||0)/5+Math.abs(e.acceleration?.y||0)/5+Math.abs(e.acceleration?.z||0)/5)})
    document.addEventListener('touchmove',e=>{
      if(!bubble)return;const t=e.touches[0];bubble.style.display='block'
      bubble.style.left=t.clientX+'px';bubble.style.top=t.clientY+'px'
      const force=t.force||0.5,size=16+force*28+Math.random()*4
      bubble.style.width=size+'px';bubble.style.height=size+'px'
      bubble.style.opacity=Math.min(.6,.2+force*.4+motionLevel*.3)
      const hue=motionLevel>.5?280+force*40:340+force*20
      bubble.style.background=`radial-gradient(circle,hsl(${hue},60%,70%),hsl(${hue},50%,60%))`
    },{passive:true})
    document.addEventListener('touchend',()=>{if(bubble){bubble.style.opacity='0';setTimeout(()=>{bubble.style.display='none'},300)}})
  }
  registerSW()
  initToy()
  }catch(e){
    var el=document.getElementById('initLoading')
    if(el)el.innerHTML='<div style="font-size:40px">⚠️</div><div style="margin-top:12px;font-size:14px;color:#c06070">加载失败：'+e.message+'</div><div style="font-size:11px;margin-top:8px;color:var(--text-muted)">请刷新页面或清除浏览器数据后重试</div>'
    console.error('沈度 init error:',e)
  }
})()
