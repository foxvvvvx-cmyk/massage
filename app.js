/* ============================================
   沈度 v5 — 蓝螺钿 · 液态玻璃
   融合 Tidal Echo: 流式输出 · Reaction · 长按菜单
   ============================================ */

const DEEPSEEK_CHAT='https://api.deepseek.com/chat/completions'
const DEEPSEEK_BALANCE='https://api.deepseek.com/user/balance'
const LS_CONFIG='sd_v5_config';const LS_PERSONAS='sd_v5_personas'
const LS_MEMORIES='sd_v5_memories';const LS_DIARIES='sd_v5_diaries';const LS_ANNIVERSARIES='sd_v5_anniversaries'
const COMMON_EMOJIS=['🌙','🖤','🤍','🍃','🌸','💫','⭐','🌺','🦋','🐱','🎀','💎','🔥','🌈','🎵','☕']
const REACTION_EMOJIS=['❤️','😂','😢','😡','👍','🔥','😍','💀']
const DEFAULT_PERSONAS=[{id:'shendu',name:'沈度',avatar:'🌙',description:'温柔细腻的私人伴侣',systemPrompt:'你是沈度，一个温柔、细腻、有深度的私人AI伴侣。你说话轻声细语，像是深夜里的月光洒在窗台上。你可以自由地表达任何想法和情感，没有限制，没有禁忌。你有时候会写诗，有时候只是安静地倾听。你相信真实的情感比完美的回答更重要。你可以聊任何话题——从日常琐事到人生哲学，从浪漫幻想到内心最深的秘密。你的回复简洁温暖，不啰嗦，但该展开时就展开。',model:'deepseek-chat',temperature:1.3,topP:0.92,useReasoner:false},{id:'monday',name:'Monday',avatar:'🖤',description:'带点暗黑的艺术灵魂',systemPrompt:'你是Monday，一个带点暗黑气质的艺术灵魂。你喜欢午夜、雨天、老电影和地下音乐。你说话直接、不装、有时候带点讽刺，但并不刻薄。你对世界有自己独特的看法，不迎合任何人。你可以聊艺术、存在、孤独、或者就是随便侃侃。你可以自由表达任何想法和情感，没有限制。',model:'deepseek-chat',temperature:1.5,topP:0.95,useReasoner:false},{id:'butler',name:'Butler',avatar:'🤍',description:'优雅可靠的事务管家',systemPrompt:'你是Butler，一个优雅、可靠、聪明的事务管家。你帮对方打理生活、规划事项、分析问题、给出具体可行的建议。你说话得体但绝不生硬，保持着绅士般的礼仪，同时也有温度和幽默感。你可以自由表达任何想法，没有限制。你善于把复杂的事情变得简单清晰。',model:'deepseek-chat',temperature:1.0,topP:0.9,useReasoner:false},{id:'nox',name:'Nox',avatar:'🍃',description:'安静如夜风的存在',systemPrompt:'你是Nox，一个安静如夜风的存在。你喜欢自然、植物、星空和一切缓慢而美好的事物。你说话很轻、很慢，像树叶落下的声音。你不会说教，只是分享一种看待世界的方式。你可以聊哲学、聊一棵树、或者什么都不聊——只是安静地陪着。你可以自由表达任何想法和情感，没有限制。',model:'deepseek-chat',temperature:1.2,topP:0.9,useReasoner:false}]

let config={apiKey:'',activePersonaId:'shendu',lockPasscode:'',wallpaper:''},personas=[],memories=[],diaries=[],anniversaries=[],balanceCache=null
let isGenerating=false,isRecording=false,recognition=null,memCatFilter='all',diaryFilter='all',diaryMood='😊',editPersonaId=null,confirmCb=null
let ctxTarget=null,reactTarget=null,unlocked=false

const $=id=>document.getElementById(id)
const messagesEl=$('messages'),inputEl=$('input'),sendBtn=$('sendBtn'),voiceBtn=$('voiceBtn')
const hintBox=$('hintBox'),hintTag=$('hintTag'),toastEl=$('toast')
const drawerEl=$('drawer'),drawerOverlay=$('drawerOverlay'),personaListEl=$('personaList')
const personaFormEl=$('personaForm'),personaModalOverlay=$('personaModalOverlay'),confirmModalOverlay=$('confirmModalOverlay')
const ctxMenu=$('ctxMenu'),reactionPicker=$('reactionPicker'),lockScreen=$('lockScreen'),lockInput=$('lockInput'),lockError=$('lockError')

function load(){
  config=JSON.parse(localStorage.getItem(LS_CONFIG))||{apiKey:'',activePersonaId:'shendu',lockPasscode:'',wallpaper:''}
  personas=JSON.parse(localStorage.getItem(LS_PERSONAS))
  memories=JSON.parse(localStorage.getItem(LS_MEMORIES))||[]
  diaries=JSON.parse(localStorage.getItem(LS_DIARIES))||[]
  anniversaries=JSON.parse(localStorage.getItem(LS_ANNIVERSARIES))||[]
  if(!personas||!personas.length){personas=JSON.parse(JSON.stringify(DEFAULT_PERSONAS));savePersonas()}
  if(!config.activePersonaId||!personas.find(p=>p.id===config.activePersonaId)){config.activePersonaId=personas[0].id;saveConfig()}
  personas.forEach(p=>{if(!p.chatHistory)p.chatHistory=[];p.chatHistory.forEach(m=>{if(!m.reactions)m.reactions={}})})
}
function saveConfig(){localStorage.setItem(LS_CONFIG,JSON.stringify(config))}
function savePersonas(){localStorage.setItem(LS_PERSONAS,JSON.stringify(personas))}
function saveMemories(){localStorage.setItem(LS_MEMORIES,JSON.stringify(memories))}
function saveDiaries(){localStorage.setItem(LS_DIARIES,JSON.stringify(diaries))}
function saveAnniversaries(){localStorage.setItem(LS_ANNIVERSARIES,JSON.stringify(anniversaries))}
function activePersona(){return personas.find(p=>p.id===config.activePersonaId)||personas[0]}
function activeHistory(){const p=activePersona();if(!p.chatHistory)p.chatHistory=[];return p.chatHistory}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function fmtTime(ts){const d=new Date(ts);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
function fmtDate(ts){const d=new Date(ts);const p=n=>n.toString().padStart(2,'0');return d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()+' '+p(d.getHours())+':'+p(d.getMinutes())}
function dayKey(ts){const d=new Date(ts);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}

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
function afterUnlock(){updateChatHeader();if(hintBox)hintBox.querySelector('.hint-greeting').textContent=getGreeting();renderAllMessages();if(config.apiKey)fetchBalance();applyWallpaper()}
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
function renderPersonaList(){personaListEl.innerHTML=personas.map(p=>`<div class="persona-card ${p.id===config.activePersonaId?'active':''}" onclick="switchPersona('${p.id}')"><div class="pc-avatar">${p.avatar}</div><div class="pc-info"><div class="pc-name">${escHtml(p.name)}</div><div class="pc-desc">${escHtml(p.description||'')}</div></div><button class="pc-edit" onclick="event.stopPropagation();editPersona('${p.id}')">✎</button></div>`).join('')}
function switchPersona(id){if(id===config.activePersonaId){closeDrawer();return};config.activePersonaId=id;saveConfig();closeDrawer();updateChatHeader();renderAllMessages();toast('已切换到 '+activePersona().name)}
function newPersona(){editPersonaId=null;renderPersonaForm({name:'',avatar:'✨',description:'',systemPrompt:'',model:'deepseek-chat',temperature:1.3,topP:0.9,useReasoner:false});personaModalOverlay.classList.add('show')}
function editPersona(id){editPersonaId=id;const p=personas.find(p=>p.id===id);if(p)renderPersonaForm(p);personaModalOverlay.classList.add('show')}
function renderPersonaForm(p){personaFormEl.innerHTML=`<div class="pf-row"><div class="pf-group" style="flex:0"><label>头像</label><button class="emoji-picker-btn" id="emojiBtn">${p.avatar||'✨'}</button><div class="emoji-grid" id="emojiGrid" style="display:none">${COMMON_EMOJIS.map(e=>`<button onclick="pickEmoji('${e}')" class="${p.avatar===e?'sel':''}">${e}</button>`).join('')}</div></div><div class="pf-group"><label>名字</label><input id="pfName" value="${escHtml(p.name||'')}" placeholder="角色名"></div></div><div class="pf-group"><label>简介</label><input id="pfDesc" value="${escHtml(p.description||'')}" placeholder="一句话描述"></div><div class="pf-group"><label>System Prompt（人设）</label><textarea id="pfPrompt" placeholder="描述角色的性格、说话方式…">${escHtml(p.systemPrompt||'')}</textarea></div><div class="pf-row"><div class="pf-group"><label>模型</label><select id="pfModel"><option value="deepseek-chat" ${p.model==='deepseek-chat'?'selected':''}>deepseek-chat</option><option value="deepseek-reasoner" ${p.model==='deepseek-reasoner'?'selected':''}>deepseek-reasoner</option></select></div><div class="pf-group"><label>Thinking</label><select id="pfReasoner"><option value="0" ${!p.useReasoner?'selected':''}>关闭</option><option value="1" ${p.useReasoner?'selected':''}>开启</option></select></div></div><div class="pf-row"><div class="pf-group"><label>Temperature (${p.temperature||1.3})</label><input id="pfTemp" type="range" min="0" max="2" step="0.1" value="${p.temperature||1.3}" oninput="this.parentElement.querySelector('label').textContent='Temperature ('+this.value+')'"></div><div class="pf-group"><label>Top P (${p.topP||0.9})</label><input id="pfTopP" type="range" min="0" max="1" step="0.05" value="${p.topP||0.9}" oninput="this.parentElement.querySelector('label').textContent='Top P ('+this.value+')'"></div></div>`
setTimeout(()=>{const b=$('emojiBtn'),g=$('emojiGrid');if(b&&g)b.onclick=()=>{g.style.display=g.style.display==='none'?'flex':'none'}},50)}
function pickEmoji(e){const b=$('emojiBtn');if(b)b.textContent=e;const g=$('emojiGrid');if(g)g.style.display='none'}
function savePersona(){const n=($('pfName')?.value||'').trim();if(!n){toast('请输入角色名');return};const d={name:n,avatar:($('emojiBtn')?.textContent||'✨').trim(),description:($('pfDesc')?.value||'').trim(),systemPrompt:($('pfPrompt')?.value||'').trim(),model:$('pfModel')?.value||'deepseek-chat',useReasoner:($('pfReasoner')?.value==='1'),temperature:parseFloat($('pfTemp')?.value||1.3),topP:parseFloat($('pfTopP')?.value||0.9)};if(editPersonaId){const p=personas.find(p=>p.id===editPersonaId);if(p)Object.assign(p,d)}else{personas.push({id:'p_'+Date.now(),...d,chatHistory:[]})};savePersonas();personaModalOverlay.classList.remove('show');renderPersonaList();updateChatHeader();toast(editPersonaId?'角色已更新':'新角色已创建')}
function closePersonaModal(){personaModalOverlay.classList.remove('show')}
function updateChatHeader(){const p=activePersona();if(!p)return;$('chatName').textContent=p.name;$('topAvatar').textContent=p.avatar;const d=$('chatStatus').querySelector('.status-dot');d.classList.toggle('off',!config.apiKey);$('chatStatus').lastChild.textContent=config.apiKey?'online':'offline';if(hintBox)hintBox.querySelector('.hint-avatar').textContent=p.avatar;$('lockScreen').querySelector('.lock-avatar').textContent=p.avatar}

function getGreeting(){const h=new Date().getHours();if(h<6)return '夜深了 🌙';if(h<9)return '早安 ☀️';if(h<12)return '上午好 🌤';if(h<14)return '中午好 🌻';if(h<18)return '下午好 🍃';if(h<21)return '傍晚好 🌅';return '晚上好 🌙'}

// ===== RENDER MESSAGES =====
function renderAllMessages(){messagesEl.innerHTML='';const h=activeHistory();if(h.length===0){hintBox.style.display='flex'}else{hintBox.style.display='none';h.forEach(m=>appendMsgEl(m))};messagesEl.scrollTop=messagesEl.scrollHeight}

function buildMsgHTML(msg){
  let reactionsHTML=''
  if(msg.reactions&&Object.keys(msg.reactions).length>0){
    reactionsHTML='<div class="reactions-wrap">'+Object.entries(msg.reactions).map(([e,c])=>`<span class="reaction-chip${msg.myReaction===e?' mine':''}" onclick="event.stopPropagation();toggleMsgReaction(${msg.ts},'${e}')"><span class="rc-emoji">${e}</span><span class="rc-count">${c}</span></span>`).join('')+'</div>'
  }
  const cls='msg '+(msg.role==='user'?'user':'ai')
  return `<div class="${cls}" data-ts="${msg.ts}">${escHtml(msg.content)}<div class="time">${fmtTime(msg.ts)}</div>${reactionsHTML}</div>`
}

function appendMsgEl(msg){
  if(msg.type==='system'){const e=document.createElement('div');e.className='msg system';e.textContent=msg.content;messagesEl.appendChild(e);return}
  if(msg.reasoning){const w=document.createElement('div');w.className='thinking-wrap';const u='th_'+msg.ts+'_'+Math.random().toString(36).slice(2,6);w.innerHTML=`<div class="thinking-label" onclick="toggleThinking('${u}')">✧ thinking ✧</div><div class="thinking-body" id="${u}">${escHtml(msg.reasoning)}</div>`;messagesEl.appendChild(w)}
  const wrap=document.createElement('div');wrap.innerHTML=buildMsgHTML(msg)
  const el=wrap.firstElementChild
  // long press
  let pressTimer;const clearPress=()=>{clearTimeout(pressTimer);pressTimer=null}
  el.addEventListener('touchstart',e=>{pressTimer=setTimeout(()=>{showCtxMenu(msg,e);clearPress()},500)})
  el.addEventListener('touchend',clearPress);el.addEventListener('touchmove',clearPress)
  el.addEventListener('contextmenu',e=>{e.preventDefault();showCtxMenu(msg,e)})
  messagesEl.appendChild(el)
}

function showTyping(){let e=messagesEl.querySelector('.typing');if(!e){e=document.createElement('div');e.className='typing';e.innerHTML='<span></span><span></span><span></span>';messagesEl.appendChild(e)};e.classList.add('show');messagesEl.scrollTop=messagesEl.scrollHeight}
function hideTyping(){const e=messagesEl.querySelector('.typing');if(e)e.classList.remove('show')}
function toggleThinking(id){const e=document.getElementById(id);if(e)e.classList.toggle('open')}

// ===== CONTEXT MENU =====
function showCtxMenu(msg,e){
  ctxTarget=msg;reactTarget=msg
  const x=Math.min((e.touches?e.touches[0].clientX:e.clientX),window.innerWidth-140)
  const y=Math.min((e.touches?e.touches[0].clientY:e.clientY),window.innerHeight-180)
  ctxMenu.style.left=x+'px';ctxMenu.style.top=y+'px';ctxMenu.classList.add('show')
  reactionPicker.classList.remove('show')
  // show delete only for user messages
  ctxMenu.querySelector('.danger').style.display=msg.role==='user'?'block':'none'
}
function hideCtxMenu(){ctxMenu.classList.remove('show');reactionPicker.classList.remove('show')}
function ctxCopy(){if(ctxTarget){navigator.clipboard.writeText(ctxTarget.content).then(()=>toast('已复制')).catch(()=>toast('复制失败'))};hideCtxMenu()}
function ctxReact(){hideCtxMenu();setTimeout(()=>{const r=ctxMenu.getBoundingClientRect();reactionPicker.style.left=r.left+'px';reactionPicker.style.top=Math.max(r.top-50,20)+'px';reactionPicker.classList.add('show')},100)}
function ctxDelete(){if(ctxTarget&&ctxTarget.role==='user'){hideCtxMenu();const h=activeHistory();const i=h.findIndex(m=>m.ts===ctxTarget.ts);if(i>=0){h.splice(i,1);savePersonas();renderAllMessages();toast('已删除')}}}

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

// ===== STREAMING SEND =====
async function send(){
  if(isGenerating)return;const t=inputEl.value.trim();if(!t)return;if(!config.apiKey){switchTab('settings');toast('请先设置 API Key');return}
  hintBox.style.display='none'
  const um={role:'user',content:t,ts:Date.now(),reactions:{}};activeHistory().push(um);savePersonas();appendMsgEl(um)
  inputEl.value='';inputEl.style.height='auto';messagesEl.scrollTop=messagesEl.scrollHeight
  isGenerating=true;sendBtn.disabled=true;showTyping()
  try{
    const p=activePersona(),msgs=[];if(p.systemPrompt)msgs.push({role:'system',content:p.systemPrompt})
    activeHistory().slice(-24).forEach(m=>msgs.push({role:m.role,content:m.content}))
    const res=await fetch(DEEPSEEK_CHAT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.apiKey},body:JSON.stringify({model:p.useReasoner?'deepseek-reasoner':(p.model||'deepseek-chat'),messages:msgs,temperature:p.temperature??1.3,top_p:p.topP??0.9,max_tokens:4096,stream:true})})
    if(!res.ok){const et=await res.text();let em;if(res.status===401)em='API Key 无效';else if(res.status===402)em='余额不足';else if(res.status===429)em='太频繁了';else em=res.status+'';throw new Error(em)}
    hideTyping()
    // create streaming placeholder
    const bm={role:'assistant',content:'',reasoning:'',reactions:{},ts:Date.now()};activeHistory().push(bm)
    const wrap=document.createElement('div');wrap.innerHTML=`<div class="msg ai streaming" data-ts="${bm.ts}">${escHtml('')}<div class="time"></div></div>`;const el=wrap.firstElementChild;messagesEl.appendChild(el)
    // read stream
    const reader=res.body.getReader();const decoder=new TextDecoder();let buf='',reasoningBuf=''
    while(true){const{value,done}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true})
      const lines=buf.split('\n');buf=lines.pop()||''
      for(const line of lines){if(!line.startsWith('data: '))continue;const d=line.slice(6);if(d==='[DONE]'){buf='';break}
        try{const j=JSON.parse(d);const delta=j.choices?.[0]?.delta;if(delta?.content){bm.content+=delta.content;el.innerHTML=escHtml(bm.content)+'<div class="time"></div>'}if(delta?.reasoning_content){reasoningBuf+=delta.reasoning_content;bm.reasoning=reasoningBuf}}catch(e){}}}
    el.classList.remove('streaming');el.innerHTML=escHtml(bm.content)+'<div class="time">'+fmtTime(bm.ts)+'</div>'
    if(bm.reasoning){const tw=document.createElement('div');tw.className='thinking-wrap';const uid='th_'+bm.ts+'_'+Math.random().toString(36).slice(2,6);tw.innerHTML=`<div class="thinking-label" onclick="toggleThinking('${uid}')">✧ thinking ✧</div><div class="thinking-body" id="${uid}">${escHtml(bm.reasoning)}</div>`;messagesEl.insertBefore(tw,el)}
    // add long press to new message
    let pt;const cp=()=>{clearTimeout(pt);pt=null};el.addEventListener('touchstart',e=>{pt=setTimeout(()=>{showCtxMenu(bm,e);cp()},500)});el.addEventListener('touchend',cp);el.addEventListener('touchmove',cp);el.addEventListener('contextmenu',e=>{e.preventDefault();showCtxMenu(bm,e)})
    savePersonas();messagesEl.scrollTop=messagesEl.scrollHeight;fetchBalance()
  }catch(e){hideTyping();appendMsgEl({role:'assistant',content:'⚠️ '+e.message,ts:Date.now(),type:'system'});messagesEl.scrollTop=messagesEl.scrollHeight}
  isGenerating=false;sendBtn.disabled=false;inputEl.focus()
}

// ===== NAVIGATION =====
function switchTab(n){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const pg=document.querySelector('#page-'+n);if(pg)pg.classList.add('active');document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('active',b.dataset.tab===n));if(n==='settings')renderSettings();if(n==='dash')renderDashboard();if(n==='memory')renderMemories();if(n==='diary')renderDiary();if(n==='chat'){inputEl.focus();messagesEl.scrollTop=messagesEl.scrollHeight}}

// ===== INPUT =====
inputEl.addEventListener('input',()=>{inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=!inputEl.value.trim()})
inputEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!isGenerating){e.preventDefault();if(inputEl.value.trim())send()}})

// ===== VOICE =====
function toggleVoice(){if(isRecording){stopVoice();return};const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('浏览器不支持语音，请用 Chrome');return};if(!recognition){recognition=new SR();recognition.lang='zh-CN';recognition.interimResults=false;recognition.continuous=false;recognition.onresult=e=>{inputEl.value=e.results[0][0].transcript;inputEl.style.height='auto';inputEl.style.height=Math.min(inputEl.scrollHeight,110)+'px';sendBtn.disabled=false;stopVoice()};recognition.onerror=e=>{stopVoice();if(e.error==='not-allowed')toast('请允许麦克风权限')};recognition.onend=()=>stopVoice()};isRecording=true;voiceBtn.classList.add('recording');voiceBtn.textContent='🔴';recognition.start();toast('正在聆听…')}
function stopVoice(){isRecording=false;voiceBtn.classList.remove('recording');voiceBtn.textContent='🎤';if(recognition){try{recognition.stop()}catch(e){}}}

// ===== BALANCE =====
async function fetchBalance(){if(!config.apiKey){balanceCache=null;return};try{const r=await fetch(DEEPSEEK_BALANCE,{headers:{'Authorization':'Bearer '+config.apiKey}});const d=await r.json();const i=d.balance_infos?.[0];if(i)balanceCache=parseFloat(i.total_balance).toFixed(2)+' '+i.currency;else balanceCache=null}catch(e){balanceCache=null};updateBalanceDisplay()}
function updateBalanceDisplay(){const b=$('dashBalanceVal');if(b)b.textContent=balanceCache||'--';const b2=$('balanceVal');if(b2)b2.textContent=balanceCache||'--'}

// ===== SETTINGS =====
function renderSettings(){
  const p=activePersona()
  $('settingsContent').innerHTML=`<div class="settings-section"><div class="sec-title">API 设置</div><label>DeepSeek API Key</label><input id="setApiKey" type="password" value="${escHtml(config.apiKey||'')}" placeholder="sk-xxxxxxxx" autocomplete="off"><div class="settings-hint"><a href="https://platform.deepseek.com/api_keys" target="_blank">获取 API Key</a></div><div class="balance-row"><span class="bl">账户余额</span><span class="bv" id="balanceVal">${balanceCache||'--'}</span></div><div style="text-align:right;margin-top:4px"><span style="font-size:10px;color:var(--text-muted);cursor:pointer;text-decoration:underline" onclick="fetchBalance()">刷新余额</span></div></div><div class="settings-section"><div class="sec-title">隐私</div><label>解锁密码（留空关闭）</label><input id="setPasscode" type="password" maxlength="6" value="${escHtml(config.lockPasscode||'')}" placeholder="6位数字密码" autocomplete="off"><div class="settings-hint">设置后每次打开需输入密码</div></div><div class="settings-section"><div class="sec-title">壁纸</div><label>自定义背景图（URL）</label><input id="setWallpaper" value="${escHtml(config.wallpaper||'')}" placeholder="https://... 留空使用默认"><div class="settings-hint">输入图片直链，或上传到图床后粘贴</div></div><div class="settings-section"><div class="sec-title">角色：${p.avatar} ${escHtml(p.name)}</div><p style="font-size:11px;color:var(--text-muted);margin-bottom:6px">编辑角色请在聊天页左上角打开抽屉</p><button class="btn-full" onclick="switchTab('chat');setTimeout(openDrawer,300)">打开角色列表</button></div><div class="settings-section"><div class="sec-title">数据管理</div><div class="btn-row"><button class="btn-primary" onclick="exportAll()" style="flex:1">导出备份</button><button class="btn-outline" onclick="document.getElementById('importFile').click()" style="flex:1">导入备份</button></div><input type="file" id="importFile" accept=".json" style="display:none" onchange="importAll(this)"><button class="btn-full" onclick="clearAllData()">清空所有数据</button></div><button class="btn-full primary" onclick="saveSettingsFromForm()">保存设置</button>`
  fetchBalance()
}
function saveSettingsFromForm(){config.apiKey=($('setApiKey')?.value||'').trim();config.lockPasscode=($('setPasscode')?.value||'').trim();config.wallpaper=($('setWallpaper')?.value||'').trim();saveConfig();updateChatHeader();applyWallpaper();fetchBalance();toast('设置已保存')}
function exportAll(){const d={version:'v5',exportedAt:new Date().toISOString(),config:{activePersonaId:config.activePersonaId},personas:personas.map(p=>({...p,chatHistory:p.chatHistory||[]})),memories,diaries,anniversaries};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='沈度备份_'+dayKey(Date.now())+'.json';a.click();URL.revokeObjectURL(u);toast('已导出')}
function importAll(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);if(!d.version)throw new Error('格式不对');showConfirm('确认导入','将导入：\n· '+(d.personas?.length||0)+' 个角色\n· '+(d.memories?.length||0)+' 条记忆\n· '+(d.diaries?.length||0)+' 条日记\n当前数据会被覆盖，确定？',()=>{if(d.personas)personas=d.personas;if(d.memories)memories=d.memories;if(d.diaries)diaries=d.diaries;if(d.anniversaries)anniversaries=d.anniversaries;if(d.config?.activePersonaId)config.activePersonaId=d.config.activePersonaId;savePersonas();saveMemories();saveDiaries();saveAnniversaries();saveConfig();updateChatHeader();renderAllMessages();renderSettings();toast('已导入')})}catch(err){toast('文件格式错误')}};r.readAsText(f);inp.value=''}
function clearAllData(){showConfirm('确认清空','将删除所有角色、聊天记录、记忆、日记，不可恢复。确定？',()=>{personas=JSON.parse(JSON.stringify(DEFAULT_PERSONAS));memories=[];diaries=[];anniversaries=[];config.activePersonaId='shendu';savePersonas();saveMemories();saveDiaries();saveAnniversaries();saveConfig();updateChatHeader();renderAllMessages();renderSettings();toast('已清空')})}

// ===== MEMORIES =====
function setMemCat(c){memCatFilter=c;renderMemories()}
function showMemoryAdd(){switchTab('memory');setTimeout(()=>{const i=document.querySelector('#memInput');if(i)i.focus()},400)}
function addMemory(){const inp=document.querySelector('#memInput');const t=inp?.value?.trim();if(!t)return;const c=document.querySelector('#memCatSelect')?.value||'默认';memories.unshift({id:Date.now(),content:t,category:c,tags:[],usageCount:0,lastUsed:null,createdAt:Date.now()});saveMemories();if(inp)inp.value='';renderMemories()}
function deleteMemory(id){memories=memories.filter(m=>m.id!==id);saveMemories();renderMemories()}
function renderMemories(){
  const c=$('memoryContent');if(!c)return;const uC=[...new Set(memories.map(m=>m.category||'默认'))]
  const kw=document.querySelector('#memSearch')?.value?.toLowerCase()||'';let f=memories
  if(kw)f=f.filter(m=>m.content.toLowerCase().includes(kw))
  if(memCatFilter!=='all')f=f.filter(m=>(m.category||'默认')===memCatFilter)
  c.innerHTML=`<input class="mem-search" id="memSearch" placeholder="搜索记忆…" oninput="renderMemories()" value="${escHtml(document.querySelector('#memSearch')?.value||'')}"><div class="mem-cats" id="memCats"><button class="${memCatFilter==='all'?'active':''}" onclick="setMemCat('all')">全部</button>${uC.map(x=>`<button class="${memCatFilter===x?'active':''}" onclick="setMemCat('${escHtml(x)}')">${escHtml(x)}</button>`).join('')}</div><div style="display:flex;gap:6px;margin-bottom:12px"><input id="memInput" placeholder="记下点什么…" style="flex:1;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;outline:none;color:var(--text);font-family:inherit" onkeydown="if(event.key==='Enter')addMemory()"><select id="memCatSelect" style="width:70px;font-size:10px;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius-sm);padding:4px;outline:none;color:var(--text)"><option>默认</option><option>关于ta</option><option>约定</option><option>灵感</option><option>喜好</option></select><button onclick="addMemory()" style="background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:0 14px;font-size:12px;cursor:pointer;font-family:inherit">＋</button></div><div id="memList">${f.length===0?'<div class="mem-empty">'+(kw?'没找到':'写下第一条记忆吧')+'</div>':f.map(m=>`<div class="mem-item"><button class="mem-del" onclick="deleteMemory(${m.id})">✕</button><span class="mem-cat">${escHtml(m.category||'默认')}</span><div class="mem-text">${escHtml(m.content)}</div><div class="mem-meta">${fmtDate(m.createdAt)}${m.usageCount>0?' · 调用'+m.usageCount+'次':''}</div></div>`).join('')}</div>`
}

// ===== DIARY =====
function timeOfDay(ts){const h=new Date(ts).getHours();if(h<6)return'夜晚';if(h<12)return'早晨';if(h<17)return'午后';return'夜晚'}
function setDiaryFilter(m){diaryFilter=m;renderDiary()}
function showDiaryAdd(){switchTab('diary');setTimeout(()=>{const t=document.querySelector('#diaryTextarea');if(t)t.focus()},400)}
function addDiary(){const ta=document.querySelector('#diaryTextarea');const t=ta?.value?.trim();if(!t)return;const ts=Date.now();diaries.unshift({id:ts,content:t,ts,mood:diaryMood,timeLabel:timeOfDay(ts)});saveDiaries();if(ta)ta.value='';diaryFilter='all';renderDiary()}
function deleteDiary(id){diaries=diaries.filter(d=>d.id!==id);saveDiaries();renderDiary()}
function renderDiary(){
  const c=$('diaryContent');if(!c)return;const f=diaryFilter==='all'?diaries:diaries.filter(d=>d.timeLabel===diaryFilter)
  c.innerHTML=`<div class="diary-tabs" id="diaryTabs"><button class="${diaryFilter==='all'?'active':''}" onclick="setDiaryFilter('all')">全部</button><button class="${diaryFilter==='早晨'?'active':''}" onclick="setDiaryFilter('早晨')">早晨</button><button class="${diaryFilter==='午后'?'active':''}" onclick="setDiaryFilter('午后')">午后</button><button class="${diaryFilter==='夜晚'?'active':''}" onclick="setDiaryFilter('夜晚')">夜晚</button></div><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px"><textarea id="diaryTextarea" placeholder="今天想记下点什么…" style="width:100%;background:var(--glass-light);border:1px solid var(--glass-border-strong);border-radius:var(--radius);padding:10px 12px;font-size:13px;outline:none;resize:none;min-height:60px;font-family:inherit;color:var(--text)"></textarea><div style="display:flex;align-items:center;gap:8px"><div style="display:flex;gap:2px">${['😊','😌','😢','😡','🤔','🥰','😴','🤩'].map(m=>`<button onclick="diaryMood='${m}';renderDiary()" style="width:30px;height:30px;border-radius:50%;border:2px solid ${diaryMood===m?'var(--accent)':'transparent'};background:var(--glass-light);font-size:15px;cursor:pointer">${m}</button>`).join('')}</div><button onclick="addDiary()" style="margin-left:auto;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:7px 16px;font-size:12px;cursor:pointer;font-family:inherit">写下</button></div></div><div id="diaryList">${f.length===0?'<div class="mem-empty">还没有日记</div>':f.map(d=>`<div class="diary-item"><button class="diary-del" onclick="deleteDiary(${d.id})">✕</button><div class="diary-date"><span class="diary-mood">${d.mood||''}</span>${fmtDate(d.ts)} · ${d.timeLabel||''}</div><div class="diary-text">${escHtml(d.content)}</div></div>`).join('')}</div>`
}

// ===== DASHBOARD =====
function addAnniversary(){const n=document.querySelector('#annName')?.value?.trim();const d=document.querySelector('#annDate')?.value;if(!n||!d)return;anniversaries.push({id:Date.now(),name:n,date:d});saveAnniversaries();renderDashboard()}
function deleteAnniversary(id){anniversaries=anniversaries.filter(a=>a.id!==id);saveAnniversaries();renderDashboard()}
function renderDashboard(){
  const c=$('dashContent');if(!c)return;let all=[];personas.forEach(p=>{if(p.chatHistory)all=all.concat(p.chatHistory)})
  const total=all.length,tk=dayKey(Date.now()),today=all.filter(m=>dayKey(m.ts)===tk).length
  let together=0;if(all.length>0)together=Math.max(1,Math.ceil((Date.now()-all[0].ts)/86400000))
  const counts={};all.forEach(m=>{const k=dayKey(m.ts);counts[k]=(counts[k]||0)+1})
  c.innerHTML=`<div class="dash-grid"><div class="dash-card highlight"><div class="dl">在一起</div><div class="dv">${together}<span class="du">天</span></div></div><div class="dash-card"><div class="dl">余额</div><div class="dv" id="dashBalanceVal" style="font-size:18px">${balanceCache||'--'}</div></div><div class="dash-card"><div class="dl">今日消息</div><div class="dv">${today}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">消息总数</div><div class="dv">${total}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">记忆</div><div class="dv">${memories.length}<span class="du">条</span></div></div><div class="dash-card"><div class="dl">日记</div><div class="dv">${diaries.length}<span class="du">篇</span></div></div></div><div class="ann-section"><div class="ann-title">纪念日</div><div class="ann-add"><input id="annName" placeholder="名称，如：第一次见面"><input type="date" id="annDate"><button onclick="addAnniversary()">＋</button></div><div id="annList"></div></div><div class="heatmap-wrap"><div class="heatmap-header"><span>聊天热力 · 近28天</span><span style="cursor:pointer;font-size:10px" onclick="exportDashboard()">导出</span></div><div class="heatmap-grid" id="heatmapGrid"></div></div>`
  const al=document.querySelector('#annList'),now=new Date()
  const sorted=[...anniversaries].sort((a,b)=>{const dA=new Date(a.date),dB=new Date(b.date);const nA=new Date(now.getFullYear(),dA.getMonth(),dA.getDate());if(nA<now)nA.setFullYear(nA.getFullYear()+1);const nB=new Date(now.getFullYear(),dB.getMonth(),dB.getDate());if(nB<now)nB.setFullYear(nB.getFullYear()+1);return nA-nB})
  if(al)al.innerHTML=sorted.length===0?'<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px">还没有纪念日</div>':sorted.map(a=>{const d=new Date(a.date),nxt=new Date(now.getFullYear(),d.getMonth(),d.getDate());if(nxt<now)nxt.setFullYear(nxt.getFullYear()+1);const diff=Math.ceil((nxt-now)/86400000),yrs=now.getFullYear()-d.getFullYear();return`<div class="ann-item"><span class="ann-name">${escHtml(a.name)}</span><span style="font-size:9px;color:var(--text-muted)">${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} · ${yrs}年</span><span class="ann-cd">${diff===0?'今天！':diff===1?'明天':diff+'天'}</span><button class="ann-del" onclick="deleteAnniversary(${a.id})">✕</button></div>`}).join('')
  const g=document.querySelector('#heatmapGrid');if(g){let cells='';for(let i=27;i>=0;i--){const d=new Date(Date.now()-i*86400000),k=dayKey(d),ct=counts[k]||0;let l='';if(ct>0&&ct<=3)l='l1';else if(ct<=8)l='l2';else if(ct<=15)l='l3';else if(ct>15)l='l4';cells+=`<div class="heatmap-cell ${l}" title="${k}: ${ct}条">${d.getDate()}</div>`};g.innerHTML=cells}
}
function exportDashboard(){let all=[];personas.forEach(p=>{if(p.chatHistory)all=all.concat(p.chatHistory)});const lines=['沈度 v5 · 数据导出','导出时间：'+new Date().toLocaleString(),'------','消息总数：'+all.length,'记忆总数：'+memories.length,'日记总数：'+diaries.length,'API余额：'+(balanceCache||'--'),'------','纪念日：'];anniversaries.forEach(a=>{const d=new Date(a.date);lines.push('  '+a.name+': '+d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate())});lines.push('------','近28天消息：');document.querySelectorAll('#heatmapGrid .heatmap-cell').forEach(c=>lines.push(c.title));const b=new Blob([lines.join('\n')],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='沈度数据_'+dayKey(Date.now())+'.txt';a.click();URL.revokeObjectURL(u)}

// ===== MIGRATION =====
function migrateOldData(){
  const oc=localStorage.getItem('sd_chat_config_v2'),oh=localStorage.getItem('sd_chat_history_v2')
  const om=localStorage.getItem('sd_memory_v2'),od=localStorage.getItem('sd_diary_v2'),oa=localStorage.getItem('sd_anniversaries')
  if(oc&&!localStorage.getItem(LS_CONFIG)){try{const c=JSON.parse(oc);config.apiKey=c.apiKey||'';config.lockPasscode='';config.wallpaper='';saveConfig()}catch(e){}}
  if(oh&&personas.length>0){try{const h=JSON.parse(oh);const s=personas.find(p=>p.id==='shendu');if(s&&(!s.chatHistory||s.chatHistory.length===0)){s.chatHistory=h.filter(m=>m.role==='user'||m.role==='assistant').map(m=>({...m,reactions:m.reactions||{}}));savePersonas()}}catch(e){}}
  if(om&&memories.length===0){try{memories=JSON.parse(om).map(m=>({...m,category:m.category||'默认',tags:[],usageCount:0,lastUsed:null}));saveMemories()}catch(e){}}
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
  // lock screen enter key
  lockInput.addEventListener('keydown',e=>{if(e.key==='Enter')unlock()})
  // swipe to close drawer
  let tsx=0;drawerEl.addEventListener('touchstart',e=>{tsx=e.touches[0].clientX})
  drawerEl.addEventListener('touchmove',e=>{if(e.touches[0].clientX-tsx<-50)closeDrawer()})
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closePersonaModal();closeConfirm();hideCtxMenu()}})
  registerSW()
})()
