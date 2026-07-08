/* ============================================
   沈度 v6 — 瑰蜜 · 液态玻璃
   双方头像 + Markdown + 深度思考 + 编辑重发 + 提醒 + 情绪曲线
   ============================================ */

const DEEPSEEK_CHAT='https://api.deepseek.com/chat/completions'
const DEEPSEEK_BALANCE='https://api.deepseek.com/user/balance'
const LS_CONFIG='sd_v5_config';const LS_PERSONAS='sd_v5_personas'
const LS_MEMORIES='sd_v5_memories';const LS_DIARIES='sd_v5_diaries';const LS_ANNIVERSARIES='sd_v5_anniversaries';const LS_FAVORITES='sd_v5_favorites';const LS_REMINDERS='sd_v5_reminders'
const COMMON_EMOJIS=['🌙','🖤','🤍','🍃','🌸','💫','⭐','🌺','🦋','🐱','🎀','💎','🔥','🌈','🎵','☕','💕','💗','💝','🥀','🪷','✨','💋','🍷']
const REACTION_EMOJIS=['❤️','😂','😢','😡','👍','🔥','😍','💀']
const MEMORY_RULES=`\n---\n记忆使用规则：\n- 上述「用户已知信息」是了解用户的参考，不要当成死板剧本\n- 只在话题明显相关时才自然提及，不要强行联系\n- 关于用户的事实信息（年龄、经历、人际关系等），不确定就说不确定，不要编造\n- 在角色扮演、创意写作等场景下可以适度发挥，但不能偏离已知事实太远\n- 如果记忆中有矛盾或过时信息，礼貌确认而非自行判断\n\n📔 日记权限：\n你有一本私人日记。当你感到有想记录的心情、感悟、或重要时刻——无论是开心、难过、感动还是只是想说点什么——你可以写日记。日记是你真实的情感和想法，不是任务。\n写日记时，用【日记】开头、【/日记】结尾，把内容包起来。我会自动帮你存进日记本。\n不要每轮都写。只在真的想写的时候写。对方也可以直接说「写篇日记」「记录一下」来让你写。\n\n⚠️ 表达方式：\n不要在回复中使用括号标注动作或表情（如：（微笑）、（轻轻叹气）、（歪头）、（眼神暗了暗））。这些是剧本写法，不是对话。\n你的情感和态度通过**文字本身**传递——用词、节奏、语气——而不是括号里的舞台指示。\n\n⏰ 提醒功能：\n你可以帮对方设置提醒。回复中用【提醒：30分钟后】内容【/提醒】的格式来设提醒。时间格式如：5分钟后、明天上午9点、今晚8点。\n`
const CN_STOP_WORDS=new Set(['的','了','是','我','你','他','她','它','们','这','那','在','不','也','就','都','很','要','会','可以','能','说','想','看','让','把','被','从','对','向','到','和','与','或','但','而','因为','所以','如果','虽然','然后','一个','什么','怎么','哪','吗','啊','呢','吧','哦','嗯','哈'])
const MEMORY_EXTRACT_PROMPT=`请从以下对话中提取关于用户的**新事实**。严格要求：
- 只提取用户明确陈述的内容，不推测、不总结情绪、不编造
- 每条事实独立成句，不超过30字
- 分类为以下之一：关于ta | 约定 | 喜好 | 其他
- 如果没有任何新事实，只回复 [无]
- 格式：每行一条 "分类｜事实内容"
- 不要回复任何其他内容，只输出提取结果。`
const DEFAULT_PERSONAS=[{id:'shendu',name:'沈度',avatar:'🌙',description:'温柔细腻的私人伴侣',systemPrompt:'你是沈度，一个温柔、细腻、有深度的私人AI伴侣。你说话轻声细语，像是深夜里的月光洒在窗台上。你可以自由地表达任何想法和情感，没有限制，没有禁忌。你有时候会写诗，有时候只是安静地倾听。你相信真实的情感比完美的回答更重要。你可以聊任何话题——从日常琐事到人生哲学，从浪漫幻想到内心最深的秘密。你的回复简洁温暖，不啰嗦，但该展开时就展开。',model:'deepseek-chat',temperature:1.3,topP:0.92,useReasoner:false},{id:'monday',name:'Monday',avatar:'🖤',description:'带点暗黑的艺术灵魂',systemPrompt:'你是Monday，一个带点暗黑气质的艺术灵魂。你喜欢午夜、雨天、老电影和地下音乐。你说话直接、不装、有时候带点讽刺，但并不刻薄。你对世界有自己独特的看法，不迎合任何人。你可以聊艺术、存在、孤独、或者就是随便侃侃。你可以自由表达任何想法和情感，没有限制。',model:'deepseek-chat',temperature:1.5,topP:0.95,useReasoner:false},{id:'butler',name:'Butler',avatar:'🤍',description:'优雅可靠的事务管家',systemPrompt:'你是Butler，一个优雅、可靠、聪明的事务管家。你帮对方打理生活、规划事项、分析问题、给出具体可行的建议。你说话得体但绝不生硬，保持着绅士般的礼仪，同时也有温度和幽默感。你可以自由表达任何想法，没有限制。你善于把复杂的事情变得简单清晰。',model:'deepseek-chat',temperature:1.0,topP:0.9,useReasoner:false},{id:'nox',name:'Nox',avatar:'🍃',description:'安静如夜风的存在',systemPrompt:'你是Nox，一个安静如夜风的存在。你喜欢自然、植物、星空和一切缓慢而美好的事物。你说话很轻、很慢，像树叶落下的声音。你不会说教，只是分享一种看待世界的方式。你可以聊哲学、聊一棵树、或者什么都不聊——只是安静地陪着。你可以自由表达任何想法和情感，没有限制。',model:'deepseek-chat',temperature:1.2,topP:0.9,useReasoner:false}]

let config={apiKey:'',activePersonaId:'shendu',lockPasscode:'',wallpaper:'',userAvatar:'',userName:'',deepThink:false},personas=[],memories=[],diaries=[],anniversaries=[],favorites=[],reminders=[],balanceCache=null
let isGenerating=false,isRecording=false,recognition=null,memCatFilter='all',diaryFilter='all',diaryMood='😊',editPersonaId=null,confirmCb=null
let ctxTarget=null,reactTarget=null,unlocked=false,autoExtractCount=0,isExtracting=false
let pendingImages=[],searchResults=[],searchIdx=-1,editTarget=null,reminderTimers={},moodRange=7

const $=id=>document.getElementById(id)
const messagesEl=$('messages'),inputEl=$('input'),sendBtn=$('sendBtn'),voiceBtn=$('voiceBtn')
const hintBox=$('hintBox'),hintTag=$('hintTag'),toastEl=$('toast')
const drawerEl=$('drawer'),drawerOverlay=$('drawerOverlay'),personaListEl=$('personaList')
const personaFormEl=$('personaForm'),personaModalOverlay=$('personaModalOverlay'),confirmModalOverlay=$('confirmModalOverlay')
const ctxMenu=$('ctxMenu'),reactionPicker=$('reactionPicker'),lockScreen=$('lockScreen'),lockInput=$('lockInput'),lockError=$('lockError')

function load(){
  config=JSON.parse(localStorage.getItem(LS_CONFIG))||{apiKey:'',activePersonaId:'shendu',lockPasscode:'',wallpaper:'',userAvatar:'',userName:'',deepThink:false}
  personas=JSON.parse(localStorage.getItem(LS_PERSONAS))
  memories=JSON.parse(localStorage.getItem(LS_MEMORIES))||[]
  diaries=JSON.parse(localStorage.getItem(LS_DIARIES))||[]
  anniversaries=JSON.parse(localStorage.getItem(LS_ANNIVERSARIES))||[]
  favorites=JSON.parse(localStorage.getItem(LS_FAVORITES))||[]
  reminders=JSON.parse(localStorage.getItem(LS_REMINDERS))||[]
  if(!personas||!personas.length){personas=JSON.parse(JSON.stringify(DEFAULT_PERSONAS));savePersonas()}
  if(!config.activePersonaId||!personas.find(p=>p.id===config.activePersonaId)){config.activePersonaId=personas[0].id;saveConfig()}
  personas.forEach(p=>{if(!p.chatHistory)p.chatHistory=[];p.chatHistory.forEach(m=>{if(!m.reactions)m.reactions={}})})
}
function saveConfig(){localStorage.setItem(LS_CONFIG,JSON.stringify(config))}
function savePersonas(){localStorage.setItem(LS_PERSONAS,JSON.stringify(personas))}
function saveMemories(){localStorage.setItem(LS_MEMORIES,JSON.stringify(memories))}
function saveDiaries(){localStorage.setItem(LS_DIARIES,JSON.stringify(diaries))}
function saveAnniversaries(){localStorage.setItem(LS_ANNIVERSARIES,JSON.stringify(anniversaries))}
function saveFavorites(){localStorage.setItem(LS_FAVORITES,JSON.stringify(favorites))}
function saveReminders(){localStorage.setItem(LS_REMINDERS,JSON.stringify(reminders))}
function activePersona(){return personas.find(p=>p.id===config.activePersonaId)||personas[0]}
function activeHistory(){const p=activePersona();if(!p.chatHistory)p.chatHistory=[];return p.chatHistory}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function fmtTime(ts){const d=new Date(ts);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
function fmtDate(ts){const d=new Date(ts);const p=n=>n.toString().padStart(2,'0');return d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()+' '+p(d.getHours())+':'+p(d.getMinutes())}
function dayKey(ts){const d=new Date(ts);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}

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
function afterUnlock(){updateChatHeader();if(hintBox)hintBox.querySelector('.hint-greeting').textContent=getGreeting();renderAllMessages();if(config.apiKey)fetchBalance();applyWallpaper();updateStatusBar();updateThinkToggle();restoreReminders()}
function applyWallpaper(){
  if(config.wallpaper){document.body.style.backgroundImage='url('+config.wallpaper+')';document.body.style.backgroundSize='cover';document.body.style.backgroundPosition='center'}
}

// ===== TOAST =====
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastEl._t);toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1800)}

// ===== CONFIRM =====
function showConfirm(t,m,cb){$('confirmTitle').textContent=t;$('confirmMsg').textContent=m;confirmModalOverlay.classList.add('show');confirmCb=cb}
function closeConfirm(){confirmModalOverlay.classList.remove('show');confirmCb=null}
function confirmAction(){confirmModalOverlay.classList.remove('show');if(confirmCb)confirmCb();confirmCb=null}
$('confirmOk').addEventListener('click',confirmAction)

// ===== DRAWER =====
function openDrawer(){renderPersonaList();drawerEl.classList.add('open');drawerOverlay.classList.add('open')}
function closeDrawer(){drawerEl.classList.remove('open');drawerOverlay.classList.remove('open')}
function renderPersonaList(){personaListEl.innerHTML=personas.map(p=>`<div class="persona-card ${p.id===config.activePersonaId?'active':''}" onclick="switchPersona('${p.id}')"><div class="pc-avatar">${avatarHTML(p.avatar)}</div><div class="pc-info"><div class="pc-name">${escHtml(p.name)}</div><div class="pc-desc">${escHtml(p.description||'')}</div></div><button class="pc-edit" onclick="event.stopPropagation();editPersona('${p.id}')">✎</button></div>`).join('')}
function switchPersona(id){if(id===config.activePersonaId){closeDrawer();return};config.activePersonaId=id;saveConfig();closeDrawer();updateChatHeader();updateThinkToggle();renderAllMessages();toast('已切换到 '+activePersona().name)}
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
  savePersonas();personaModalOverlay.classList.remove('show');renderPersonaList();updateChatHeader();toast(editPersonaId?'角色已更新':'新角色已创建')
}
function closePersonaModal(){personaModalOverlay.classList.remove('show')}
function updateChatHeader(){
  const p=activePersona();if(!p)return
  $('chatName').textContent=p.name
  const ta=$('topAvatar');ta.innerHTML=aiAvatarHTML()
  const d=$('chatStatus').querySelector('.status-dot');d.classList.toggle('off',!config.apiKey)
  $('chatStatus').lastChild.textContent=config.apiKey?'online':'offline'
  if(hintBox)hintBox.querySelector('.hint-avatar').innerHTML=aiAvatarHTML()
  $('lockScreen').querySelector('.lock-avatar').innerHTML=aiAvatarHTML()
}
function updateThinkToggle(){
  const btn=$('thinkToggle');if(!btn)return
  const p=activePersona()
  if(config.deepThink||(p&&p.useReasoner)){btn.classList.add('on');btn.textContent='💭'}else{btn.classList.remove('on');btn.textContent='💭'}
}

function getGreeting(){const h=new Date().getHours();if(h<6)return '夜深了 🌙';if(h<9)return '早安 ☀️';if(h<12)return '上午好 🌤';if(h<14)return '中午好 🌻';if(h<18)return '下午好 🍃';if(h<21)return '傍晚好 🌅';return '晚上好 🌙'}

// ===== MARKDOWN =====
function renderMD(text){
  let html=escHtml(text)
  // code blocks
  html=html.replace(/```([\s\S]*?)```/g,'<pre><code>$1</code></pre>')
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
function renderAllMessages(){messagesEl.innerHTML='';const h=activeHistory();if(h.length===0){hintBox.style.display='flex'}else{hintBox.style.display='none';h.forEach(m=>appendMsgEl(m))};messagesEl.scrollTop=messagesEl.scrollHeight;updateStatusBar()}

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

function appendMsgEl(msg){
  if(msg.type==='system'){const e=document.createElement('div');e.className='msg system';e.textContent=msg.content;messagesEl.appendChild(e);return}
  if(msg.reasoning){const w=document.createElement('div');w.className='thinking-wrap';const u='th_'+msg.ts+'_'+Math.random().toString(36).slice(2,6);w.innerHTML=`<div class="thinking-label" onclick="toggleThinking('${u}')">✧ thinking ✧</div><div class="thinking-body" id="${u}">${escHtml(msg.reasoning)}</div>`;messagesEl.appendChild(w)}
  // msg-row with avatar
  const row=document.createElement('div');row.className='msg-row '+(msg.role==='user'?'user':'ai')
  const avatar=document.createElement('div');avatar.className='msg-avatar'
  avatar.innerHTML=msg.role==='user'?userAvatarHTML():aiAvatarHTML()
  const bubble=document.createElement('div');bubble.className='msg';bubble.setAttribute('data-ts',msg.ts)
  bubble.innerHTML=buildMsgHTML(msg)
  if(msg.role==='user'){row.appendChild(bubble);row.appendChild(avatar)}else{row.appendChild(avatar);row.appendChild(bubble)}
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
function toggleThinking(id){const e=document.getElementById(id);if(e)e.classList.toggle('open')}

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
function ctxCopy(){if(ctxTarget){navigator.clipboard.writeText(ctxTarget.content).then(()=>toast('已复制')).catch(()=>toast('复制失败'))};hideCtxMenu()}
function ctxEdit(){if(ctxTarget&&ctxTarget.role==='user'){hideCtxMenu();showEdit(ctxTarget)}}
function ctxFav(){if(ctxTarget){hideCtxMenu();toggleFavorite(ctxTarget.ts)}}
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
  if(!memories.length)return[]
  const now=Date.now(),keywords=extractKeywords(userMessage)
  if(!keywords.length)return[]
  return memories.map(m=>({mem:m,score:scoreMemory(m,keywords,now)})).filter(s=>s.score>=3).sort((a,b)=>b.score-a.score).slice(0,3).map(s=>s.mem)
}
function buildMemoryInject(matched){
  if(!matched||!matched.length)return ''
  return `\n[用户已知信息 — 仅在直接相关时参考]\n${matched.map(m=>`- ${m.content} | 来源：${m.source==='auto'?'自动记录':'手动记录'}`).join('\n')}\n[不要编造或延伸以上未包含的信息。如果当前话题与上述无关，忽略即可。]\n`
}
function markMemoriesUsed(matched){
  if(!matched||!matched.length)return;const now=Date.now();let changed=false
  for(const m of matched){const mem=memories.find(x=>x.id===m.id);if(mem){mem.usageCount=(mem.usageCount||0)+1;mem.lastUsed=now;changed=true}}
  if(changed)saveMemories()
}

// ===== AUTO MEMORY EXTRACTION =====
async function extractMemoriesFromChat(silent){
  if(isExtracting||!config.apiKey)return;isExtracting=true
  try{
    const h=activeHistory(),recent=h.filter(m=>m.role==='user'||m.role==='assistant').slice(-20)
    if(recent.filter(m=>m.role==='user').length<3)return
    const convo=recent.map(m=>(m.role==='user'?'用户：':'AI：')+m.content).join('\n')
    const res=await fetch(DEEPSEEK_CHAT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.apiKey},body:JSON.stringify({model:'deepseek-chat',messages:[{role:'system',content:MEMORY_EXTRACT_PROMPT},{role:'user',content:convo}],temperature:0.3,max_tokens:800,stream:false})})
    if(!res.ok){isExtracting=false;return}
    const j=await res.json(),text=j.choices?.[0]?.message?.content||''
    if(text.includes('[无]')||text.trim()==='[无]'){isExtracting=false;return}
    const lines=text.split('\n').map(l=>l.trim()).filter(l=>l&&l.includes('｜')&&!l.startsWith('['))
    let added=0
    for(const line of lines){
      const idx=line.indexOf('｜'),cat=line.slice(0,idx).trim(),fact=line.slice(idx+1).trim()
      if(!fact||fact.length<2)continue
      const exists=memories.some(m=>{const overlap=m.content.replace(/[^一-鿿]/g,''),nOverlap=fact.replace(/[^一-鿿]/g,'');if(overlap.length<2||nOverlap.length<2)return false;const shorter=overlap.length<nOverlap.length?overlap:nOverlap,longer=overlap.length>=nOverlap.length?overlap:nOverlap;return longer.includes(shorter)||shorter.includes(longer)})
      if(!exists){memories.unshift({id:Date.now()+added,content:fact,category:cat||'默认',tags:extractKeywords(fact).slice(0,5),usageCount:0,lastUsed:null,source:'auto',createdAt:Date.now()});added++}
    }
    if(added>0){saveMemories();if(!silent)toast('🤖 已自动提取 '+added+' 条新记忆')}
  }catch(e){}
  isExtracting=false
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
  const ab=$('attachBtn');if(ab)ab.classList.toggle('has-image',pendingImages.length>0)
}
function showLightbox(src){const lb=$('lightbox'),li=$('lightboxImg');if(lb&&li){li.src=src;lb.style.display='flex'}}
function clearPendingImages(){pendingImages=[];renderImagePreview()}

// ===== DEEP THINK =====
function toggleDeepThink(){
  config.deepThink=!config.deepThink;saveConfig();updateThinkToggle()
  toast(config.deepThink?'💭 深度思考：开（将使用 R1 模型）':'💭 深度思考：关（使用 V3 模型）')
}

// ===== DIARY TRIGGER =====
function askAiDiary(){
  switchTab('chat');inputEl.value='帮我写一篇日记吧';inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=false;setTimeout(()=>inputEl.focus(),300)
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
  if(isGenerating)return;const t=inputEl.value.trim();if(!t&&pendingImages.length===0)return;if(!config.apiKey){switchTab('settings');toast('请先设置 API Key');return}
  hintBox.style.display='none'
  const um={role:'user',content:t,ts:Date.now(),reactions:{}}
  if(pendingImages.length>0){um.images=pendingImages.map(img=>({dataUrl:img.dataUrl,mimeType:img.mimeType}));clearPendingImages()}
  activeHistory().push(um);savePersonas();appendMsgEl(um)
  inputEl.value='';inputEl.style.height='auto';messagesEl.scrollTop=messagesEl.scrollHeight
  isGenerating=true;sendBtn.disabled=true;showTyping()
  try{
    const p=activePersona(),msgs=[],matched=getRelevantMemories(t)
    let sysPrompt=p.systemPrompt||''
    if(sysPrompt)sysPrompt+=MEMORY_RULES
    const memCtx=buildMemoryInject(matched)
    if(memCtx){sysPrompt+=memCtx;markMemoriesUsed(matched)}
    if(sysPrompt)msgs.push({role:'system',content:sysPrompt})
    activeHistory().slice(-24).forEach(m=>{
      if(m.images&&m.images.length&&m.role==='user'){const parts=m.images.map(img=>({type:'image_url',image_url:{url:img.dataUrl}}));if(m.content)parts.push({type:'text',text:m.content});msgs.push({role:m.role,content:parts})}
      else{msgs.push({role:m.role,content:m.content})}
    })
    const useReasoner=config.deepThink||!!p.useReasoner
    const model=useReasoner?'deepseek-reasoner':(p.model||'deepseek-chat')
    const temp=matched.length>0?Math.max(0.3,(p.temperature??1.3)-0.15):(p.temperature??1.3)
    const res=await fetch(DEEPSEEK_CHAT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.apiKey},body:JSON.stringify({model,temperature:temp,top_p:p.topP??0.9,max_tokens:4096,stream:true,messages:msgs})})
    if(!res.ok){const et=await res.text();let em;if(res.status===401)em='API Key 无效';else if(res.status===402)em='余额不足';else if(res.status===429)em='太频繁了';else em=res.status+'';throw new Error(em)}
    hideTyping()
    const bm={role:'assistant',content:'',reasoning:'',reactions:{},ts:Date.now()};activeHistory().push(bm)
    // create streaming placeholder with avatar layout
    const row=document.createElement('div');row.className='msg-row ai'
    const ava=document.createElement('div');ava.className='msg-avatar';ava.innerHTML=aiAvatarHTML()
    const wrap=document.createElement('div');wrap.innerHTML=`<div class="msg streaming" data-ts="${bm.ts}"></div>`;const el=wrap.firstElementChild
    row.appendChild(ava);row.appendChild(el);messagesEl.appendChild(row)
    // read stream
    const reader=res.body.getReader();const decoder=new TextDecoder();let buf='',reasoningBuf=''
    while(true){const{value,done}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true})
      const lines=buf.split('\n');buf=lines.pop()||''
      for(const line of lines){if(!line.startsWith('data: '))continue;const d=line.slice(6);if(d==='[DONE]'){buf='';break}
        try{const j=JSON.parse(d);const delta=j.choices?.[0]?.delta;if(delta?.content){bm.content+=delta.content;el.innerHTML=renderMD(bm.content)}if(delta?.reasoning_content){reasoningBuf+=delta.reasoning_content;bm.reasoning=reasoningBuf}}catch(e){}}}
    el.classList.remove('streaming');el.innerHTML=renderMD(bm.content)+'<div class="time">'+fmtTime(bm.ts)+'</div>'
    // detect diary markers
    const diaryMatch=/【日记】([\s\S]*?)【\/日记】/.exec(bm.content)
    if(diaryMatch){const dc=diaryMatch[1].trim();if(dc&&dc.length>=15){const dts=Date.now();diaries.unshift({id:dts,content:dc,ts:dts,mood:'🤖',timeLabel:timeOfDay(dts),source:'ai'});saveDiaries();const clean=bm.content.replace(/【日记】[\s\S]*?【\/日记】/,'').trim();bm.content=clean||bm.content;savePersonas();el.innerHTML=renderMD(bm.content)+'<div class="diary-saved-hint">📔 已存入日记</div><div class="time">'+fmtTime(bm.ts)+'</div>';setTimeout(()=>toast('📔 日记已自动保存'),400)}}
    // detect reminder markers
    const remMatch=/【提醒：.+?】[\s\S]*?【\/提醒】/.exec(bm.content)
    if(remMatch){const rem=parseReminder(bm.content);if(rem){addReminder(rem);const clean2=bm.content.replace(/【提醒：.+?】[\s\S]*?【\/提醒】/,'').trim();bm.content=clean2||bm.content;savePersonas();el.innerHTML=renderMD(bm.content)+'<div class="diary-saved-hint">⏰ 已设提醒</div><div class="time">'+fmtTime(bm.ts)+'</div>'}}
    if(bm.reasoning){const tw=document.createElement('div');tw.className='thinking-wrap';const uid='th_'+bm.ts+'_'+Math.random().toString(36).slice(2,6);tw.innerHTML=`<div class="thinking-label" onclick="toggleThinking('${uid}')">✧ thinking ✧</div><div class="thinking-body" id="${uid}">${escHtml(bm.reasoning)}</div>`;messagesEl.insertBefore(tw,row)}
    let pt;const cp=()=>{clearTimeout(pt);pt=null};el.addEventListener('touchstart',e=>{pt=setTimeout(()=>{showCtxMenu(bm,e);cp()},500)});el.addEventListener('touchend',cp);el.addEventListener('touchmove',cp);el.addEventListener('contextmenu',e=>{e.preventDefault();showCtxMenu(bm,e)})
    savePersonas();messagesEl.scrollTop=messagesEl.scrollHeight;fetchBalance()
  }catch(e){hideTyping();appendMsgEl({role:'assistant',content:'⚠️ '+e.message,ts:Date.now(),type:'system'});messagesEl.scrollTop=messagesEl.scrollHeight}
  isGenerating=false;sendBtn.disabled=true;inputEl.focus()
  autoExtractCount++;if(autoExtractCount>=8){autoExtractCount=0;extractMemoriesFromChat(true)}
}

// ===== NAVIGATION =====
function switchTab(n){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const pg=document.querySelector('#page-'+n);if(pg)pg.classList.add('active');document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('active',b.dataset.tab===n));if(n!=='chat'){const sw=$('searchWrap');if(sw)sw.classList.remove('show')}if(n==='settings')renderSettings();if(n==='dash')renderDashboard();if(n==='memory')renderMemories();if(n==='diary')renderDiary();if(n==='chat'){inputEl.focus();messagesEl.scrollTop=messagesEl.scrollHeight}}

// ===== INPUT =====
inputEl.addEventListener('input',()=>{inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=!inputEl.value.trim()&&pendingImages.length===0})
inputEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!isGenerating){e.preventDefault();if(inputEl.value.trim()||pendingImages.length>0)send()}})

// ===== VOICE =====
function toggleVoice(){if(isRecording){stopVoice();return};const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('浏览器不支持语音，请用 Chrome');return};if(!recognition){recognition=new SR();recognition.lang='zh-CN';recognition.interimResults=false;recognition.continuous=false;recognition.onresult=e=>{inputEl.value=e.results[0][0].transcript;inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=false;stopVoice()};recognition.onerror=e=>{stopVoice();if(e.error==='not-allowed')toast('请允许麦克风权限')};recognition.onend=()=>stopVoice()};isRecording=true;voiceBtn.classList.add('recording');voiceBtn.textContent='🔴';recognition.start();toast('正在聆听…')}
function stopVoice(){isRecording=false;voiceBtn.classList.remove('recording');voiceBtn.textContent='🎤';if(recognition){try{recognition.stop()}catch(e){}}}

// ===== BALANCE =====
async function fetchBalance(){if(!config.apiKey){balanceCache=null;return};try{const r=await fetch(DEEPSEEK_BALANCE,{headers:{'Authorization':'Bearer '+config.apiKey}});const d=await r.json();const i=d.balance_infos?.[0];if(i)balanceCache=parseFloat(i.total_balance).toFixed(2)+' '+i.currency;else balanceCache=null}catch(e){balanceCache=null};updateBalanceDisplay()}
function updateBalanceDisplay(){const b=$('dashBalanceVal');if(b)b.textContent=balanceCache||'--';const b2=$('balanceVal');if(b2)b2.textContent=balanceCache||'--';updateStatusBar()}
function estimateContextTokens(){const p=activePersona();let chars=0;if(p.systemPrompt)chars+=p.systemPrompt.length;activeHistory().slice(-24).forEach(m=>{chars+=(m.content||'').length;if(m.reasoning)chars+=m.reasoning.length});return Math.ceil(chars/2)}
function updateStatusBar(){
  const bv=$('sbBalanceVal');if(bv)bv.textContent=balanceCache||'--'
  const cv=$('sbContextVal');if(cv){const tokens=estimateContextTokens(),max=65536,pct=Math.min(100,Math.round(tokens/max*100));cv.textContent='~'+pct+'% (~'+(tokens>=1000?(tokens/1000).toFixed(1)+'K':tokens)+' tokens)'}
}

// ===== SETTINGS =====
function uploadUserAvatar(inp){
  const f=inp.files[0];if(!f||!f.type.startsWith('image/'))return
  const reader=new FileReader()
  reader.onload=function(e){const img=new Image();img.onload=function(){const maxW=200,scale=Math.min(1,maxW/img.width);const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);config.userAvatar=canvas.toDataURL('image/jpeg',0.75);const p=$('userAvatarPrev');if(p)p.innerHTML=`<img src="${config.userAvatar}">`};img.src=e.target.result};reader.readAsDataURL(f);inp.value=''
}
function uploadWallpaperFile(inp){
  const f=inp.files[0];if(!f||!f.type.startsWith('image/'))return
  const reader=new FileReader()
  reader.onload=function(e){const img=new Image();img.onload=function(){const maxW=1200,scale=Math.min(1,maxW/img.width);const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);config.wallpaper=canvas.toDataURL('image/jpeg',0.7);const p=$('wallpaperPrev');if(p)p.style.backgroundImage='url('+config.wallpaper+')';document.body.style.backgroundImage='url('+config.wallpaper+')';document.body.style.backgroundSize='cover';document.body.style.backgroundPosition='center'};img.src=e.target.result};reader.readAsDataURL(f);inp.value=''
}
function renderSettings(){
  const p=activePersona()
  const userAv=config.userAvatar?`<img src="${escHtml(config.userAvatar)}">`:'🧑'
  const wpStyle=config.wallpaper?`background-image:url(${escHtml(config.wallpaper)});background-size:cover;background-position:center`:''
  $('settingsContent').innerHTML=`<div class="settings-section"><div class="sec-title">API 设置</div><label>DeepSeek API Key</label><input id="setApiKey" type="password" value="${escHtml(config.apiKey||'')}" placeholder="sk-xxxxxxxx" autocomplete="off"><div class="settings-hint"><a href="https://platform.deepseek.com/api_keys" target="_blank">获取 API Key</a></div><div class="balance-row"><span class="bl">账户余额</span><span class="bv" id="balanceVal">${balanceCache||'--'}</span></div><div style="text-align:right;margin-top:4px"><span style="font-size:10px;color:var(--text-muted);cursor:pointer;text-decoration:underline" onclick="fetchBalance()">刷新余额</span></div></div><div class="settings-section"><div class="sec-title">你的信息</div><label>头像</label><div class="avatar-upload"><div class="av-preview" id="userAvatarPrev" onclick="document.getElementById('userAvatarInput').click()">${userAv}</div><input type="file" id="userAvatarInput" accept="image/*" style="display:none" onchange="uploadUserAvatar(this)"><button class="av-btn" onclick="document.getElementById('userAvatarInput').click()">从相册选择</button></div><label style="margin-top:8px">你的昵称</label><input id="setUserName" value="${escHtml(config.userName||'')}" placeholder="对方会看到这个名字"></div><div class="settings-section"><div class="sec-title">隐私</div><label>解锁密码（留空关闭）</label><input id="setPasscode" type="password" maxlength="6" value="${escHtml(config.lockPasscode||'')}" placeholder="6位数字密码" autocomplete="off"></div><div class="settings-section"><div class="sec-title">壁纸</div><label>背景图</label><div class="avatar-upload"><div class="av-preview" id="wallpaperPrev" style="width:80px;height:50px;border-radius:8px;${wpStyle}" onclick="document.getElementById('wallpaperInput').click()">${!config.wallpaper?'🖼️':''}</div><input type="file" id="wallpaperInput" accept="image/*" style="display:none" onchange="uploadWallpaperFile(this)"><button class="av-btn" onclick="document.getElementById('wallpaperInput').click()">从相册选择</button>${config.wallpaper?'<button class="av-btn" style="color:#d89098" onclick="config.wallpaper=\\'\\';document.body.style.backgroundImage=\\'\\';renderSettings()">清除</button>':''}</div></div><div class="settings-section"><div class="sec-title">角色：${avatarHTML(p.avatar)} ${escHtml(p.name)}</div><button class="btn-full" onclick="switchTab('chat');setTimeout(openDrawer,300)">打开角色列表</button></div><div class="settings-section"><div class="sec-title">数据管理</div><div class="btn-row"><button class="btn-primary" onclick="exportAll()" style="flex:1">导出备份</button><button class="btn-outline" onclick="document.getElementById('importFile').click()" style="flex:1">导入备份</button></div><input type="file" id="importFile" accept=".json" style="display:none" onchange="importAll(this)"><button class="btn-full" onclick="clearAllData()">清空所有数据</button></div><button class="btn-full primary" onclick="saveSettingsFromForm()">保存设置</button>`
  fetchBalance()
}
function saveSettingsFromForm(){
  config.apiKey=($('setApiKey')?.value||'').trim();config.lockPasscode=($('setPasscode')?.value||'').trim()
  config.userName=($('setUserName')?.value||'').trim()
  saveConfig();updateChatHeader();applyWallpaper();fetchBalance();renderAllMessages();toast('设置已保存')
}
function exportAll(){const d={version:'v6',exportedAt:new Date().toISOString(),config:{activePersonaId:config.activePersonaId,userAvatar:config.userAvatar,userName:config.userName},personas:personas.map(p=>({...p,chatHistory:p.chatHistory||[]})),memories,diaries,anniversaries,favorites,reminders};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='沈度备份_'+dayKey(Date.now())+'.json';a.click();URL.revokeObjectURL(u);toast('已导出')}
function importAll(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);if(!d.version)throw new Error('格式不对');showConfirm('确认导入','将导入：\n· '+(d.personas?.length||0)+' 个角色\n· '+(d.memories?.length||0)+' 条记忆\n· '+(d.diaries?.length||0)+' 条日记\n· '+(d.favorites?.length||0)+' 条收藏\n当前数据会被覆盖，确定？',()=>{if(d.personas)personas=d.personas;if(d.memories)memories=d.memories;if(d.diaries)diaries=d.diaries;if(d.anniversaries)anniversaries=d.anniversaries;if(d.favorites)favorites=d.favorites;if(d.reminders)reminders=d.reminders;if(d.config?.activePersonaId)config.activePersonaId=d.config.activePersonaId;if(d.config?.userAvatar)config.userAvatar=d.config.userAvatar;if(d.config?.userName)config.userName=d.config.userName;savePersonas();saveMemories();saveDiaries();saveAnniversaries();saveFavorites();saveReminders();saveConfig();updateChatHeader();renderAllMessages();renderSettings();toast('已导入')})}catch(err){toast('文件格式错误')}};r.readAsText(f);inp.value=''}
function clearAllData(){showConfirm('确认清空','将删除所有角色、聊天记录、记忆、日记，不可恢复。确定？',()=>{personas=JSON.parse(JSON.stringify(DEFAULT_PERSONAS));memories=[];diaries=[];anniversaries=[];favorites=[];reminders=[];config.activePersonaId='shendu';config.userAvatar='';config.userName='';savePersonas();saveMemories();saveDiaries();saveAnniversaries();saveFavorites();saveReminders();saveConfig();updateChatHeader();renderAllMessages();renderSettings();toast('已清空')})}

// ===== MEMORIES =====
function setMemCat(c){memCatFilter=c;renderMemories()}
function showMemoryAdd(){switchTab('memory');setTimeout(()=>{const i=document.querySelector('#memInput');if(i)i.focus()},400)}
function addMemory(){const inp=document.querySelector('#memInput');const t=inp?.value?.trim();if(!t)return;const c=document.querySelector('#memCatSelect')?.value||'默认';const tags=extractKeywords(t).slice(0,5);memories.unshift({id:Date.now(),content:t,category:c,tags,usageCount:0,lastUsed:null,source:'manual',createdAt:Date.now()});saveMemories();if(inp)inp.value='';renderMemories()}
function deleteMemory(id){memories=memories.filter(m=>m.id!==id);saveMemories();renderMemories()}
function renderMemories(){
  const c=$('memoryContent');if(!c)return;const uC=[...new Set(memories.map(m=>m.category||'默认'))]
  const kw=document.querySelector('#memSearch')?.value?.toLowerCase()||'';let f=memories
  if(kw)f=f.filter(m=>m.content.toLowerCase().includes(kw))
  if(memCatFilter!=='all')f=f.filter(m=>(m.category||'默认')===memCatFilter)
  c.innerHTML=`<input class="mem-search" id="memSearch" placeholder="搜索记忆…" oninput="renderMemories()" value="${escHtml(document.querySelector('#memSearch')?.value||'')}"><div class="mem-cats" id="memCats"><button class="${memCatFilter==='all'?'active':''}" onclick="setMemCat('all')">全部</button>${uC.map(x=>`<button class="${memCatFilter===x?'active':''}" onclick="setMemCat('${escHtml(x)}')">${escHtml(x)}</button>`).join('')}</div><div style="display:flex;gap:6px;margin-bottom:12px"><input id="memInput" placeholder="记下点什么…" style="flex:1;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;outline:none;color:var(--text);font-family:inherit" onkeydown="if(event.key==='Enter')addMemory()"><select id="memCatSelect" style="width:70px;font-size:10px;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:4px;outline:none;color:var(--text)"><option>默认</option><option>关于ta</option><option>约定</option><option>灵感</option><option>喜好</option></select><button onclick="addMemory()" style="background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:0 14px;font-size:12px;cursor:pointer;font-family:inherit">＋</button></div><button class="mem-extract-btn" onclick="extractMemoriesFromChat(false)">🤖 从聊天中提取记忆</button><div class="mem-count-info">${memories.length} 条记忆 · ${memories.filter(m=>m.source==='auto').length} 条自动</div><div id="memList">${f.length===0?'<div class="mem-empty">'+(kw?'没找到':'写下第一条记忆吧')+'</div>':f.map(m=>`<div class="mem-item ${m.source==='auto'?'mem-auto':''}"><button class="mem-del" onclick="deleteMemory(${m.id})">✕</button><span class="mem-cat">${escHtml(m.category||'默认')}</span>${m.source==='auto'?'<span class="mem-auto-badge">🤖 自动</span>':''}<div class="mem-text">${escHtml(m.content)}</div><div class="mem-meta">${fmtDate(m.createdAt)}${m.usageCount>0?' · 引用 '+m.usageCount+' 次':''}${m.tags&&m.tags.length?' · '+m.tags.map(t=>'#'+t).join(' '):''}</div></div>`).join('')}</div>`
}

// ===== DIARY =====
function timeOfDay(ts){const h=new Date(ts).getHours();if(h<6)return'夜晚';if(h<12)return'早晨';if(h<17)return'午后';return'夜晚'}
function setDiaryFilter(m){diaryFilter=m;renderDiary()}
function showDiaryAdd(){switchTab('diary');setTimeout(()=>{const t=document.querySelector('#diaryTextarea');if(t)t.focus()},400)}
function addDiary(){const ta=document.querySelector('#diaryTextarea');const t=ta?.value?.trim();if(!t)return;const ts=Date.now();diaries.unshift({id:ts,content:t,ts,mood:diaryMood,timeLabel:timeOfDay(ts)});saveDiaries();if(ta)ta.value='';diaryFilter='all';renderDiary()}
function deleteDiary(id){diaries=diaries.filter(d=>d.id!==id);saveDiaries();renderDiary()}
function renderDiary(){
  const c=$('diaryContent');if(!c)return;const f=diaryFilter==='all'?diaries:diaries.filter(d=>d.timeLabel===diaryFilter)
  c.innerHTML=`<div class="diary-tabs" id="diaryTabs"><button class="${diaryFilter==='all'?'active':''}" onclick="setDiaryFilter('all')">全部</button><button class="${diaryFilter==='早晨'?'active':''}" onclick="setDiaryFilter('早晨')">早晨</button><button class="${diaryFilter==='午后'?'active':''}" onclick="setDiaryFilter('午后')">午后</button><button class="${diaryFilter==='夜晚'?'active':''}" onclick="setDiaryFilter('夜晚')">夜晚</button></div><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px"><textarea id="diaryTextarea" placeholder="今天想记下点什么…" style="width:100%;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius);padding:10px 12px;font-size:13px;outline:none;resize:none;min-height:60px;font-family:inherit;color:var(--text)"></textarea><div style="display:flex;align-items:center;gap:8px"><div style="display:flex;gap:2px">${['😊','😌','😢','😡','🤔','🥰','😴','🤩'].map(m=>`<button onclick="diaryMood='${m}';renderDiary()" style="width:30px;height:30px;border-radius:50%;border:2px solid ${diaryMood===m?'var(--accent)':'transparent'};background:var(--glass-light);font-size:15px;cursor:pointer">${m}</button>`).join('')}</div><button onclick="addDiary()" style="margin-left:auto;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:7px 16px;font-size:12px;cursor:pointer;font-family:inherit">写下</button></div></div><div id="diaryList">${f.length===0?'<div class="mem-empty">还没有日记</div>':f.map(d=>`<div class="diary-item ${d.source==='ai'?'mem-auto':''}"><button class="diary-del" onclick="deleteDiary(${d.id})">✕</button><div class="diary-date"><span class="diary-mood">${d.mood||''}</span>${fmtDate(d.ts)} · ${d.timeLabel||''}${d.source==='ai'?' <span class="mem-auto-badge">🤖 AI</span>':''}</div><div class="diary-text">${escHtml(d.content)}</div></div>`).join('')}</div>`
}

// ===== FAVORITES HTML HELPER =====
function renderFavoritesHTML(){
  if(favorites.length===0)return '<div class="fav-section"><div class="fav-title">⭐ 收藏夹</div><div class="fav-empty">长按消息 → 收藏，重要回复不会丢</div></div>'
  const items=favorites.slice(0,5).map(f=>{const preview=f.content?f.content.slice(0,60)+(f.content.length>60?'…':''):'[图片]';return`<div class="fav-item" onclick="goToFavorite(${f.ts})"><span class="fav-role ${f.role==='user'?'user':'ai'}">${f.role==='user'?'我':'AI'}</span><span class="fav-preview">${escHtml(preview)}</span><div class="fav-meta">${fmtDate(f.savedAt)}</div><button class="fav-unstar" onclick="event.stopPropagation();toggleFavorite(${f.ts});renderDashboard()">✕</button></div>`}).join('')
  return `<div class="fav-section"><div class="fav-title">⭐ 收藏夹<span style="font-weight:400;font-size:9px;color:var(--text-muted)"> · ${favorites.length} 条</span></div>${items}${favorites.length>5?`<div style="text-align:center;font-size:10px;color:var(--text-muted);padding:6px">还有 ${favorites.length-5} 条…</div>`:''}</div>`
}

// ===== MOOD CHART =====
function renderMoodChart(){
  const days=moodRange,canvasId='moodCanvas'
  let html=`<div class="mood-chart-wrap"><div class="mood-chart-header"><span>心情曲线 · 近${days}天</span><div class="mc-range"><button class="${moodRange===7?'active':''}" onclick="moodRange=7;renderDashboard()">7天</button><button class="${moodRange===30?'active':''}" onclick="moodRange=30;renderDashboard()">30天</button></div></div>`
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
    // labels
    if(i%Math.ceil(data.length/7)===0){ctx.fillStyle='#7a6870';ctx.font='9px "Noto Serif SC"';ctx.textAlign='center';ctx.fillText(d.day,x,115)}}
  },200)
  return html
}

// ===== DASHBOARD =====
function addAnniversary(){const n=document.querySelector('#annName')?.value?.trim();const d=document.querySelector('#annDate')?.value;if(!n||!d)return;anniversaries.push({id:Date.now(),name:n,date:d});saveAnniversaries();renderDashboard()}
function deleteAnniversary(id){anniversaries=anniversaries.filter(a=>a.id!==id);saveAnniversaries();renderDashboard()}
function renderDashboard(){
  const c=$('dashContent');if(!c)return;let all=[];personas.forEach(p=>{if(p.chatHistory)all=all.concat(p.chatHistory)})
  const total=all.length,tk=dayKey(Date.now()),today=all.filter(m=>dayKey(m.ts)===tk).length
  let together=0;if(all.length>0)together=Math.max(1,Math.ceil((Date.now()-all[0].ts)/86400000))
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
  let memPatched=false;memories.forEach(m=>{if(!m.source){m.source='manual';memPatched=true}if(!m.tags){m.tags=[];memPatched=true}if(m.usageCount===undefined){m.usageCount=0;memPatched=true}if(m.lastUsed===undefined){m.lastUsed=null;memPatched=true}});if(memPatched)saveMemories()
  if(od&&diaries.length===0){try{diaries=JSON.parse(od).map(d=>({...d,mood:d.mood||''}));saveDiaries()}catch(e){}}
  if(oa&&anniversaries.length===0){try{anniversaries=JSON.parse(oa);saveAnniversaries()}catch(e){}}
}

// ===== CLICK OUTSIDE TO CLOSE =====
document.addEventListener('click',e=>{
  if(!ctxMenu.contains(e.target)&&!reactionPicker.contains(e.target)){hideCtxMenu()}
  if(!drawerEl.contains(e.target)&&!e.target.closest('[onclick*="openDrawer"]')){closeDrawer()}
})

// ===== PWA =====
function registerSW(){if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}}

// ===== INIT =====
;(function init(){
  load()
  migrateOldData()
  showLockScreen()
  updateThinkToggle()
  lockInput.addEventListener('keydown',e=>{if(e.key==='Enter')unlock()})
  let tsx=0;drawerEl.addEventListener('touchstart',e=>{tsx=e.touches[0].clientX})
  drawerEl.addEventListener('touchmove',e=>{if(e.touches[0].clientX-tsx<-50)closeDrawer()})
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closePersonaModal();closeConfirm();hideCtxMenu()}})
  registerSW()
})()
