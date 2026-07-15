// Generated from project source HTML files for built-in game templates.
// Do not edit manually; update the source HTML and regenerate if needed.

export const DOUDIZHU_GAME_HTML = "<!doctype html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover\">\n<title>欢乐斗地主</title>\n<style>\n  :root{\n    --felt-1:#0c5b3f;\n    --felt-2:#063b2a;\n    --gold:#f1c45a;\n    --gold-soft:#e9b94a;\n    --ink:#1c2530;\n    --cream:#fdf7e8;\n    --red:#d33b3b;\n    --safe-top: var(--ai-phone-game-safe-top, 88px);\n    --safe-bottom: var(--ai-phone-game-safe-bottom, 24px);\n  }\n  *{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }\n  html,body{ width:100%; height:100%; margin:0; }\n  body{\n    overflow:hidden;\n    font-family:\"PingFang SC\",\"Hiragino Sans GB\",\"Microsoft YaHei\",-apple-system,sans-serif;\n    color:#fff;\n    background:\n      radial-gradient(120% 80% at 50% 12%, rgba(255,255,255,.06) 0, transparent 55%),\n      radial-gradient(140% 120% at 50% 38%, var(--felt-1) 0%, var(--felt-2) 62%, #042319 100%);\n    user-select:none;\n  }\n  #app{ position:relative; width:100%; height:100%; }\n  .screen{\n    position:absolute; inset:0;\n    display:none;\n    min-height:100%;\n    padding: var(--safe-top) 14px var(--safe-bottom);\n  }\n  .screen.active{ display:block; }\n\n  /* felt texture */\n  body::before{\n    content:\"\"; position:fixed; inset:0; pointer-events:none; z-index:0;\n    background-image:\n      repeating-linear-gradient(45deg, rgba(255,255,255,.012) 0 2px, transparent 2px 6px);\n    mix-blend-mode:overlay;\n  }\n\n  /* ---------- SETUP ---------- */\n  #setup{ display:none; }\n  #setup.active{ display:flex; flex-direction:column; }\n  .title-wrap{ text-align:center; margin: 6px 0 14px; }\n  .title-wrap h1{\n    margin:0; font-size:30px; letter-spacing:6px; font-weight:800;\n    background:linear-gradient(180deg,#fff5d6,var(--gold) 60%,#b9842b);\n    -webkit-background-clip:text; background-clip:text; color:transparent;\n    text-shadow:0 2px 0 rgba(0,0,0,.25);\n  }\n  .title-wrap p{ margin:8px 0 0; font-size:13px; color:#cfe6da; letter-spacing:1px; }\n  .panel{\n    background:rgba(0,0,0,.26);\n    border:1px solid rgba(255,255,255,.08);\n    border-radius:18px; padding:16px;\n    box-shadow:0 10px 30px rgba(0,0,0,.25) inset, 0 4px 18px rgba(0,0,0,.2);\n  }\n  .panel h2{ margin:0 0 4px; font-size:15px; color:var(--gold); letter-spacing:2px; }\n  .panel .hint{ font-size:12px; color:#a9c4ba; margin:0 0 12px; line-height:1.5; }\n  .char-list{ display:flex; flex-direction:column; gap:10px; max-height:42vh; overflow:auto; -webkit-overflow-scrolling:touch; }\n  .char-card{\n    display:flex; align-items:center; gap:12px;\n    padding:10px 12px; border-radius:14px; cursor:pointer;\n    background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.07);\n    transition:transform .12s, border-color .15s, background .15s;\n  }\n  .char-card:active{ transform:scale(.98); }\n  .char-card.sel{ border-color:var(--gold); background:rgba(241,196,90,.12); }\n  .char-card .avatar{\n    width:46px; height:46px; border-radius:50%; flex:0 0 auto; object-fit:cover;\n    background:linear-gradient(135deg,#3a5a4d,#1d3329); border:1.5px solid rgba(255,255,255,.18);\n    display:flex; align-items:center; justify-content:center; font-size:18px; color:#dfe9e3;\n    overflow:hidden;\n  }\n  .char-card .meta{ flex:1; min-width:0; }\n  .char-card .meta .nm{ font-size:15px; font-weight:700; }\n  .char-card .meta .sub{ font-size:12px; color:#9fbbb0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n  .char-card .tick{\n    width:22px; height:22px; border-radius:50%; flex:0 0 auto;\n    border:1.5px solid rgba(255,255,255,.3);\n    display:flex; align-items:center; justify-content:center; font-size:13px;\n  }\n  .char-card.sel .tick{ background:var(--gold); border-color:var(--gold); color:#3a2a05; font-weight:900; }\n  .empty-note{ font-size:12px; color:#9fbbb0; text-align:center; padding:14px; line-height:1.6; }\n\n  .btn{\n    border:none; border-radius:999px; font-weight:800; letter-spacing:1px;\n    padding:13px 22px; font-size:15px; cursor:pointer; transition:transform .1s, filter .15s, opacity .15s;\n    color:#3a2a05;\n    background:linear-gradient(180deg,#ffe9a8,var(--gold) 55%,#cf972f);\n    box-shadow:0 6px 16px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.4) inset;\n  }\n  .btn:active{ transform:translateY(1px) scale(.99); }\n  .btn:disabled{ opacity:.45; filter:grayscale(.4); cursor:default; }\n  .btn.ghost{ background:rgba(255,255,255,.08); color:#eaf4ee; box-shadow:none; border:1.5px solid rgba(255,255,255,.16); }\n  .btn.danger{ background:linear-gradient(180deg,#ff8a8a,#d33b3b 60%,#9c1f1f); color:#fff; }\n  .start-row{ margin-top:auto; padding-top:16px; display:flex; gap:10px; }\n  .start-row .btn{ flex:1; }\n\n  /* ---------- GAME ---------- */\n  #game{ display:none; }\n  #game.active{ display:flex; flex-direction:column; padding-bottom:0; }\n  .topbar{\n    position:absolute; top:calc(var(--safe-top) - 30px); right:14px; z-index:30;\n    display:flex; gap:8px; align-items:center;\n  }\n  .pill{\n    background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.12);\n    border-radius:999px; padding:5px 12px; font-size:12px; letter-spacing:.5px;\n    display:flex; align-items:center; gap:6px; backdrop-filter:blur(6px);\n  }\n  .pill b{ color:var(--gold); }\n\n  .table{ position:relative; flex:1; min-height:0; }\n\n  .seat{ position:absolute; display:flex; flex-direction:column; align-items:center; gap:5px; z-index:10; }\n  .seat.top-left{ top:6px; left:8px; }\n  .seat.top-right{ top:6px; right:8px; }\n  .seat .av-wrap{ position:relative; }\n  .seat .avatar{\n    width:54px; height:54px; border-radius:50%;\n    background:linear-gradient(135deg,#3a5a4d,#1d3329);\n    border:2px solid rgba(255,255,255,.22);\n    display:flex; align-items:center; justify-content:center; font-size:20px; color:#dfe9e3;\n    overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,.35);\n  }\n  .seat .avatar img{ width:100%; height:100%; object-fit:cover; }\n  .seat .avatar.turn{ border-color:var(--gold); box-shadow:0 0 0 3px rgba(241,196,90,.35),0 0 18px rgba(241,196,90,.5); }\n  .role-badge{\n    position:absolute; bottom:-4px; left:50%; transform:translateX(-50%);\n    font-size:10px; font-weight:800; padding:1px 7px; border-radius:999px; letter-spacing:1px;\n    white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,.4);\n  }\n  .role-badge.dz{ background:linear-gradient(180deg,#ffdf8a,#d99a22); color:#3a2a05; }\n  .role-badge.nm{ background:linear-gradient(180deg,#bfe0ff,#5b9bd6); color:#10243a; }\n  .seat .nm-line{ font-size:12px; max-width:88px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n  .seat .count{\n    font-size:11px; color:#cfe6da; background:rgba(0,0,0,.35);\n    border-radius:999px; padding:1px 8px; display:flex; align-items:center; gap:4px;\n  }\n  .seat .count .mini{ width:9px; height:13px; border-radius:2px; background:linear-gradient(135deg,#c9302c,#7a1410); border:1px solid rgba(255,255,255,.3); }\n\n  /* speech bubble */\n  .bubble{\n    position:absolute; z-index:25; max-width:160px; min-width:40px;\n    background:var(--cream); color:#26303a; font-size:12.5px; line-height:1.45;\n    padding:8px 11px; border-radius:14px;\n    box-shadow:0 8px 20px rgba(0,0,0,.4);\n    opacity:0; transform:translateY(6px) scale(.9); pointer-events:none;\n    transition:opacity .18s, transform .18s;\n  }\n  .bubble.show{ opacity:1; transform:translateY(0) scale(1); }\n  .bubble::after{ content:\"\"; position:absolute; width:0; height:0; border:7px solid transparent; }\n  .bubble.left{ top:8px; left:64px; }\n  .bubble.left::after{ left:-12px; top:14px; border-right-color:var(--cream); }\n  .bubble.right{ top:8px; right:64px; text-align:right; }\n  .bubble.right::after{ right:-12px; top:14px; border-left-color:var(--cream); }\n  .bubble .think{ display:inline-flex; gap:3px; }\n  .bubble .think i{ width:5px; height:5px; border-radius:50%; background:#9aa6b0; animation:blink 1s infinite; }\n  .bubble .think i:nth-child(2){ animation-delay:.2s; } .bubble .think i:nth-child(3){ animation-delay:.4s; }\n  @keyframes blink{ 0%,60%,100%{opacity:.25;} 30%{opacity:1;} }\n\n  /* play zones (center table) */\n  .play-zone{ position:absolute; display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:0; z-index:8; min-height:74px; }\n  #pz-0{ left:0; right:0; bottom:6px; }\n  #pz-1{ right:6px; top:96px; max-width:46%; justify-content:flex-end; }\n  #pz-2{ left:6px; top:96px; max-width:46%; justify-content:flex-start; }\n  .pz-pass{ font-size:22px; font-weight:900; color:var(--gold); letter-spacing:2px; text-shadow:0 2px 6px rgba(0,0,0,.5); transform:rotate(-8deg); }\n\n  /* center info */\n  .center-info{ position:absolute; left:50%; top:40%; transform:translate(-50%,-50%); text-align:center; z-index:6; opacity:.9; }\n  .center-info .vs{ font-size:13px; color:#bfe0d4; letter-spacing:3px; }\n\n  /* bottom landlord cards */\n  .dipai{ position:absolute; top:8px; left:50%; transform:translateX(-50%); display:flex; gap:4px; z-index:12; }\n  .dipai .dp-label{ position:absolute; top:-18px; left:50%; transform:translateX(-50%); font-size:10px; color:var(--gold); letter-spacing:2px; white-space:nowrap; }\n\n  /* CARDS */\n  .card{\n    position:relative; width:46px; height:64px; border-radius:7px;\n    background:linear-gradient(180deg,#ffffff,#f3f4f1);\n    box-shadow:0 2px 5px rgba(0,0,0,.3); border:1px solid rgba(0,0,0,.12);\n    flex:0 0 auto; color:#1c2530; font-weight:800;\n  }\n  .card.sm{ width:34px; height:48px; border-radius:5px; }\n  .card .corner{ position:absolute; top:3px; left:4px; line-height:1; text-align:center; }\n  .card .corner .r{ font-size:14px; font-weight:900; }\n  .card.sm .corner .r{ font-size:11px; }\n  .card .corner .s{ font-size:11px; margin-top:-1px; }\n  .card.sm .corner .s{ font-size:8px; }\n  .card .mid{ position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); text-align:center; font-size:22px; }\n  .card.sm .mid{ font-size:15px; }\n  .card.red{ color:var(--red); }\n  .card.joker .mid{ font-size:13px; writing-mode:vertical-rl; left:50%; transform:translate(-50%,-50%); letter-spacing:1px; font-weight:900; }\n  .card.joker.big{ color:var(--red); } .card.joker.small{ color:#1c2530; }\n  .card .jk-corner{ position:absolute; top:3px; left:0; right:0; text-align:center; font-size:10px; font-weight:900; }\n\n  /* card back */\n  .cback{\n    width:30px; height:44px; border-radius:5px; flex:0 0 auto;\n    background:\n      repeating-linear-gradient(45deg, #b32626 0 4px, #8e1b1b 4px 8px);\n    border:1.5px solid rgba(255,255,255,.5); box-shadow:0 2px 5px rgba(0,0,0,.35);\n    position:relative;\n  }\n  .cback::after{ content:\"\"; position:absolute; inset:4px; border:1px solid rgba(255,255,255,.4); border-radius:3px; }\n\n  /* hand */\n  .hand-area{ position:relative; padding:0 8px; }\n  .my-info{ display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:2px; }\n  .hand{ position:relative; display:flex; justify-content:center; align-items:flex-end; height:84px; }\n  .hand .card{ cursor:pointer; transition:transform .12s; margin-left:-22px; }\n  .hand .card:first-child{ margin-left:0; }\n  .hand .card.up{ transform:translateY(-16px); box-shadow:0 8px 16px rgba(0,0,0,.4); }\n  .hand .card.hintable{ outline:2px solid var(--gold); outline-offset:-1px; }\n\n  .actions{\n    display:flex; gap:10px; justify-content:center; align-items:center;\n    padding:10px 12px calc(var(--safe-bottom) + 6px);\n    min-height:60px;\n  }\n  .actions .btn{ padding:11px 20px; font-size:15px; min-width:78px; }\n\n  /* bidding overlay */\n  .overlay{\n    position:absolute; inset:0; z-index:50; display:none;\n    align-items:center; justify-content:center; flex-direction:column;\n    background:rgba(2,16,11,.55); backdrop-filter:blur(3px); padding:24px;\n  }\n  .overlay.show{ display:flex; }\n  .ov-card{\n    background:linear-gradient(180deg,rgba(20,50,38,.96),rgba(8,28,20,.97));\n    border:1px solid rgba(241,196,90,.3); border-radius:22px; padding:24px 20px;\n    text-align:center; width:100%; max-width:320px; box-shadow:0 20px 50px rgba(0,0,0,.5);\n  }\n  .ov-card h2{ margin:0 0 6px; font-size:20px; color:var(--gold); letter-spacing:2px; }\n  .ov-card p{ margin:0 0 18px; font-size:13px; color:#bfe0d4; line-height:1.6; }\n  .bid-row{ display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }\n  .bid-row .btn{ flex:1; min-width:64px; padding:12px 0; }\n\n  /* result */\n  .result-emoji{ font-size:54px; margin-bottom:6px; }\n  .ov-card .score-line{ font-size:14px; color:#ffe9a8; margin:10px 0; }\n  .ov-card .summary-box{\n    text-align:left; font-size:12.5px; line-height:1.6; color:#d7ece2;\n    background:rgba(0,0,0,.25); border-radius:12px; padding:12px; margin:12px 0 18px;\n    max-height:120px; overflow:auto;\n  }\n\n  .toast{\n    position:absolute; left:50%; bottom:120px; transform:translateX(-50%) translateY(10px);\n    background:rgba(0,0,0,.82); color:#fff; font-size:13px; padding:9px 16px; border-radius:999px;\n    z-index:60; opacity:0; transition:opacity .2s, transform .2s; pointer-events:none; white-space:nowrap;\n  }\n  .toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }\n  .loading{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:90; color:#cfe6da; font-size:14px; }\n  @keyframes dealIn{ from{ transform:translateY(40px) scale(.6); opacity:0; } to{ transform:none; opacity:1; } }\n  .deal-anim{ animation:dealIn .35s ease both; }\n</style>\n</head>\n<body>\n<div id=\"app\">\n\n  <!-- SETUP -->\n  <section id=\"setup\" class=\"screen active\">\n    <div class=\"title-wrap\">\n      <h1>斗 地 主</h1>\n      <p>选 1~2 位 TA 来陪你打牌 · 出牌与吐槽由角色自己决定</p>\n    </div>\n    <div class=\"panel\" style=\"flex:1; display:flex; flex-direction:column; min-height:0;\">\n      <h2>选择牌友</h2>\n      <p class=\"hint\">最多选 2 位。只选 1 位时，剩下一个座位由系统牌友补上。被选中的角色会在游戏里真的开口吐槽，结束后还会记住这局。</p>\n      <div id=\"charList\" class=\"char-list\"></div>\n    </div>\n    <div class=\"start-row\">\n      <button id=\"resumeBtn\" class=\"btn ghost\" style=\"display:none;\">继续上一局</button>\n      <button id=\"startBtn\" class=\"btn\">开始游戏</button>\n    </div>\n  </section>\n\n  <!-- GAME -->\n  <section id=\"game\" class=\"screen\">\n    <div class=\"topbar\">\n      <div class=\"pill\">底分 <b id=\"baseScore\">1</b></div>\n      <div class=\"pill\">倍数 <b id=\"multi\">1</b></div>\n    </div>\n\n    <div class=\"table\" id=\"table\">\n      <div class=\"dipai\" id=\"dipai\"><div class=\"dp-label\">底牌</div></div>\n\n      <div class=\"seat top-left\" id=\"seat-2\">\n        <div class=\"av-wrap\"><div class=\"avatar\" id=\"av-2\"></div><div class=\"role-badge\" id=\"rb-2\" style=\"display:none;\"></div></div>\n        <div class=\"nm-line\" id=\"nm-2\">—</div>\n        <div class=\"count\"><span class=\"mini\"></span><span id=\"cnt-2\">17</span></div>\n      </div>\n\n      <div class=\"seat top-right\" id=\"seat-1\">\n        <div class=\"av-wrap\"><div class=\"avatar\" id=\"av-1\"></div><div class=\"role-badge\" id=\"rb-1\" style=\"display:none;\"></div></div>\n        <div class=\"nm-line\" id=\"nm-1\">—</div>\n        <div class=\"count\"><span class=\"mini\"></span><span id=\"cnt-1\">17</span></div>\n      </div>\n\n      <div class=\"center-info\" id=\"centerInfo\"><div class=\"vs\">发牌中…</div></div>\n\n      <div class=\"play-zone\" id=\"pz-2\"></div>\n      <div class=\"play-zone\" id=\"pz-1\"></div>\n      <div class=\"play-zone\" id=\"pz-0\"></div>\n\n      <div class=\"bubble left\"  id=\"bub-2\"></div>\n      <div class=\"bubble right\" id=\"bub-1\"></div>\n      <div class=\"bubble right\" id=\"bub-0\" style=\"bottom:96px; top:auto; right:14px;\"></div>\n    </div>\n\n    <div class=\"hand-area\">\n      <div class=\"my-info\">\n        <div class=\"role-badge\" id=\"rb-0\" style=\"position:static; transform:none; display:none;\"></div>\n        <span id=\"nm-0\" style=\"font-size:13px;\">你</span>\n      </div>\n      <div class=\"hand\" id=\"hand\"></div>\n    </div>\n\n    <div class=\"actions\" id=\"actions\"></div>\n\n    <!-- bidding / result overlay -->\n    <div class=\"overlay\" id=\"overlay\"><div class=\"ov-card\" id=\"ovCard\"></div></div>\n    <div class=\"toast\" id=\"toast\"></div>\n  </section>\n\n</div>\n\n<script>\n\"use strict\";\n\n/* =========================================================\n   宿主 API 安全封装（缺失时降级，避免崩溃）\n   ========================================================= */\nconst Host = (() => {\n  const A = (typeof window !== \"undefined\" && window.AiPhoneGame) ? window.AiPhoneGame : null;\n  const has = (k) => A && typeof A[k] === \"function\";\n  return {\n    available: !!A,\n    async listCharacters(){ try { return has(\"listAvailableCharacters\") ? (await A.listAvailableCharacters())||[] : []; } catch(e){ return []; } },\n    async player(){ try { return has(\"getPlayerProfile\") ? (await A.getPlayerProfile())||{} : {}; } catch(e){ return {}; } },\n    async light(id){ try { return has(\"getRoleLightPackage\") ? await A.getRoleLightPackage(id) : null; } catch(e){ return null; } },\n    async callLLM(args){ try { return has(\"callLLM\") ? await A.callLLM(args) : null; } catch(e){ return null; } },\n    async callGlobal(args){ try { return has(\"callGlobalLLM\") ? await A.callGlobalLLM(args) : null; } catch(e){ return null; } },\n    async record(args){ try { if(has(\"recordGameEvent\")) await A.recordGameEvent(args); } catch(e){} },\n    async save(s){ try { if(has(\"saveGame\")) await A.saveGame(s); } catch(e){} },\n    async load(){ try { return has(\"loadGame\") ? await A.loadGame() : null; } catch(e){ return null; } },\n    async titleBar(s){ try { if(has(\"setTitleBar\")) await A.setTitleBar(s); } catch(e){} },\n    async close(){ try { if(has(\"closeGame\")) await A.closeGame(); } catch(e){} }\n  };\n})();\n\n/* =========================================================\n   牌引擎\n   rank: 3..10=本值, J=11,Q=12,K=13,A=14,2=15, 小王=16, 大王=17\n   ========================================================= */\nconst SUITS = [\"♠\",\"♥\",\"♦\",\"♣\"];\nconst RANK_LABEL = {11:\"J\",12:\"Q\",13:\"K\",14:\"A\",15:\"2\"};\nfunction rankLabel(r){ if(r===16) return \"小王\"; if(r===17) return \"大王\"; return RANK_LABEL[r] || String(r); }\nfunction isRed(c){ if(c.rank===17) return true; if(c.rank===16) return false; return c.suit===\"♥\"||c.suit===\"♦\"; }\nlet _cid = 0;\nfunction buildDeck(){\n  const d=[];\n  for(let r=3;r<=15;r++) for(const s of SUITS) d.push({id:++_cid, rank:r, suit:s});\n  d.push({id:++_cid, rank:16, suit:null}); // 小王\n  d.push({id:++_cid, rank:17, suit:null}); // 大王\n  return d;\n}\nfunction shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }\nfunction sortHand(h){ return h.slice().sort((a,b)=> a.rank-b.rank || (SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit))); }\n\n/* ---------- 牌型 ---------- */\nfunction groupByRank(cards){ const g={}; cards.forEach(c=>{ (g[c.rank]=g[c.rank]||[]).push(c); }); return g; }\nfunction isRun(arr){ for(let i=1;i<arr.length;i++) if(arr[i]!==arr[i-1]+1) return false; return true; }\n\n// 识别玩家手动选择的牌型 → move 或 null\nfunction parseSelection(cards){\n  const n=cards.length; if(n===0) return null;\n  const g=groupByRank(cards);\n  const counts={}; for(const k in g) counts[k]=g[k].length;\n  const uniq=Object.keys(counts).map(Number).sort((a,b)=>a-b);\n\n  if(n===2 && counts[16]===1 && counts[17]===1) return mk(\"rocket\",1000,1,cards);\n  if(n===4 && uniq.length===1) return mk(\"bomb\",uniq[0],1,cards);\n  if(n===1) return mk(\"single\",uniq[0],1,cards);\n  if(n===2 && uniq.length===1) return mk(\"pair\",uniq[0],1,cards);\n  if(n===3 && uniq.length===1) return mk(\"triple\",uniq[0],1,cards);\n  if(n===4){ const t=uniq.find(r=>counts[r]===3); if(t!==undefined) return mk(\"triple_one\",t,1,cards); }\n  if(n===5){ const t=uniq.find(r=>counts[r]===3), p=uniq.find(r=>counts[r]===2); if(t!==undefined&&p!==undefined) return mk(\"triple_two\",t,1,cards); }\n  // 顺子\n  if(n>=5 && uniq.length===n && isRun(uniq) && uniq[uniq.length-1]<=14) return mk(\"straight\",uniq[0],n,cards);\n  // 连对\n  if(n>=6 && n%2===0 && uniq.length>=3 && uniq.every(r=>counts[r]===2) && isRun(uniq) && uniq[uniq.length-1]<=14)\n    return mk(\"double_straight\",uniq[0],uniq.length,cards);\n  // 飞机\n  const trips=uniq.filter(r=>counts[r]===3 && r<=14);\n  const quads=uniq.filter(r=>counts[r]===4);\n  if(trips.length>=2 && isRun(trips) && quads.length===0){\n    const k=trips.length;\n    const rest=uniq.filter(r=>!trips.includes(r));\n    const restCards=rest.reduce((s,r)=>s+counts[r],0);\n    if(restCards===0) return mk(\"airplane\",trips[0],k,cards);\n    if(restCards===k && rest.every(r=>counts[r]===1)) return mk(\"airplane_single\",trips[0],k,cards);\n    if(restCards===2*k && rest.every(r=>counts[r]===2)) return mk(\"airplane_pair\",trips[0],k,cards);\n  }\n  return null;\n}\nfunction mk(type,value,len,cards){ return {type,value,len,cards}; }\n\n// move 能否压过 last\nfunction canBeat(move,last){\n  if(!last) return true;\n  if(move.type===\"rocket\") return true;\n  if(move.type===\"bomb\"){\n    if(last.type===\"rocket\") return false;\n    if(last.type===\"bomb\") return move.value>last.value;\n    return true;\n  }\n  if(last.type===\"rocket\"||last.type===\"bomb\") return false;\n  return move.type===last.type && move.len===last.len && move.value>last.value;\n}\n\n// 生成手牌全部可出牌型（用于 AI 候选、提示、校验池）\nfunction generateAllMoves(hand){\n  const moves=[];\n  const g=groupByRank(hand);\n  const ranks=Object.keys(g).map(Number).sort((a,b)=>a-b);\n  const cnt=(r)=> g[r]? g[r].length:0;\n  const take=(r,k)=> g[r].slice(0,k);\n\n  for(const r of ranks){\n    moves.push(mk(\"single\",r,1,take(r,1)));\n    if(cnt(r)>=2) moves.push(mk(\"pair\",r,1,take(r,2)));\n    if(cnt(r)>=3) moves.push(mk(\"triple\",r,1,take(r,3)));\n    if(cnt(r)===4) moves.push(mk(\"bomb\",r,1,take(r,4)));\n  }\n  if(g[16]&&g[17]) moves.push(mk(\"rocket\",1000,1,[g[16][0],g[17][0]]));\n\n  // 三带（用 id 最低、最不破坏结构的余牌作搭子）\n  const allIds = new Set(hand.map(c=>c.id));\n  function pickKickers(usedIds, kSingles, kPairs){\n    // 返回 {ok, cards}; 优先用单张余牌，再拆对\n    const pool = hand.filter(c=>!usedIds.has(c.id));\n    const pg = groupByRank(pool);\n    const out=[];\n    // 先满足对子搭子（飞机带对）\n    if(kPairs>0){\n      const pairRanks=Object.keys(pg).map(Number).filter(r=>pg[r].length>=2).sort((a,b)=>a-b);\n      if(pairRanks.length<kPairs) return {ok:false};\n      for(let i=0;i<kPairs;i++){ out.push(pg[pairRanks[i]][0], pg[pairRanks[i]][1]); }\n    }\n    if(kSingles>0){\n      const usedNow=new Set(out.map(c=>c.id));\n      const singles=pool.filter(c=>!usedNow.has(c.id)).sort((a,b)=>a.rank-b.rank);\n      // 尽量挑“孤张”，简单起见直接挑最小的 kSingles 张\n      if(singles.length<kSingles) return {ok:false};\n      for(let i=0;i<kSingles;i++) out.push(singles[i]);\n    }\n    return {ok:true, cards:out};\n  }\n  for(const r of ranks){\n    if(cnt(r)>=3){\n      const base=take(r,3); const used=new Set(base.map(c=>c.id));\n      const k1=pickKickers(used,1,0); if(k1.ok) moves.push(mk(\"triple_one\",r,1,base.concat(k1.cards)));\n      const k2=pickKickers(used,0,1); if(k2.ok) moves.push(mk(\"triple_two\",r,1,base.concat(k2.cards)));\n    }\n  }\n\n  // 顺子\n  const present=(r)=> cnt(r)>=1;\n  for(let s=3;s<=10;s++){\n    if(!present(s)) continue;\n    let cards=[g[s][0]];\n    for(let e=s+1;e<=14;e++){\n      if(!present(e)) break;\n      cards=cards.concat([g[e][0]]);\n      if(cards.length>=5) moves.push(mk(\"straight\",s,cards.length,cards.slice()));\n    }\n  }\n  // 连对\n  for(let s=3;s<=13;s++){\n    if(cnt(s)<2) continue;\n    let cards=g[s].slice(0,2);\n    for(let e=s+1;e<=14;e++){\n      if(cnt(e)<2) break;\n      cards=cards.concat(g[e].slice(0,2));\n      const len=(e-s+1);\n      if(len>=3) moves.push(mk(\"double_straight\",s,len,cards.slice()));\n    }\n  }\n  // 飞机（纯 + 带单 + 带对）\n  for(let s=3;s<=13;s++){\n    if(cnt(s)<3) continue;\n    let tripRanks=[s];\n    let core=g[s].slice(0,3);\n    for(let e=s+1;e<=14;e++){\n      if(cnt(e)<3) break;\n      tripRanks.push(e); core=core.concat(g[e].slice(0,3));\n      const k=tripRanks.length;\n      if(k>=2){\n        const used=new Set(core.map(c=>c.id));\n        moves.push(mk(\"airplane\",s,k,core.slice()));\n        const ks=pickKickers(used,k,0); if(ks.ok) moves.push(mk(\"airplane_single\",s,k,core.concat(ks.cards)));\n        const kp=pickKickers(used,0,k); if(kp.ok) moves.push(mk(\"airplane_pair\",s,k,core.concat(kp.cards)));\n      }\n    }\n  }\n  return moves;\n}\n\n// 评估手牌强度（叫地主用）0~100\nfunction handStrength(hand){\n  const g=groupByRank(hand); let s=0;\n  if(g[17]) s+=9; if(g[16]) s+=7;\n  for(const r in g){ const c=g[r].length; if(c===4) s+=10; }\n  s += (g[15]?g[15].length*3:0);\n  s += (g[14]?g[14].length*1.5:0);\n  // 顺子潜力粗估\n  const allMoves=generateAllMoves(hand);\n  s += allMoves.filter(m=>m.type===\"straight\"&&m.len>=5).length*2;\n  return Math.min(100, Math.round(s*4));\n}\n\n/* =========================================================\n   游戏状态\n   players[0]=玩家(下) players[1]=右上 players[2]=左上\n   ========================================================= */\nconst G = {\n  players:[],          // {idx,name,avatar,isHuman,charId,pkg,npcPersona,hand,role}\n  turn:0,\n  landlord:0,\n  lastMove:null,\n  lastPlayer:0,\n  baseScore:1,\n  multiplier:1,\n  bottomCards:[],\n  phase:\"setup\",\n  over:false,\n  selectedChars:[]      // [{id,name,avatar}]\n};\nlet allChars=[];\nlet humanSelection=[];\n\n/* =========================================================\n   DOM 帮助\n   ========================================================= */\nconst $ = (id)=>document.getElementById(id);\nfunction show(scr){ document.querySelectorAll(\".screen\").forEach(s=>s.classList.remove(\"active\")); $(scr).classList.add(\"active\"); }\nfunction toast(msg){ const t=$(\"toast\"); t.textContent=msg; t.classList.add(\"show\"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove(\"show\"),1500); }\nfunction wait(ms){ return new Promise(r=>setTimeout(r,ms)); }\n\nfunction cardEl(c, sm){\n  const d=document.createElement(\"div\");\n  d.className=\"card\"+(sm?\" sm\":\"\")+(isRed(c)?\" red\":\"\");\n  if(c.rank>=16){\n    d.classList.add(\"joker\", c.rank===17?\"big\":\"small\");\n    d.innerHTML=`<div class=\"jk-corner\">JOKER</div><div class=\"mid\">${c.rank===17?\"大王\":\"小王\"}</div>`;\n  } else {\n    d.innerHTML=`<div class=\"corner\"><div class=\"r\">${rankLabel(c.rank)}</div><div class=\"s\">${c.suit}</div></div>\n                 <div class=\"mid\">${c.suit}</div>`;\n  }\n  return d;\n}\nfunction backFan(n){\n  const wrap=document.createElement(\"div\"); wrap.style.display=\"flex\"; wrap.style.justifyContent=\"center\";\n  const show=Math.min(n,3);\n  for(let i=0;i<show;i++){ const b=document.createElement(\"div\"); b.className=\"cback\"; if(i>0) b.style.marginLeft=\"-22px\"; wrap.appendChild(b); }\n  return wrap;\n}\n\n/* =========================================================\n   渲染\n   ========================================================= */\nfunction renderSeats(){\n  for(let i=0;i<3;i++){\n    const p=G.players[i];\n    if(i===0){ $(\"nm-0\").textContent=p.name; }\n    else {\n      $(\"nm-\"+i).textContent=p.name;\n      const av=$(\"av-\"+i);\n      av.innerHTML = p.avatar ? `<img src=\"${p.avatar}\" onerror=\"this.remove()\">` : (p.name?p.name[0]:\"?\");\n      $(\"cnt-\"+i).textContent=p.hand.length;\n    }\n    const rb=$(\"rb-\"+i);\n    if(p.role){ rb.style.display=\"inline-block\"; rb.className=\"role-badge \"+(p.role===\"地主\"?\"dz\":\"nm\")+(i===0?\"\":\"\"); if(i===0){rb.style.position=\"static\";rb.style.transform=\"none\";} rb.textContent=p.role; }\n  }\n}\nfunction renderTurn(){\n  for(let i=1;i<3;i++) $(\"av-\"+i).classList.toggle(\"turn\", G.turn===i && !G.over);\n}\nfunction renderCounts(){ for(let i=1;i<3;i++) $(\"cnt-\"+i).textContent=G.players[i].hand.length; }\n\nfunction renderHand(){\n  const hand=$(\"hand\"); hand.innerHTML=\"\";\n  const cards=sortHand(G.players[0].hand);\n  G.players[0].hand=cards;\n  cards.forEach(c=>{\n    const el=cardEl(c,false);\n    el.dataset.id=c.id;\n    if(selected.has(c.id)) el.classList.add(\"up\");\n    el.addEventListener(\"click\",()=>toggleCard(c.id,el));\n    hand.appendChild(el);\n  });\n  // 重叠间距按屏宽自适应，保证所有牌都在一屏内、不被裁切\n  const n=cards.length;\n  const cardW=46;\n  const containerW=(hand.clientWidth || (document.body.clientWidth-28)) - 4;\n  let step=30; // 每张牌露出的宽度\n  if(n>1){ step=Math.min(30, (containerW-cardW)/(n-1)); }\n  const ml=Math.round(step-cardW);\n  hand.querySelectorAll(\".card\").forEach((el,i)=>{ el.style.marginLeft = i===0?\"0\":ml+\"px\"; });\n}\n\nfunction renderPlay(idx, move){\n  const pz=$(\"pz-\"+idx); pz.innerHTML=\"\";\n  if(!move){ return; }\n  if(move.type===\"pass\"){ pz.innerHTML=`<div class=\"pz-pass\">不出</div>`; return; }\n  const cards = sortHand(move.cards);\n  cards.forEach((c,i)=>{ const el=cardEl(c,true); el.classList.add(\"deal-anim\"); el.style.animationDelay=(i*0.03)+\"s\"; if(i>0) el.style.marginLeft=\"-16px\"; pz.appendChild(el); });\n}\nfunction clearPlays(){ [\"pz-0\",\"pz-1\",\"pz-2\"].forEach(id=>$(id).innerHTML=\"\"); }\n\nfunction renderHud(){ $(\"baseScore\").textContent=G.baseScore; $(\"multi\").textContent=G.multiplier; }\n\n/* 气泡 */\nconst bubbleTimers={};\nfunction bubble(idx, html, sticky){\n  const b=$(\"bub-\"+idx); b.innerHTML=html; b.classList.add(\"show\");\n  clearTimeout(bubbleTimers[idx]);\n  if(!sticky) bubbleTimers[idx]=setTimeout(()=>b.classList.remove(\"show\"), 3200);\n}\nfunction hideBubble(idx){ clearTimeout(bubbleTimers[idx]); $(\"bub-\"+idx).classList.remove(\"show\"); }\nfunction thinking(idx){ bubble(idx,`<span class=\"think\"><i></i><i></i><i></i></span>`, true); }\n\n/* =========================================================\n   选牌（玩家）\n   ========================================================= */\nlet selected=new Set();\nfunction toggleCard(id, el){\n  if(G.turn!==0 || G.over || G.phase!==\"playing\") return;\n  if(selected.has(id)){ selected.delete(id); el.classList.remove(\"up\"); }\n  else { selected.add(id); el.classList.add(\"up\"); }\n  clearHints();\n}\nfunction selectedCards(){ return G.players[0].hand.filter(c=>selected.has(c.id)); }\nfunction clearSelection(){ selected.clear(); $(\"hand\").querySelectorAll(\".card.up\").forEach(e=>e.classList.remove(\"up\")); }\n\n/* 提示 */\nlet hintList=[], hintIdx=0;\nfunction clearHints(){ $(\"hand\").querySelectorAll(\".hintable\").forEach(e=>e.classList.remove(\"hintable\")); }\nfunction doHint(){\n  clearHints();\n  const hand=G.players[0].hand;\n  const leading = G.lastPlayer===0 || !G.lastMove;\n  let opts = generateAllMoves(hand);\n  if(!leading) opts = opts.filter(m=>canBeat(m,G.lastMove));\n  if(opts.length===0){ toast(leading?\"没有可出的牌\":\"要不起，点【不出】\"); return; }\n  // 排序：小到大，炸弹火箭往后\n  opts.sort((a,b)=> rankCat(a)-rankCat(b) || a.len-b.len || a.value-b.value );\n  hintList=opts; hintIdx=hintIdx%opts.length;\n  const m=hintList[hintIdx]; hintIdx=(hintIdx+1)%hintList.length;\n  selected=new Set(m.cards.map(c=>c.id));\n  renderHand();\n  $(\"hand\").querySelectorAll(\".card\").forEach(e=>{ if(selected.has(+e.dataset.id)) e.classList.add(\"hintable\"); });\n}\nfunction rankCat(m){ if(m.type===\"rocket\")return 9; if(m.type===\"bomb\")return 8; return 0; }\n\n/* =========================================================\n   动作按钮\n   ========================================================= */\nfunction renderActions(){\n  const a=$(\"actions\"); a.innerHTML=\"\";\n  if(G.over || G.phase!==\"playing\"){ return; }\n  if(G.turn!==0){ a.innerHTML=`<div style=\"color:#bfe0d4;font-size:13px;\">等待 ${G.players[G.turn].name} 出牌…</div>`; return; }\n  const leading = G.lastPlayer===0 || !G.lastMove;\n  const passBtn=mkBtn(\"不出\",\"ghost\",onPass); passBtn.disabled=leading;\n  const hintBtn=mkBtn(\"提示\",\"ghost\",doHint);\n  const playBtn=mkBtn(\"出牌\",\"\",onPlay);\n  a.appendChild(passBtn); a.appendChild(hintBtn); a.appendChild(playBtn);\n}\nfunction mkBtn(text,cls,fn){ const b=document.createElement(\"button\"); b.className=\"btn\"+(cls?\" \"+cls:\"\"); b.textContent=text; b.addEventListener(\"click\",fn); return b; }\n\nfunction onPass(){\n  if(G.lastPlayer===0 || !G.lastMove){ toast(\"你是先手，必须出牌\"); return; }\n  clearSelection(); clearHints();\n  applyMove(0,{type:\"pass\"});\n}\nfunction onPlay(){\n  const sel=selectedCards();\n  if(sel.length===0){ toast(\"先选牌\"); return; }\n  const move=parseSelection(sel);\n  if(!move){ toast(\"不是有效牌型\"); shakeHand(); return; }\n  const leading = G.lastPlayer===0 || !G.lastMove;\n  if(!leading && !canBeat(move,G.lastMove)){ toast(\"压不过上家\"); shakeHand(); return; }\n  clearHints();\n  applyMove(0,move);\n}\nfunction shakeHand(){ const h=$(\"hand\"); h.animate([{transform:\"translateX(0)\"},{transform:\"translateX(-6px)\"},{transform:\"translateX(6px)\"},{transform:\"translateX(0)\"}],{duration:240}); }\n\n/* =========================================================\n   核心：执行一手\n   ========================================================= */\nasync function applyMove(idx, move){\n  const p=G.players[idx];\n  if(move.type===\"pass\"){\n    renderPlay(idx,{type:\"pass\"});\n    bubble(idx, p.isHuman ? \"不出~\" : (p._lastSay||\"过\"));\n  } else {\n    // 从手牌移除\n    const ids=new Set(move.cards.map(c=>c.id));\n    p.hand=p.hand.filter(c=>!ids.has(c.id));\n    // 清掉其它桌面（新一轮压牌可视化）\n    if(G.lastPlayer===idx || !G.lastMove){ clearPlays(); }\n    renderPlay(idx,move);\n    G.lastMove=move; G.lastPlayer=idx;\n    if(move.type===\"bomb\"||move.type===\"rocket\"){ G.multiplier*=2; renderHud(); toast(move.type===\"rocket\"?\"火箭！双倍！\":\"炸弹！双倍！\"); }\n    if(p._lastSay) bubble(idx,p._lastSay); else if(p.isHuman) hideBubble(0);\n  }\n  if(idx===0) clearSelection();\n  renderHand(); renderCounts();\n\n  // 胜负\n  if(p.hand.length===0){ return endGame(idx); }\n\n  await Host.save(serialize());\n  await wait(600);\n  G.turn=(G.turn+1)%3;\n  renderTurn(); renderActions();\n  await stepLoop();\n}\n\nasync function stepLoop(){\n  while(!G.over){\n    const p=G.players[G.turn];\n    // 轮回到上次出牌者 → 新一轮，自己先手\n    if(G.lastPlayer===G.turn) { G.lastMove=null; }\n    if(p.isHuman){ renderActions(); $(\"centerInfo\").innerHTML=`<div class=\"vs\">轮到你出牌</div>`; return; }\n    $(\"centerInfo\").innerHTML=`<div class=\"vs\">${p.name} 思考中…</div>`;\n    await aiTurn(p);\n    if(G.over) return;\n    await wait(550);\n    G.turn=(G.turn+1)%3; renderTurn();\n  }\n}\n\n/* =========================================================\n   AI 出牌：让角色自己挑 + 吐槽\n   ========================================================= */\nfunction moveDesc(m){\n  if(m.type===\"pass\") return \"不出\";\n  const names={single:\"单\",pair:\"对\",triple:\"三张\",triple_one:\"三带一\",triple_two:\"三带二\",straight:\"顺子\",double_straight:\"连对\",airplane:\"飞机\",airplane_single:\"飞机带单\",airplane_pair:\"飞机带对\",bomb:\"炸弹\",rocket:\"王炸\"};\n  const cs=sortHand(m.cards).map(c=>rankLabel(c.rank)).join(\" \");\n  return `${names[m.type]||m.type}[${cs}]`;\n}\nfunction curateOptions(opts, leading){\n  // 去重 + 控制数量（省 token），保留多样性\n  const seen=new Set(); const out=[];\n  opts.sort((a,b)=> rankCat(a)-rankCat(b) || typeOrder(a)-typeOrder(b) || a.len-b.len || a.value-b.value);\n  for(const m of opts){\n    const key=m.type+\"|\"+m.len+\"|\"+m.value;\n    if(seen.has(key)) continue; seen.add(key); out.push(m);\n  }\n  // 每个 type 最多保留几项，避免顺子刷屏\n  const byType={}; const limited=[];\n  for(const m of out){ byType[m.type]=(byType[m.type]||0)+1; if(byType[m.type]<=4) limited.push(m); }\n  return limited.slice(0,14);\n}\nfunction typeOrder(m){ const o={single:0,pair:1,triple:2,triple_one:3,triple_two:4,straight:5,double_straight:6,airplane:7,airplane_single:8,airplane_pair:9,bomb:10,rocket:11}; return o[m.type]??5; }\n\nfunction fallbackMove(opts, leading, handLen){\n  if(opts.length===0) return leading?null:{type:\"pass\"};\n  const nonBig=opts.filter(m=>m.type!==\"bomb\"&&m.type!==\"rocket\");\n  nonBig.sort((a,b)=> a.value-b.value || a.len-b.len);\n  if(leading){ return (nonBig[0]||opts[0]); }\n  // 跟牌：手里牌多时用最小的能压的；牌很少或对方要赢时考虑炸\n  if(nonBig.length) return nonBig[0];\n  return Math.random()<0.5 ? opts[0] : {type:\"pass\"};\n}\n\nasync function aiTurn(p){\n  const leading = G.lastPlayer===p.idx || !G.lastMove;\n  let opts = generateAllMoves(p.hand);\n  if(!leading) opts = opts.filter(m=>canBeat(m,G.lastMove));\n  const options = curateOptions(opts, leading);\n\n  thinking(p.idx);\n\n  const human=G.players[0];\n  const others=G.players.filter(x=>x.idx!==p.idx).map(x=>`${x.name}(${x.role}，剩${x.hand.length}张)`).join(\"、\");\n  const optLines = options.map((m,i)=>`${i+1}. ${moveDesc(m)}`).join(\"\\n\");\n  const passLine = leading ? \"\" : \"0. 不出/过\\n\";\n  const lastStr = (leading||!G.lastMove) ? \"你是先手，可任意出牌。\" : `上一手是 ${G.players[G.lastPlayer].name} 打出的 ${moveDesc(G.lastMove)}，你要压过它或不出。`;\n  const myHand = sortHand(p.hand).map(c=>rankLabel(c.rank)).join(\" \");\n\n  const rule =\n`【斗地主对局】你是「${p.name}」，身份：${p.role}。和你同桌的还有：${others}。\n现在轮到你出牌。请保持你的人物性格，先用一句很短的口语吐槽/评论当前牌局（8~26字，符合你平时说话的语气，可以损人、可以得意、可以装弱），再选一个出牌编号。\n策略提示：地主要尽快走完手牌；两个农民要配合夹击地主，别压自己队友。手牌少的人优先出小牌跑牌；该留炸弹/王炸时别乱炸。\n你的手牌（${p.hand.length}张）：${myHand}\n${lastStr}\n可选出牌：\n${passLine}${optLines}\n只输出 JSON，不要任何多余文字、不要解释、不要代码块：\n{\"choice\": <编号数字>, \"say\": \"<一句吐槽>\"}`;\n\n  let raw=null;\n  if(p.charId && p.pkg){\n    const res=await Host.callLLM({ characterId:p.charId, messages:[...(p.pkg.messages||[]), {role:\"system\",content:rule}, {role:\"user\",content:\"请按规则出牌并吐槽。\"}] });\n    raw=res&&res.content;\n  } else {\n    const persona = p.npcPersona || \"一个爱开玩笑的牌友\";\n    const res=await Host.callGlobal({ messages:[\n      {role:\"system\",content:`你是这个斗地主小游戏里的一位系统牌友，名字叫「${p.name}」，性格：${persona}。你不是真实角色，只是临时陪玩的 NPC。${rule}`},\n      {role:\"user\",content:\"请按规则出牌并吐槽。\"}\n    ]});\n    raw=res&&res.content;\n  }\n\n  hideBubble(p.idx);\n\n  let choice=null, say=\"\";\n  if(raw){\n    try{\n      const j=JSON.parse(String(raw).replace(/```json|```/g,\"\").trim().replace(/^[^{]*/,\"\").replace(/[^}]*$/,\"\"));\n      choice=j.choice; say=(j.say||\"\").toString().slice(0,40);\n    }catch(e){ /* 解析失败走兜底 */ }\n  }\n\n  let move;\n  if(choice===0 && !leading){ move={type:\"pass\"}; }\n  else if(typeof choice===\"number\" && options[choice-1]){ move=options[choice-1]; }\n  else { move=fallbackMove(options, leading, p.hand.length); }\n  if(!move){ move=leading? (options[0]||null) : {type:\"pass\"}; }\n  if(!move){ move={type:\"pass\"}; }\n\n  p._lastSay = say || (move.type===\"pass\" ? randPass() : \"\");\n  await applyMoveAI(p.idx, move, say);\n}\nfunction randPass(){ const a=[\"这把我先看看\",\"压不过啊…\",\"过过过\",\"你们打吧\",\"留着炸你们\"]; return a[Math.floor(Math.random()*a.length)]; }\n\n// AI 版 applyMove（不递归 stepLoop，由外层循环推进）\nasync function applyMoveAI(idx, move, say){\n  const p=G.players[idx];\n  if(move.type===\"pass\"){\n    renderPlay(idx,{type:\"pass\"});\n    if(say) bubble(idx,say); else bubble(idx,randPass());\n  } else {\n    const ids=new Set(move.cards.map(c=>c.id));\n    p.hand=p.hand.filter(c=>!ids.has(c.id));\n    if(G.lastPlayer===idx || !G.lastMove){ clearPlays(); }\n    renderPlay(idx,move);\n    G.lastMove=move; G.lastPlayer=idx;\n    if(move.type===\"bomb\"||move.type===\"rocket\"){ G.multiplier*=2; renderHud(); }\n    if(say) bubble(idx,say);\n  }\n  renderCounts();\n  await Host.save(serialize());\n  if(p.hand.length===0){ await endGame(idx); }\n}\n\n/* =========================================================\n   叫地主\n   ========================================================= */\nasync function biddingPhase(){\n  G.phase=\"bidding\";\n  // 计算强度\n  G.players.forEach(p=>{ p._str=handStrength(p.hand); });\n  // 随机首叫\n  const first=Math.floor(Math.random()*3);\n  let bestBid=0, bestPlayer=-1;\n  const order=[0,1,2].map(i=>(first+i)%3);\n\n  for(const i of order){\n    const p=G.players[i];\n    if(p.isHuman){\n      const bid=await humanBid(bestBid);\n      if(bid>bestBid){ bestBid=bid; bestPlayer=i; }\n    } else {\n      // 启发式：强度→分数\n      const str=p._str; let bid=0;\n      if(str>=78) bid=3; else if(str>=58) bid=2; else if(str>=38) bid=1; else bid=0;\n      if(bid<=bestBid) bid = (str>=70 && bestBid<3) ? bestBid+1 : 0; // 抢一下\n      if(bid>3) bid=3;\n      $(\"centerInfo\").innerHTML=`<div class=\"vs\">${p.name}：${bid>0?(\"叫 \"+bid+\" 分\"):\"不叫\"}</div>`;\n      if(bid>0) bubble(i, bid>=3?\"我当地主！\":\"我叫\"+bid+\"分\");\n      else bubble(i,\"不叫，你们来\");\n      await wait(900);\n      if(bid>bestBid){ bestBid=bid; bestPlayer=i; }\n    }\n  }\n  if(bestPlayer<0){ // 都不叫 → 强度最高者当地主\n    bestPlayer=[0,1,2].sort((a,b)=>G.players[b]._str-G.players[a]._str)[0];\n    bestBid=1;\n  }\n  G.landlord=bestPlayer; G.baseScore=Math.max(1,bestBid);\n  // 发底牌\n  G.players[G.landlord].hand=G.players[G.landlord].hand.concat(G.bottomCards);\n  G.players.forEach((p,i)=> p.role = (i===G.landlord?\"地主\":\"农民\"));\n  G.turn=G.landlord; G.lastPlayer=G.landlord; G.lastMove=null;\n  G.phase=\"playing\";\n\n  // 揭示底牌\n  const dp=$(\"dipai\"); dp.querySelectorAll(\".card\").forEach(e=>e.remove());\n  G.bottomCards.forEach((c,i)=>{ const el=cardEl(c,true); el.classList.add(\"deal-anim\"); el.style.animationDelay=(i*0.1)+\"s\"; dp.appendChild(el); });\n\n  renderSeats(); renderHand(); renderHud(); renderTurn();\n  const ll=G.players[G.landlord];\n  $(\"centerInfo\").innerHTML=`<div class=\"vs\">${ll.name} 是地主！</div>`;\n  await Host.save(serialize());\n  await wait(1100);\n  await stepLoop();\n}\n\nfunction humanBid(currentBest){\n  return new Promise(resolve=>{\n    const ov=$(\"overlay\"), card=$(\"ovCard\");\n    card.innerHTML=`<h2>叫地主</h2><p>看看你的手牌，要不要争地主？${currentBest>0?(\"当前最高 \"+currentBest+\" 分\"):\"\"}</p>\n      <div class=\"bid-row\" id=\"bidRow\"></div>`;\n    const row=card.querySelector(\"#bidRow\");\n    const opts=[{t:\"不叫\",v:0,c:\"ghost\"},{t:\"1分\",v:1},{t:\"2分\",v:2},{t:\"3分\",v:3}];\n    opts.forEach(o=>{\n      const b=mkBtn(o.t,o.c||\"\",()=>{ ov.classList.remove(\"show\"); resolve(o.v); });\n      if(o.v>0 && o.v<=currentBest) b.disabled=true;\n      row.appendChild(b);\n    });\n    ov.classList.add(\"show\");\n  });\n}\n\n/* =========================================================\n   结算\n   ========================================================= */\nasync function endGame(winnerIdx){\n  if(G.over) return; G.over=true; G.phase=\"over\";\n  renderTurn(); $(\"actions\").innerHTML=\"\";\n  const winner=G.players[winnerIdx];\n  const landlordWon = winnerIdx===G.landlord;\n  const human=G.players[0];\n  const humanIsLandlord = G.landlord===0;\n  const humanWon = landlordWon ? humanIsLandlord : !humanIsLandlord;\n  const finalScore=G.baseScore*G.multiplier;\n\n  // 结束吐槽（赢家或地主说一句）\n  const speaker = G.players.find(p=>p.idx===winnerIdx) ;\n  let closing=\"\";\n  try{\n    if(speaker && speaker.charId && speaker.pkg){\n      const r=await Host.callLLM({characterId:speaker.charId, messages:[...(speaker.pkg.messages||[]),\n        {role:\"system\",content:`斗地主刚刚结束，${landlordWon?\"地主赢了\":\"农民赢了\"}，你是赢家「${speaker.name}」。用你的人物语气说一句很短的胜利/收尾的话（10~30字），对${human.name}说。只输出这句话。`},\n        {role:\"user\",content:\"说一句收尾的话。\"}]});\n      closing=(r&&r.content)?String(r.content).slice(0,50):\"\";\n    }\n  }catch(e){}\n\n  // 写入记忆（只写真实角色，使用真实名字）——一局只写一次\n  const realChars=G.players.filter(p=>p.charId);\n  if(realChars.length){\n    const charIds=realChars.map(p=>p.charId);\n    const names=realChars.map(p=>`${p.name}(${p.role})`).join(\"、\");\n    const resultText = humanWon\n      ? `${human.name}赢了，${realChars.filter(p=>p.role!==(humanIsLandlord?\"地主\":\"农民\")||p.role!==human.role).map(p=>p.name).join(\"、\")}这边没跑掉。`\n      : `${human.name}输了。`;\n    const sideText = landlordWon ? \"地主胜\" : \"农民胜\";\n    const summary = `${human.name}和${names}玩了一局斗地主，${human.name}当${humanIsLandlord?\"地主\":\"农民\"}，最后${sideText}（底分${G.baseScore}×倍数${G.multiplier}=${finalScore}分）。${realChars.map(p=>`${p.name}打牌时${p.role===\"地主\"?\"独挑大梁\":\"配合默契\"}`).join(\"，\")}。${humanWon?`${human.name}赢得很开心`:`${human.name}有点不服气，说下次再战`}。`;\n    await Host.record({ characterIds:charIds, summary });\n  }\n\n  // 结算面板\n  const ov=$(\"overlay\"), card=$(\"ovCard\");\n  const emoji = humanWon ? \"🎉\" : \"😵\";\n  const title = humanWon ? \"你赢了！\" : \"你输了…\";\n  card.innerHTML=`\n    <div class=\"result-emoji\">${emoji}</div>\n    <h2>${title}</h2>\n    <p>${landlordWon?\"地主\":\"农民\"}方获胜 · 底分 ${G.baseScore} × 倍数 ${G.multiplier}</p>\n    <div class=\"score-line\">本局结算：${humanWon?\"+\":\"-\"}${finalScore} 分</div>\n    ${closing?`<div class=\"summary-box\">「${speaker.name}」：${closing}</div>`:\"\"}\n    <div class=\"start-row\" style=\"margin-top:6px;\">\n      <button class=\"btn ghost\" id=\"quitBtn\">退出</button>\n      <button class=\"btn\" id=\"againBtn\">再来一局</button>\n    </div>`;\n  card.querySelector(\"#againBtn\").addEventListener(\"click\", ()=>{ ov.classList.remove(\"show\"); restart(); });\n  card.querySelector(\"#quitBtn\").addEventListener(\"click\", ()=> Host.close());\n  ov.classList.add(\"show\");\n  await Host.save(null); // 清存档\n}\n\n/* =========================================================\n   开局 / 发牌\n   ========================================================= */\nconst NPC_POOL=[\n  {name:\"老张\",persona:\"东北大哥，话痨，爱吹牛但牌品还行\"},\n  {name:\"小雨\",persona:\"软萌但贼精，喜欢卖惨然后偷偷憋大牌\"},\n  {name:\"K哥\",persona:\"沉默冷酷型，开口就是阴阳怪气\"},\n  {name:\"豆豆\",persona:\"急性子，输不起，爱嚷嚷\"},\n];\n\nasync function setupNewGame(){\n  $(\"centerInfo\").innerHTML=`<div class=\"vs\">发牌中…</div>`;\n  clearPlays(); $(\"dipai\").querySelectorAll(\".card\").forEach(e=>e.remove());\n  selected.clear(); hintList=[]; hintIdx=0;\n  G.over=false; G.multiplier=1; G.baseScore=1; G.lastMove=null;\n\n  const player=await Host.player();\n  const myName=(player && player.name) ? player.name : \"你\";\n\n  // 组装三个座位\n  const seats=[{idx:0,name:myName,isHuman:true}];\n  const chosen=G.selectedChars.slice(0,2);\n  // 座位 1、2\n  let seatNames=[1,2];\n  for(let s=0;s<2;s++){\n    const ch=chosen[s];\n    if(ch){\n      seats.push({idx:seatNames[s], name:ch.name, avatar:ch.avatar, isHuman:false, charId:ch.id, pkg:null});\n    } else {\n      const used=new Set(seats.map(x=>x.name));\n      const npc=NPC_POOL.filter(n=>!used.has(n.name))[Math.floor(Math.random()*Math.max(1,NPC_POOL.length-seats.length+1))]||NPC_POOL[0];\n      seats.push({idx:seatNames[s], name:npc.name, isHuman:false, charId:null, npcPersona:npc.persona});\n    }\n  }\n  // 让座位按 idx 排\n  seats.sort((a,b)=>a.idx-b.idx);\n  G.players=seats.map(s=>({...s, hand:[], role:null, _lastSay:\"\"}));\n\n  // 预取角色轻量包\n  $(\"centerInfo\").innerHTML=`<div class=\"vs\">准备角色中…</div>`;\n  for(const p of G.players){ if(p.charId){ p.pkg=await Host.light(p.charId); } }\n\n  // 发牌\n  const deck=shuffle(buildDeck());\n  G.players[0].hand=deck.slice(0,17);\n  G.players[1].hand=deck.slice(17,34);\n  G.players[2].hand=deck.slice(34,51);\n  G.bottomCards=deck.slice(51,54);\n\n  // 底牌占位（背面）\n  const dp=$(\"dipai\"); dp.querySelectorAll(\".card\").forEach(e=>e.remove());\n  for(let i=0;i<3;i++){ const b=document.createElement(\"div\"); b.className=\"cback\"; b.style.width=\"34px\"; b.style.height=\"48px\"; if(i>0) b.style.marginLeft=\"-10px\"; dp.appendChild(b); }\n\n  renderSeats(); renderHand(); renderHud();\n  show(\"game\");\n  await Host.titleBar({ material:\"glass\", buttonBackground:\"rgba(8,40,28,.6)\", buttonColor:\"#f1c45a\", buttonBorderColor:\"rgba(241,196,90,.35)\", buttonRadius:\"999px\", buttonShadow:\"0 8px 20px rgba(0,0,0,.3)\", iconOpacity:1 });\n  await wait(400);\n  await biddingPhase();\n}\nfunction restart(){ setupNewGame(); }\n\n/* =========================================================\n   存档（best-effort）\n   ========================================================= */\nfunction serialize(){\n  if(G.phase!==\"playing\") return null;\n  return {\n    v:1, phase:G.phase, turn:G.turn, landlord:G.landlord,\n    baseScore:G.baseScore, multiplier:G.multiplier,\n    lastPlayer:G.lastPlayer, lastMove:G.lastMove,\n    bottomCards:G.bottomCards,\n    players:G.players.map(p=>({idx:p.idx,name:p.name,avatar:p.avatar||null,isHuman:p.isHuman,charId:p.charId||null,npcPersona:p.npcPersona||null,hand:p.hand,role:p.role}))\n  };\n}\nasync function tryResume(save){\n  try{\n    G.phase=\"playing\"; G.turn=save.turn; G.landlord=save.landlord;\n    G.baseScore=save.baseScore; G.multiplier=save.multiplier;\n    G.lastPlayer=save.lastPlayer; G.lastMove=save.lastMove; G.bottomCards=save.bottomCards||[];\n    G.over=false;\n    G.players=save.players.map(p=>({...p, pkg:null, _lastSay:\"\"}));\n    for(const p of G.players){ if(p.charId){ p.pkg=await Host.light(p.charId); } }\n    show(\"game\");\n    await Host.titleBar({ material:\"glass\", buttonBackground:\"rgba(8,40,28,.6)\", buttonColor:\"#f1c45a\", buttonBorderColor:\"rgba(241,196,90,.35)\", buttonRadius:\"999px\", iconOpacity:1 });\n    // 底牌显示\n    const dp=$(\"dipai\"); dp.querySelectorAll(\".card\").forEach(e=>e.remove());\n    G.bottomCards.forEach(c=>{ dp.appendChild(cardEl(c,true)); });\n    renderSeats(); renderHand(); renderHud(); renderTurn(); clearPlays();\n    await wait(300);\n    await stepLoop();\n  }catch(e){ setupNewGame(); }\n}\n\n/* =========================================================\n   角色选择界面\n   ========================================================= */\nfunction renderCharList(){\n  const box=$(\"charList\"); box.innerHTML=\"\";\n  if(!allChars.length){\n    box.innerHTML=`<div class=\"empty-note\">没有读到可选角色。<br>没关系，直接开始也行，系统会安排两位牌友陪你打。</div>`;\n    return;\n  }\n  allChars.forEach(ch=>{\n    const sel=humanSelection.some(x=>x.id===ch.id);\n    const d=document.createElement(\"div\");\n    d.className=\"char-card\"+(sel?\" sel\":\"\");\n    d.innerHTML=`<div class=\"avatar\">${ch.avatar?`<img src=\"${ch.avatar}\" style=\"width:100%;height:100%;object-fit:cover;border-radius:50%;\" onerror=\"this.remove()\">`:(ch.name?ch.name[0]:\"?\")}</div>\n      <div class=\"meta\"><div class=\"nm\">${ch.name||\"未命名\"}</div><div class=\"sub\">${ch.subtitle||\"\"}</div></div>\n      <div class=\"tick\">${sel?\"✓\":\"\"}</div>`;\n    d.addEventListener(\"click\",()=>toggleChar(ch));\n    box.appendChild(d);\n  });\n}\nfunction toggleChar(ch){\n  const i=humanSelection.findIndex(x=>x.id===ch.id);\n  if(i>=0) humanSelection.splice(i,1);\n  else { if(humanSelection.length>=2){ toast(\"最多选 2 位哦\"); return; } humanSelection.push(ch); }\n  renderCharList();\n}\n\n/* =========================================================\n   启动\n   ========================================================= */\nasync function init(){\n  allChars = await Host.listCharacters();\n  renderCharList();\n  // 检查存档\n  const save=await Host.load();\n  if(save && save.phase===\"playing\"){ $(\"resumeBtn\").style.display=\"block\"; $(\"resumeBtn\").addEventListener(\"click\",()=>tryResume(save)); }\n\n  $(\"startBtn\").addEventListener(\"click\", async ()=>{\n    G.selectedChars=humanSelection.slice(0,2);\n    $(\"startBtn\").disabled=true; $(\"startBtn\").textContent=\"发牌中…\";\n    await setupNewGame();\n    $(\"startBtn\").disabled=false; $(\"startBtn\").textContent=\"开始游戏\";\n  });\n}\ninit();\n</script>\n</body>\n</html>";

export const TRUTH_OR_DARE_GAME_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
<title>真心话大冒险</title>
<style>
  :root{
    --safe-top: var(--ai-phone-game-safe-top, 88px);
    --safe-bottom: var(--ai-phone-game-safe-bottom, 24px);
    --bg0:#160d20; --bg1:#241133; --bg2:#3a1942;
    --ink:#f5ecf7; --muted:#c4b2d6; --faint:rgba(245,236,247,.55);
    --amber:#ffc16b; --rose:#ff8fae; --violet:#b98cff;
    --glass:rgba(255,255,255,.06);
    --glass-strong:rgba(255,255,255,.1);
    --line:rgba(255,255,255,.12);
    --serif:"Songti SC","Noto Serif SC","STSong",serif;
    --sans:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{width:100%;height:100%;margin:0;}
  body{
    overflow:hidden;
    font-family:var(--sans);
    color:var(--ink);
    background:
      radial-gradient(120% 80% at 50% -10%, #4a1f55 0%, rgba(74,31,85,0) 55%),
      radial-gradient(90% 60% at 80% 110%, #5a2546 0%, rgba(90,37,70,0) 60%),
      linear-gradient(160deg, var(--bg0), var(--bg1) 60%, var(--bg2));
  }
  /* 烛光浮尘 */
  body::after{
    content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
    background:
      radial-gradient(2px 2px at 20% 30%, rgba(255,193,107,.5), transparent),
      radial-gradient(2px 2px at 70% 60%, rgba(255,143,174,.4), transparent),
      radial-gradient(1.5px 1.5px at 40% 80%, rgba(185,140,255,.4), transparent),
      radial-gradient(1.5px 1.5px at 85% 25%, rgba(255,255,255,.35), transparent);
    opacity:.7;
  }

  .game-screen{
    position:relative;z-index:1;
    min-height:100%;height:100%;
    box-sizing:border-box;
    padding:var(--safe-top) 18px var(--safe-bottom);
    overflow-y:auto;-webkit-overflow-scrolling:touch;
    display:flex;flex-direction:column;
  }

  /* ---------- 通用 ---------- */
  .title{font-family:var(--serif);font-weight:600;letter-spacing:.08em;}
  .btn{
    border:1px solid var(--line);border-radius:999px;
    padding:13px 22px;font-size:15px;font-weight:600;color:var(--ink);
    background:var(--glass-strong);backdrop-filter:blur(12px);
    transition:transform .15s ease, background .2s, opacity .2s;
    cursor:pointer;user-select:none;
  }
  .btn:active{transform:scale(.96);}
  .btn.primary{
    border:none;color:#2a1230;
    background:linear-gradient(135deg, var(--amber), var(--rose));
    box-shadow:0 10px 30px rgba(255,143,174,.3);
  }
  .btn.ghost{background:transparent;}
  .btn[disabled]{opacity:.35;pointer-events:none;}
  .fade{animation:fade .5s ease both;}
  @keyframes fade{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
  .hidden{display:none !important;}

  /* ---------- 选人页 ---------- */
  #screen-select{flex:1;display:flex;flex-direction:column;}
  .head{text-align:center;margin:6px 0 18px;}
  .head h1{font-size:30px;margin:0;}
  .head .sub{color:var(--faint);font-size:13px;margin-top:8px;letter-spacing:.12em;}
  .pick-hint{text-align:center;color:var(--muted);font-size:13px;margin-bottom:12px;}
  .char-list{display:flex;flex-direction:column;gap:12px;overflow-y:auto;flex:1;padding-bottom:6px;}
  .char-card{
    display:flex;align-items:center;gap:14px;padding:12px 14px;
    border:1px solid var(--line);border-radius:18px;background:var(--glass);
    transition:transform .15s, border-color .2s, background .2s;cursor:pointer;
  }
  .char-card:active{transform:scale(.98);}
  .char-card.sel{border-color:var(--rose);background:rgba(255,143,174,.12);
    box-shadow:0 0 0 1px var(--rose) inset, 0 8px 24px rgba(255,143,174,.18);}
  .avatar{
    width:52px;height:52px;border-radius:50%;flex:none;overflow:hidden;
    display:grid;place-items:center;font-family:var(--serif);font-size:20px;color:#2a1230;
    background:linear-gradient(135deg,var(--amber),var(--violet));
    box-shadow:0 4px 14px rgba(0,0,0,.3);
  }
  .avatar img{width:100%;height:100%;object-fit:cover;display:block;}
  .char-meta{flex:1;min-width:0;}
  .char-meta .nm{font-weight:600;font-size:16px;}
  .char-meta .st{color:var(--faint);font-size:12px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .check{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line);flex:none;display:grid;place-items:center;color:#2a1230;font-size:14px;}
  .char-card.sel .check{background:var(--rose);border-color:var(--rose);}
  .footer{padding-top:14px;}
  .footer .btn{width:100%;}

  /* ---------- 牌桌 ---------- */
  #screen-table{flex:1;display:flex;flex-direction:column;}
  .round-tag{text-align:center;color:var(--muted);font-size:12px;letter-spacing:.2em;margin-bottom:6px;}
  .stage{position:relative;width:min(80vw,330px);aspect-ratio:1;margin:6px auto 4px;}
  .table-ring{
    position:absolute;inset:8%;border-radius:50%;
    border:1px solid var(--line);
    background:radial-gradient(circle at 50% 40%, rgba(255,193,107,.10), rgba(0,0,0,.25) 70%);
    box-shadow:inset 0 0 50px rgba(0,0,0,.4);
  }
  .glow{
    position:absolute;left:50%;top:50%;width:46%;height:46%;
    transform:translate(-50%,-50%);border-radius:50%;
    background:radial-gradient(circle, rgba(255,160,120,.35), transparent 70%);
    filter:blur(6px);animation:breathe 3.6s ease-in-out infinite;
  }
  @keyframes breathe{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(.9);}50%{opacity:.9;transform:translate(-50%,-50%) scale(1.05);}}
  .bottle-wrap{
    position:absolute;left:50%;top:50%;width:18%;height:54%;
    transform-origin:50% 50%;transform:translate(-50%,-50%) rotate(0deg);
    transition:transform 2.8s cubic-bezier(.17,.67,.21,1);
  }
  .bottle{width:100%;height:100%;filter:drop-shadow(0 6px 14px rgba(0,0,0,.45));}
  .seat{
    position:absolute;width:64px;transform:translate(-50%,-50%);
    text-align:center;transition:transform .25s;
  }
  .seat .avatar{width:54px;height:54px;margin:0 auto;border:2px solid transparent;}
  .seat .nm{font-size:12px;margin-top:5px;color:var(--muted);white-space:nowrap;}
  .seat.me .nm{color:var(--amber);}
  .seat.active .avatar{border-color:var(--rose);box-shadow:0 0 0 4px rgba(255,143,174,.25),0 6px 18px rgba(255,143,174,.4);transform:scale(1.08);}
  .seat.active .nm{color:var(--rose);font-weight:700;}

  .panel{
    flex:1;display:flex;flex-direction:column;gap:12px;
    margin-top:4px;
  }
  .card{
    border:1px solid var(--line);border-radius:20px;padding:16px 16px 18px;
    background:var(--glass);backdrop-filter:blur(14px);
  }
  .card .who{font-size:12px;color:var(--faint);letter-spacing:.1em;margin-bottom:8px;}
  .card .q{font-size:17px;line-height:1.6;font-family:var(--serif);}
  .typebadge{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;
    padding:4px 12px;border-radius:999px;margin-bottom:10px;}
  .typebadge.truth{background:rgba(185,140,255,.18);color:var(--violet);border:1px solid rgba(185,140,255,.4);}
  .typebadge.dare{background:rgba(255,193,107,.16);color:var(--amber);border:1px solid rgba(255,193,107,.4);}

  .bubble{display:flex;gap:10px;align-items:flex-start;}
  .bubble .avatar{width:40px;height:40px;font-size:16px;}
  .bubble .body{flex:1;}
  .bubble .nm{font-size:13px;color:var(--rose);font-weight:600;margin-bottom:4px;}
  .bubble .txt{font-size:15px;line-height:1.65;color:var(--ink);}
  .bubble.react .nm{color:var(--violet);}
  .bubble.react .txt{color:var(--muted);font-size:14px;}

  .answer-box{display:flex;flex-direction:column;gap:10px;}
  textarea{
    width:100%;min-height:84px;resize:none;border-radius:16px;padding:12px 14px;
    border:1px solid var(--line);background:rgba(0,0,0,.25);color:var(--ink);
    font-family:var(--sans);font-size:15px;line-height:1.5;outline:none;
  }
  textarea:focus{border-color:var(--rose);}

  .choose-row{display:flex;gap:12px;}
  .choose-row .btn{flex:1;}
  .actions{display:flex;gap:12px;margin-top:auto;padding-top:6px;}
  .actions .btn{flex:1;}

  .loading{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:14px;}
  .dots{display:inline-flex;gap:4px;}
  .dots i{width:6px;height:6px;border-radius:50%;background:var(--rose);animation:bnc 1s infinite;}
  .dots i:nth-child(2){animation-delay:.15s;}
  .dots i:nth-child(3){animation-delay:.3s;}
  @keyframes bnc{0%,80%,100%{transform:translateY(0);opacity:.4;}40%{transform:translateY(-5px);opacity:1;}}

  .history{margin-top:14px;display:flex;flex-direction:column;gap:8px;}
  .history .h-title{font-size:12px;color:var(--faint);letter-spacing:.2em;text-align:center;margin:6px 0;}
  .h-item{font-size:13px;color:var(--muted);line-height:1.5;border-left:2px solid var(--line);padding:2px 0 2px 12px;}
  .h-item b{color:var(--ink);font-weight:600;}

  /* ---------- 结局 ---------- */
  #screen-end{flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center;gap:18px;}
  #screen-end h2{font-family:var(--serif);font-size:26px;margin:0;}
  .recap{border:1px solid var(--line);border-radius:20px;background:var(--glass);
    padding:18px;text-align:left;max-height:46vh;overflow-y:auto;}
  .recap .line{font-size:14px;line-height:1.6;color:var(--muted);margin:8px 0;}
  .recap .line b{color:var(--ink);}
  .memo{font-size:13px;color:var(--amber);letter-spacing:.05em;}
  .end-actions{display:flex;flex-direction:column;gap:12px;}
  /* 题库模式 */
  .mode-select{display:flex;gap:0;border-radius:12px;overflow:hidden;border:1px solid var(--line);margin-top:10px}
  .mode-select button{flex:1;padding:10px 0;border:none;background:var(--glass);color:var(--muted);font-size:13px;cursor:pointer;font-family:var(--sans)}
  .mode-select button:not(:last-child){border-right:1px solid var(--line)}
  .mode-select button.active{background:var(--rose);color:#fff}
  .level-checks{display:flex;gap:12px;justify-content:center;margin-top:8px}
  .level-checks label{display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:4px 10px;border-radius:999px;border:1px solid var(--line);color:var(--muted);transition:border-color .15s,background .15s}
  .level-checks label.l1:has(input:checked){border-color:#ffb3c6;background:rgba(255,179,198,.12);color:#ffb3c6}
  .level-checks label.l2:has(input:checked){border-color:#ff6b81;background:rgba(255,107,129,.12);color:#ff6b81}
  .level-checks label.l3:has(input:checked){border-color:#c0392b;background:rgba(192,57,43,.12);color:#c0392b}
  .level-checks input{accent-color:var(--rose);width:13px;height:13px}
  .score-bar{display:flex;justify-content:center;gap:20px;padding:6px 0;font-size:13px;color:var(--muted)}
  .score-bar .sc-done{color:#a0d995}
  .score-bar .sc-skip{color:var(--amber)}
  .score-bar .sc-refuse{color:var(--rose)}
  .level-badge{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;margin-right:6px}
  .level-badge.l1{background:rgba(255,179,198,.18);color:#ffb3c6;border:1px solid rgba(255,179,198,.35)}
  .level-badge.l2{background:rgba(255,107,129,.18);color:#ff6b81;border:1px solid rgba(255,107,129,.35)}
  .level-badge.l3{background:rgba(192,57,43,.18);color:#c0392b;border:1px solid rgba(192,57,43,.35)}
</style>
</head>
<body>
<div class="game-screen">

  <!-- 选人页 -->
  <section id="screen-select">
    <div class="head fade">
      <h1 class="title">真心话大冒险</h1>
      <div class="sub">TRUTH&nbsp;·&nbsp;OR&nbsp;·&nbsp;DARE</div>
    </div>
    <div class="pick-hint" id="pickHint">挑 3 个人，和你一起围坐这一晚</div>
    <div class="char-list" id="charList"></div>
    <div style="margin-top:10px">
      <div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:4px">出题模式</div>
      <div class="mode-select" id="modeSelect">
        <button data-mode="ai" class="active">AI 动态出题</button>
        <button data-mode="bank">题库模式</button>
      </div>
      <div class="level-checks" id="levelChecks" style="display:none">
        <label class="l1"><input type="checkbox" value="1" checked /> L1暧昧</label>
        <label class="l2"><input type="checkbox" value="2" checked /> L2升温</label>
        <label class="l3"><input type="checkbox" value="3" checked /> L3深度</label>
      </div>
    </div>
    <div class="footer">
      <button class="btn primary" id="startBtn" disabled>开始游戏</button>
    </div>
  </section>

  <!-- 牌桌 -->
  <section id="screen-table" class="hidden">
    <div class="score-bar" id="scoreBar">
      <span class="sc-done">✓ <b id="scDone">0</b></span>
      <span class="sc-skip">→ <b id="scSkip">0</b></span>
      <span class="sc-refuse">✕ <b id="scRefuse">0</b></span>
    </div>
    <div class="round-tag" id="roundTag">第 1 轮</div>
    <div class="stage" id="stage">
      <div class="table-ring"></div>
      <div class="glow"></div>
      <div class="bottle-wrap" id="bottleWrap">
        <svg class="bottle" viewBox="0 0 40 120" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#ffe6b0"/><stop offset="0.5" stop-color="#ff9f6b"/><stop offset="1" stop-color="#c85a7a"/>
            </linearGradient>
          </defs>
          <path d="M16 6 h8 v18 q10 6 10 24 v56 q0 8 -8 8 h-12 q-8 0 -8 -8 v-56 q0 -18 10 -24 z" fill="url(#bg)"/>
          <rect x="15" y="2" width="10" height="8" rx="3" fill="#e9c98a"/>
          <ellipse cx="14" cy="60" rx="3" ry="14" fill="rgba(255,255,255,.45)"/>
        </svg>
      </div>
      <!-- 座位由 JS 注入 -->
    </div>

    <div class="panel" id="panel"></div>
    <div class="history hidden" id="historyWrap">
      <div class="h-title">今晚的回合</div>
      <div id="historyList"></div>
    </div>
  </section>

  <!-- 结局 -->
  <section id="screen-end" class="hidden">
    <h2 class="title">夜色散场</h2>
    <div class="recap" id="recap"></div>
    <div class="memo" id="memoNote"></div>
    <div class="end-actions">
      <button class="btn primary" id="againBtn">再来一局</button>
      <button class="btn ghost" id="exitBtn">离开</button>
    </div>
  </section>

</div>

<script>
(function(){
  "use strict";

  /* ============ 宿主 API 适配（带本地回退，方便单独预览） ============ */
  const HOST = window.AiPhoneGame || null;
  const hasHost = !!HOST;
  const has = (k)=> hasHost && typeof HOST[k] === "function";

  const API = {
    async listCharacters(){
      if(has("listAvailableCharacters")) return await HOST.listAvailableCharacters();
      return [
        {id:"demo1",name:"沈砚清",subtitle:"清冷温柔的旧识"},
        {id:"demo2",name:"陈未明",subtitle:"爱拱火的主持人"},
        {id:"demo3",name:"贺知真",subtitle:"嘴硬心软"},
        {id:"demo4",name:"林晚",subtitle:"安静的观察者"}
      ];
    },
    async player(){
      if(has("getPlayerProfile")){ try{ const p=await HOST.getPlayerProfile(); if(p&&p.name) return p; }catch(e){} }
      return {name:"你"};
    },
    async lightPkg(id){
      if(has("getRoleLightPackage")){ try{ return await HOST.getRoleLightPackage(id); }catch(e){} }
      return {messages:[]};
    },
    async llm(opts){
      if(has("callLLM")) return await HOST.callLLM(opts);
      await wait(700); return {content:"（本地预览）这种问题嘛……我可不会轻易告诉你哦。"};
    },
    async globalLLM(opts){
      if(has("callGlobalLLM")) return await HOST.callGlobalLLM(opts);
      await wait(600);
      const demo = ["说出此刻你最想对在场某个人讲、却一直没说的一句话。",
        "模仿在座一个人最有标志性的小动作，让大家猜是谁。",
        "讲一件你从没跟任何人提过的小秘密。",
        "对你右手边的人真诚地说一句赞美。"];
      return {content: demo[Math.floor(Math.random()*demo.length)]};
    },
    async save(d){ if(has("saveGame")){ try{ return await HOST.saveGame(d); }catch(e){} } },
    async load(){ if(has("loadGame")){ try{ return await HOST.loadGame(); }catch(e){} } return null; },
    async record(d){ if(has("recordGameEvent")){ try{ return await HOST.recordGameEvent(d); }catch(e){} } else { console.log("[recordGameEvent]",d); } },
    async setTitleBar(d){ if(has("setTitleBar")){ try{ return await HOST.setTitleBar(d); }catch(e){} } },
    async close(){ if(has("closeGame")){ try{ return await HOST.closeGame(); }catch(e){} } }
  };

  const wait = (ms)=> new Promise(r=>setTimeout(r,ms));
  const \$ = (id)=> document.getElementById(id);
  const esc = (s)=> String(s==null?"":s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

  /* ============ 全局状态 ============ */
  const S = {
    all: [],
    chosen: [],
    player: {name:"你"},
    seats: [],
    pkgCache: {},
    round: 0,
    log: [],
    busy: false,
    recorded: false,
    lastTargetIdx: -1,
    /* 题库模式 */
    mode: "ai",            // "ai" | "bank"
    levels: [1,2,3],       // 启用的难度
    questionBank: {1:[],2:[],3:[]}, // 按等级缓存的题目
    usedIds: new Set(),    // 已抽过的题目ID
    scores: {done:0,skip:0,refuse:0}, // 记分
    currentQuestion: null  // 当前抽到的题目对象
  };

  /* ============ 初始化 ============ */
  async function init(){
    API.setTitleBar({
      material:"glass",
      buttonBackground:"rgba(255,255,255,.08)",
      buttonColor:"#ffd9a0",
      buttonBorderColor:"rgba(255,255,255,.16)",
      buttonRadius:"999px",
      buttonShadow:"0 8px 20px rgba(0,0,0,.25)",
      iconOpacity:1
    });

    S.player = await API.player();
    S.all = await API.listCharacters() || [];
    renderCharList();

    // 模式切换
    \$("modeSelect").querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", function(){
        \$("modeSelect").querySelectorAll("button").forEach(b=>b.classList.remove("active"));
        this.classList.add("active");
        S.mode = this.dataset.mode;
        \$("levelChecks").style.display = S.mode==="bank"?"flex":"none";
        if(S.mode==="bank") loadQuestionBank();
      });
    });

    // 难度勾选变化 → 重载题库
    \$("levelChecks").querySelectorAll("input").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        S.levels = [];
        \$("levelChecks").querySelectorAll("input:checked").forEach(c=>S.levels.push(parseInt(c.value)));
        if(S.mode==="bank"){ S.questionBank={1:[],2:[],3:[]}; S.usedIds=new Set(); loadQuestionBank(); }
      });
    });

    \$("startBtn").addEventListener("click", startGame);
    \$("againBtn").addEventListener("click", ()=>{ resetForReplay(); });
    \$("exitBtn").addEventListener("click", ()=> API.close());
  }

  /* ============ 选人页 ============ */
  function renderCharList(){
    const wrap = \$("charList");
    wrap.innerHTML = "";
    if(!S.all.length){
      wrap.innerHTML = '<div class="pick-hint">这台小手机里还没有可邀请的角色～</div>';
      return;
    }
    S.all.forEach(c=>{
      const el = document.createElement("div");
      el.className = "char-card";
      el.dataset.id = c.id;
      el.innerHTML = \`
        <div class="avatar">\${c.avatar?\`<img src="\${esc(c.avatar)}" onerror="this.remove()"/>\`:""}\${initial(c.name)}</div>
        <div class="char-meta">
          <div class="nm">\${esc(c.name)}</div>
          \${c.subtitle?\`<div class="st">\${esc(c.subtitle)}</div>\`:""}
        </div>
        <div class="check">✓</div>\`;
      el.addEventListener("click", ()=> togglePick(c, el));
      wrap.appendChild(el);
    });
  }

  function initial(name){ const n=(name||"?").trim(); return esc(n.charAt(0)||"?"); }

  function togglePick(c, el){
    const i = S.chosen.findIndex(x=>x.id===c.id);
    if(i>=0){ S.chosen.splice(i,1); el.classList.remove("sel"); }
    else{
      if(S.chosen.length>=3){ flashHint("最多选 3 个人哦"); return; }
      S.chosen.push(c); el.classList.add("sel");
    }
    const n = S.chosen.length;
    \$("pickHint").textContent = n? \`已选 \${n} 人 · \${"●".repeat(n)}\${"○".repeat(3-n)}\` : "挑 3 个人，和你一起围坐这一晚";
    \$("startBtn").disabled = n<1;
    \$("startBtn").textContent = n? \`开始游戏（\${n+1} 人入座）\` : "开始游戏";
  }

  let hintTimer;
  function flashHint(t){
    const h=\$("pickHint"); const old=h.textContent; h.textContent=t;
    clearTimeout(hintTimer); hintTimer=setTimeout(()=>{ const n=S.chosen.length; h.textContent = n? \`已选 \${n} 人 · \${"●".repeat(n)}\${"○".repeat(3-n)}\`:old; },1400);
  }

  /* ============ 开始 ============ */
  function startGame(){
    buildSeats();
    show("screen-table");
    renderSeats();
    S.round = 0;
    S.log = [];
    S.recorded = false;
    S.lastTargetIdx = -1;
    renderIdle();
    persist();
  }

  function buildSeats(){
    const total = 1 + S.chosen.length;
    S.seats = [];
    // 玩家固定在底部(180°)，其余等分
    for(let i=0;i<total;i++){
      const angle = (180 + i*(360/total)) % 360;
      if(i===0) S.seats.push({type:"me", id:"__me__", name:S.player.name, avatar:null, angle});
      else{
        const c = S.chosen[i-1];
        S.seats.push({type:"char", id:c.id, name:c.name, avatar:c.avatar, angle});
      }
    }
  }

  function renderSeats(){
    document.querySelectorAll(".seat").forEach(n=>n.remove());
    const stage = \$("stage");
    const size = stage.clientWidth;
    const R = size*0.40, cx=size/2, cy=size/2;
    S.seats.forEach((s,idx)=>{
      const rad = s.angle*Math.PI/180;
      const x = cx + R*Math.sin(rad);
      const y = cy - R*Math.cos(rad);
      const el=document.createElement("div");
      el.className="seat"+(s.type==="me"?" me":"");
      el.dataset.idx=idx;
      el.style.left=x+"px"; el.style.top=y+"px";
      el.innerHTML=\`<div class="avatar">\${s.avatar?\`<img src="\${esc(s.avatar)}" onerror="this.remove()"/>\`:""}\${initial(s.name)}</div>
        <div class="nm">\${s.type==="me"?"你":esc(s.name)}</div>\`;
      stage.appendChild(el);
    });
  }

  /* ============ 回合：待转 ============ */
  function renderIdle(){
    clearActive();
    \$("roundTag").textContent = S.round? \`第 \${S.round} 轮 · 已结束 \${S.log.length} 个回合\` : "围坐就绪";
    \$("panel").innerHTML = \`
      <div class="card fade" style="text-align:center">
        <div class="q" style="font-size:16px;color:var(--muted)">\${S.round?"转动瓶子，看看命运指向谁":"转动瓶子，让这一晚开始吧"}</div>
      </div>
      <div class="actions">
        <button class="btn primary" id="spinBtn">转瓶子</button>
        \${S.log.length?'<button class="btn ghost" id="endBtn">结束今晚</button>':""}
      </div>\`;
    \$("spinBtn").addEventListener("click", spin);
    const eb=\$("endBtn"); if(eb) eb.addEventListener("click", endGame);
    renderHistory();
  }

  let curRotation = 0;
  /* ============ 题库模式 ============ */
  async function loadQuestionBank(){
    S.questionBank = {1:[],2:[],3:[]};
    for(const lv of S.levels){
      try{
        const res = await fetch(\`/game-builtins/tod-questions-l\${lv}.json\`);
        if(!res.ok) throw new Error("HTTP "+res.status);
        const data = await res.json();
        S.questionBank[lv] = data;
      }catch(e){
        console.warn("[ToD] failed to load L"+lv+" questions:", e);
      }
    }
  }
  function drawQuestion(){
    // 收集所有可用题目
    const pool = [];
    for(const lv of S.levels) pool.push(...S.questionBank[lv].filter(q=>!S.usedIds.has(q.id)));
    if(!pool.length){
      // 所有题目都抽过了，重置
      S.usedIds = new Set();
      for(const lv of S.levels) pool.push(...S.questionBank[lv]);
    }
    if(!pool.length) return null;
    const q = pool[Math.floor(Math.random()*pool.length)];
    S.usedIds.add(q.id);
    S.currentQuestion = q;
    return q;
  }
  function updateScores(){
    \$("scDone").textContent = S.scores.done;
    \$("scSkip").textContent = S.scores.skip;
    \$("scRefuse").textContent = S.scores.refuse;
  }

  async function spin(){
    if(S.busy) return; S.busy=true;
    \$("spinBtn").disabled=true;
    clearActive();
    S.round++;
    \$("roundTag").textContent = \`第 \${S.round} 轮\`;

    // 选目标（避免连续指同一人）
    let idx;
    do{ idx = Math.floor(Math.random()*S.seats.length); }
    while(S.seats.length>1 && idx===S.lastTargetIdx);
    S.lastTargetIdx = idx;
    const target = S.seats[idx];

    // 旋转到目标角度
    const A = target.angle;
    const cur = ((curRotation % 360)+360)%360;
    const delta = ((A - cur)+360)%360;
    curRotation += (3+Math.floor(Math.random()*3))*360 + delta;
    \$("bottleWrap").style.transform = \`translate(-50%,-50%) rotate(\${curRotation}deg)\`;

    await wait(2950);
    markActive(idx);
    await beginTurn(target);
    S.busy=false;
  }

  function markActive(idx){
    clearActive();
    const el=document.querySelector(\`.seat[data-idx="\${idx}"]\`);
    if(el) el.classList.add("active");
  }
  function clearActive(){ document.querySelectorAll(".seat.active").forEach(n=>n.classList.remove("active")); }

  /* ============ 一个回合 ============ */
  async function beginTurn(target){
    if(target.type==="me"){
      // 题库模式：抽一张给玩家选类型
      if(S.mode==="bank"){
        const q = drawQuestion();
        if(!q){ renderChoose(target); return; }
        renderChoose(target, q.type); // 题库决定了类型，但玩家仍可选
      }else{
        renderChoose(target);
      }
    }else{
      let type;
      if(S.mode==="bank"){
        const q = drawQuestion();
        if(!q){ type = Math.random()<0.5?"truth":"dare"; }
        else type = q.type;
      }else{
        type = Math.random()<0.5 ? "truth" : "dare";
      }
      renderChoose(target, type);
      await wait(900);
      await runPrompt(target, type);
    }
  }

  function renderChoose(target, autoType){
    const isMe = target.type==="me";
    const q = S.currentQuestion; // 题库模式下的当前题目
    // 题库提示文字
    const bankHint = (q && S.mode==="bank") ? \`<span class="level-badge l\${q.level}">L\${q.level}</span>\` : "";
    \$("panel").innerHTML = \`
      <div class="card fade">
        <div class="who">轮到 \${isMe?"你":esc(target.name)} \${bankHint}</div>
        \${isMe
          ? \`<div class="q" style="font-size:16px">\${q&&S.mode==="bank"? esc(q.text) : "选一个吧——"}</div>
             \${q&&S.mode==="bank"
               ? \`<div class="choose-row" style="margin-top:14px">
                    <button class="btn" id="chTruth">\${q.type==="truth"?"接受真心话":"换大冒险"}</button>
                    <button class="btn" id="chDare">\${q.type==="dare"?"接受大冒险":"换真心话"}</button>
                  </div>\`
               : \`<div class="choose-row" style="margin-top:14px">
                    <button class="btn" id="chTruth">真心话</button>
                    <button class="btn" id="chDare">大冒险</button>
                  </div>\`}\`
          : \`<div class="q" style="font-size:16px;color:var(--muted)">\${esc(target.name)} 选择了
               <b style="color:\${autoType==="truth"?"var(--violet)":"var(--amber)"}">\${autoType==="truth"?"真心话":"大冒险"}</b>…</div>\`}
      </div>\`;
    if(isMe){
      \$("chTruth").addEventListener("click", ()=> runPrompt(target, q&&S.mode==="bank"? q.type : "truth"));
      \$("chDare").addEventListener("click", ()=> runPrompt(target, q&&S.mode==="bank"? (q.type==="truth"?"dare":"truth") : "dare"));
    }
  }

  async function runPrompt(target, type){
    const isMe = target.type==="me";
    const typeLabel = type==="truth"?"真心话":"大冒险";
    const q = S.currentQuestion;
    // 题库模式：直接用抽到的题目，跳过LLM出题
    if(S.mode==="bank" && q){
      prompt = q.text;
      \$("panel").innerHTML = '<div class="card fade"><span class="level-badge l'+q.level+'">L'+q.level+'</span> <span class="typebadge '+type+'">'+typeLabel+'</span><div class="who">出给 '+(isMe?"你":esc(target.name))+'</div><div class="q">'+esc(prompt)+'</div></div><div id="answerArea"></div><div class="actions" id="turnActions"></div>';
    }else{
      // AI动态出题（原逻辑不变）
      \$("panel").innerHTML = '<div class="card fade"><span class="typebadge '+type+'">'+typeLabel+'</span><div class="loading"><span>主持人正在出题</span><span class="dots"><i></i><i></i><i></i></span></div></div>';
      const names = S.seats.map(function(s){ return s.type==="me"? S.player.name : s.name; }).join("、");
      try{
        const r = await API.globalLLM({messages:[{role:"system",content:'你是一场深夜朋友聚会上"真心话大冒险"的主持人，只负责出题。语气俏皮、温暖、带点暧昧的小心机。根据要求生成一个'+(type==="truth"?"[真心话问题]":"[大冒险任务]")+'。要求：贴合在场众人之间的关系，能引出真实情绪或有趣互动；只输出题目本身一句话，不要解释、不要引号、不超过40字；保持轻松友好，避免露骨、冒犯或危险内容。'},{role:"user",content:'现在轮到['+(isMe?S.player.name:target.name)+']。在场的人有：'+names+'。请为'+(isMe?S.player.name:target.name)+'出一个'+typeLabel+'。'}]});
        prompt = (r && r.content || "").trim();
      }catch(e){ prompt=""; }
      if(!prompt) prompt = type==="truth" ? "说出此刻你最不想被人看穿的一个念头。" : "用一句话向在座某个人表白，可以是认真的，也可以是玩笑。";

    // AI动态模式才需要覆盖panel（题库模式已在上面设好）
    if(S.mode!=="bank" || !q){
      \$("panel").innerHTML = '<div class="card fade"><span class="typebadge '+type+'">'+typeLabel+'</span><div class="who">出给 '+(isMe?"你":esc(target.name))+'</div><div class="q">'+esc(prompt)+'</div></div><div id="answerArea"></div><div class="actions" id="turnActions"></div>';
    }
    if(isMe){
      renderPlayerAnswer(target, type, prompt);
    }else{
      await renderCharAnswer(target, type, prompt);
    }
  }

  function renderPlayerAnswer(target, type, prompt){
    const area=\$("answerArea");
    if(type==="truth"){
      area.innerHTML = \`<div class="answer-box fade">
        <textarea id="ans" placeholder="说点真的……"></textarea>
      </div>\`;
      \$("turnActions").innerHTML = \`<button class="btn primary" id="submitAns">说完了</button>\`;
      \$("submitAns").addEventListener("click", async ()=>{
        const v=(\$("ans").value||"").trim();
        S.scores.done++; updateScores();
        await finishTurn(target,type,prompt, v || "（沉默了一会儿，没说出口）","completed");
      });
      \$("turnActions").innerHTML += '<button class="btn" id="skipTurn">跳过 →</button><button class="btn" id="refuseTurn">拒绝 ✕</button>';
      \$("skipTurn").addEventListener("click", async ()=>{
        S.scores.skip++; updateScores();
        await finishTurn(target,type,prompt, "（选择了跳过这道题）","skipped");
      });
      \$("refuseTurn").addEventListener("click", async ()=>{
        S.scores.refuse++; updateScores();
        await finishTurn(target,type,prompt, "（拒绝了这道题）","refused");
      });
    }else{
      area.innerHTML = '<div class="answer-box fade"><div class="card" style="background:rgba(0,0,0,.2)"><div class="q" style="font-size:14px;color:var(--muted)">完成它，然后告诉大家结果～</div></div><textarea id="ans" placeholder="（可选）写下你做了什么 / 留空也行"></textarea></div>';
      \$("turnActions").innerHTML = '<button class="btn primary" id="doneDare">完成挑战 ✓</button><button class="btn" id="skipTurn">跳过 →</button><button class="btn" id="refuseTurn">拒绝 ✕</button>';
      \$("doneDare").addEventListener("click", async ()=>{
        const v=(\$("ans").value||"").trim();
        S.scores.done++; updateScores();
        await finishTurn(target,type,prompt, v || "（笑着完成了这个大冒险）","completed");
      });
      \$("skipTurn").addEventListener("click", async ()=>{
        S.scores.skip++; updateScores();
        await finishTurn(target,type,prompt, "（选择了跳过这道题）","skipped");
      });
      \$("refuseTurn").addEventListener("click", async ()=>{
        S.scores.refuse++; updateScores();
        await finishTurn(target,type,prompt, "（拒绝了这道题）","refused");
      });
    }
  }

  async function renderCharAnswer(target, type, prompt){
    const area=\$("answerArea");
    area.innerHTML = \`<div class="bubble fade">
      <div class="avatar">\${target.avatar?\`<img src="\${esc(target.avatar)}" onerror="this.remove()"/>\`:""}\${initial(target.name)}</div>
      <div class="body"><div class="nm">\${esc(target.name)}</div>
      <div class="loading"><span class="dots"><i></i><i></i><i></i></span></div></div>
    </div>\`;

    const answer = await charSpeak(target, type, prompt);
    area.querySelector(".body").innerHTML =
      \`<div class="nm">\${esc(target.name)}</div><div class="txt">\${esc(answer)}</div>\`;

    // 一个其他角色起哄/反应（更有聚会感）
    const reactor = pickReactor(target);
    let reaction = "", reactorName = "";
    if(reactor){
      reactorName = reactor.name;
      const rb=document.createElement("div");
      rb.className="bubble react fade"; rb.style.marginTop="10px";
      rb.innerHTML=\`<div class="avatar">\${reactor.avatar?\`<img src="\${esc(reactor.avatar)}" onerror="this.remove()"/>\`:""}\${initial(reactor.name)}</div>
        <div class="body"><div class="nm">\${esc(reactor.name)}</div>
        <div class="loading"><span class="dots"><i></i><i></i><i></i></span></div></div>\`;
      area.appendChild(rb);
      reaction = await charReact(reactor, target, type, prompt, answer);
      rb.querySelector(".body").innerHTML=\`<div class="nm">\${esc(reactor.name)}</div><div class="txt">\${esc(reaction)}</div>\`;
    }

    \$("turnActions").innerHTML = \`<button class="btn primary" id="nextTurn">下一轮</button>
      <button class="btn ghost" id="endNow">结束今晚</button>\`;
    \$("nextTurn").addEventListener("click", ()=> commit(target,type,prompt,answer,reactorName,reaction));
    \$("endNow").addEventListener("click", ()=>{ commitSilently(target,type,prompt,answer,reactorName,reaction); endGame(); });
  }

  function pickReactor(target){
    const others = S.seats.filter(s=> s.type==="char" && s.id!==target.id);
    if(!others.length) return null;
    if(Math.random()<0.35) return null; // 不是每次都有人接话
    return others[Math.floor(Math.random()*others.length)];
  }

  async function getPkg(id){
    if(S.pkgCache[id]) return S.pkgCache[id];
    const p = await API.lightPkg(id); S.pkgCache[id]=p||{messages:[]}; return S.pkgCache[id];
  }

  async function charSpeak(target, type, prompt){
    try{
      const pkg = await getPkg(target.id);
      const sys = type==="truth"
        ? \`你正在和\${S.player.name}等人玩真心话大冒险，现在轮到你回答一个真心话问题。请完全以你自己的性格、语气和说话习惯，真诚地回应。只输出你说的话，30~80字，可带一点点动作神态，但不要写成旁白或剧本格式。\`
        : \`你正在和\${S.player.name}等人玩真心话大冒险，现在轮到你完成一个大冒险任务。请完全以你自己的性格和语气，第一人称描述你怎么完成它（可以有简短动作）。只输出你的内容，30~80字，不要旁白格式。\`;
      const r = await API.llm({
        characterId: target.id,
        messages:[
          ...(pkg.messages||[]),
          {role:"system",content:sys},
          {role:"user",content:\`\${type==="truth"?"真心话问题":"大冒险任务"}：\${prompt}\`}
        ]
      });
      const txt=(r&&r.content||"").trim();
      return txt || fallbackSpeak(type);
    }catch(e){ return fallbackSpeak(type); }
  }
  function fallbackSpeak(type){
    return type==="truth" ? "……让我想想该怎么说。这种事，本来是不打算告诉别人的。" : "好吧，既然抽到了，我就做给你们看——别笑。";
  }

  async function charReact(reactor, target, type, prompt, answer){
    try{
      const pkg = await getPkg(reactor.id);
      const r = await API.llm({
        characterId: reactor.id,
        messages:[
          ...(pkg.messages||[]),
          {role:"system",content:\`你正在旁观\${S.player.name}等人玩真心话大冒险。刚才\${target.name}\${type==="truth"?"回答了一个真心话":"完成了一个大冒险"}。请以你自己的性格，给一句简短的现场反应（起哄、调侃、感慨或追问都行）。只输出你说的话，不超过30字。\`},
          {role:"user",content:\`\${target.name}的内容是：「\${answer}」。\`}
        ]
      });
      const txt=(r&&r.content||"").trim();
      return txt || "哦——这个回答有意思。";
    }catch(e){ return "哦——这个回答有意思。"; }
  }

  /* ============ 收尾一个回合 ============ */
  async function finishTurn(target,type,prompt,answer,result){
    // 玩家作答后，也让一个角色反应
    const area=\$("answerArea");
    const reactor = pickReactor(target);
    let reaction="", reactorName="";
    if(reactor){
      reactorName=reactor.name;
      const rb=document.createElement("div");
      rb.className="bubble react fade"; rb.style.marginTop="10px";
      rb.innerHTML=\`<div class="avatar">\${reactor.avatar?\`<img src="\${esc(reactor.avatar)}" onerror="this.remove()"/>\`:""}\${initial(reactor.name)}</div>
        <div class="body"><div class="nm">\${esc(reactor.name)}</div>
        <div class="loading"><span class="dots"><i></i><i></i><i></i></span></div></div>\`;
      area.appendChild(rb);
      \$("turnActions").innerHTML="";
      reaction = await charReact(reactor, {name:S.player.name}, type, prompt, answer);
      rb.querySelector(".body").innerHTML=\`<div class="nm">\${esc(reactor.name)}</div><div class="txt">\${esc(reaction)}</div>\`;
    }
    \$("turnActions").innerHTML = \`<button class="btn primary" id="nextTurn">下一轮</button>
      <button class="btn ghost" id="endNow">结束今晚</button>\`;
    const res = result || "completed";
    \$("nextTurn").addEventListener("click", ()=> commit(target,type,prompt,answer,reactorName,reaction,res));
    \$("endNow").addEventListener("click", ()=>{ commitSilently(target,type,prompt,answer,reactorName,reaction,res); endGame(); });
  }

  function commit(target,type,prompt,answer,reactorName,reaction,result){
    commitSilently(target,type,prompt,answer,reactorName,reaction,result);
    renderIdle();
  }
  function commitSilently(target,type,prompt,answer,reactorName,reaction,result){
    const q = S.currentQuestion;
    S.log.push({
      targetName: target.type==="me"? S.player.name : target.name,
      isPlayer: target.type==="me",
      type, prompt, answer,
      reactorName, reaction,
      result: result || "completed",
      questionId: q ? q.id : null,
      level: q ? q.level : null
    });
    persist();
  }

  /* ============ 历史 ============ */
  function renderHistory(){
    if(!S.log.length){ \$("historyWrap").classList.add("hidden"); return; }
    \$("historyWrap").classList.remove("hidden");
    const list=\$("historyList");
    list.innerHTML = S.log.slice(-4).map(function(e){
      var tl = e.type==="truth"?"真心话":"大冒险";
      var lvBadge = e.level ? '<span class="level-badge l'+e.level+'">L'+e.level+'</span>' : '';
      var resIcon = e.result==="skipped"?" →": e.result==="refused"?" ✕":" ✓";
      return '<div class="h-item">'+lvBadge+'<b>'+esc(e.targetName)+'</b> · '+tl+' '+resIcon+'：'+esc(trim(e.prompt,18))+'</div>';
    }).join("");
  }
  function trim(s,n){ s=String(s||""); return s.length>n? s.slice(0,n)+"…" : s; }

  /* ============ 存档 ============ */
  function persist(){
    API.save({
      chosen:S.chosen, player:S.player, seats:S.seats,
      round:S.round, log:S.log, recorded:S.recorded, v:1
    });
  }

  /* ============ 结束：写回记忆 ============ */
  async function endGame(){
    if(S.busy) return;
    show("screen-end");
    renderRecap();
    if(!S.recorded){
      S.recorded=true;
      await writeMemory();
    }
  }

  function renderRecap(){
    const recap=\$("recap");
    if(!S.log.length){
      recap.innerHTML=\`<div class="line">这一晚，瓶子还没来得及转起来呢。</div>\`;
      \$("memoNote").textContent="";
      return;
    }
    recap.innerHTML = S.log.map(e=>{
      const tl=e.type==="truth"?"真心话":"大冒险";
      return \`<div class="line"><b>\${esc(e.targetName)}</b> 的\${tl}：\${esc(trim(e.prompt,40))}<br>
        <span style="color:var(--faint)">「\${esc(trim(e.answer,46))}」</span>
        \${e.reactorName?\`<br><span style="color:var(--violet);font-size:13px">\${esc(e.reactorName)}：\${esc(trim(e.reaction,30))}</span>\`:""}</div>\`;
    }).join("");
  }

  async function writeMemory(){
    const ids = S.chosen.map(c=>c.id);
    if(!ids.length){ \$("memoNote").textContent=""; return; }
    const summary = buildSummary();
    \$("memoNote").textContent = "正在把今晚写进记忆…";
    await API.record({ characterIds: ids, summary });
    \$("memoNote").textContent = \`已把今晚写进 \${S.chosen.map(c=>c.name).join("、")} 的记忆\`;
    persist();
  }

  // 用真实名字构造本局总结（不使用"玩家/用户/角色"等泛称）
  function buildSummary(){
    const names = [S.player.name, ...S.chosen.map(c=>c.name)].join("、");
    if(!S.log.length){
      return \`\${names}围坐在一起，原本要玩真心话大冒险，但还没正式开始这一晚就散了。\`;
    }
    // 取最多 3 个亮点：优先玩家参与的、以及真心话坦白
    const sorted = [...S.log].sort((a,b)=>{
      const sa=(a.isPlayer?2:0)+(a.type==="truth"?1:0);
      const sb=(b.isPlayer?2:0)+(b.type==="truth"?1:0);
      return sb-sa;
    });
    const picks = sorted.slice(0,3);
    const highlights = picks.map(e=>{
      const a = trim(e.answer, 30);
      if(e.type==="truth") return \`\${e.targetName}在真心话里说「\${a}」\`;
      return \`\${e.targetName}做了一个大冒险，\${a}\`;
    }).join("；");
    let s = \`今晚\${names}一起玩了真心话大冒险，\${S.log.length}回合（完成\${S.scores.done}跳\${S.scores.skip}拒\${S.scores.refuse}）。\${highlights}。\`;
    const me = S.log.find(e=>e.isPlayer);
    if(me) s += \`这一晚，\${S.player.name}也露出了平时不太说的那一面。\`;
    if(s.length>200) s=s.slice(0,198)+"。";
    return s;
  }

  /* ============ 再来一局 ============ */
  function resetForReplay(){
    S.round=0; S.log=[]; S.recorded=false; S.lastTargetIdx=-1; curRotation=0;
    S.scores={done:0,skip:0,refuse:0}; S.usedIds=new Set(); S.currentQuestion=null; updateScores();
    \$("bottleWrap").style.transition="none";
    \$("bottleWrap").style.transform="translate(-50%,-50%) rotate(0deg)";
    requestAnimationFrame(()=>{ \$("bottleWrap").style.transition=""; });
    show("screen-table");
    renderSeats();
    renderIdle();
    persist();
  }

  /* ============ 屏幕切换 ============ */
  function show(id){
    ["screen-select","screen-table","screen-end"].forEach(s=>{
      \$(s).classList.toggle("hidden", s!==id);
    });
  }

  window.addEventListener("resize", ()=>{ if(!\$("screen-table").classList.contains("hidden")) renderSeats(); });

  init();
})();
</script>
</body>
</html>
`;

export const SPICY_MONOPOLY_GAME_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
<title>涩涩大富翁</title>
<style>
  :root {
    --safe-top: var(--ai-phone-game-safe-top, 88px);
    --safe-bottom: var(--ai-phone-game-safe-bottom, 24px);
    --bg0: #1a0a14; --bg1: #2d1122; --bg2: #3d1a2e;
    --ink: #f5e8ee; --muted: #c9a8ba; --accent: #e898a8; --gold: #f1c45a; --danger: #d94a5a; --warn: #e8985a;
    --glass: rgba(255,255,255,.05); --glass-strong: rgba(255,255,255,.1);
    --line: rgba(255,255,255,.1); --radius: 14px;
    --sans: -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
    --mono: "SF Mono","Cascadia Code","Consolas",monospace;
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html,body{width:100%;height:100%;margin:0}
  body{overflow:hidden;font-family:var(--sans);color:var(--ink);
    background:radial-gradient(120% 80% at 50% -10%,#4a1f35 0%,rgba(74,31,53,0) 55%),
    radial-gradient(90% 60% at 80% 110%,#3d1a2e 0%,rgba(61,26,46,0) 60%),
    linear-gradient(160deg,var(--bg0),var(--bg1) 60%,var(--bg2))}
  .screen{position:relative;z-index:1;min-height:100%;height:100%;box-sizing:border-box;
    padding:var(--safe-top) 16px var(--safe-bottom);overflow-y:auto;-webkit-overflow-scrolling:touch;
    display:none;flex-direction:column}
  .screen.active{display:flex}
  .btn{border:1px solid var(--line);border-radius:999px;padding:12px 20px;font-size:14px;
    font-weight:600;color:var(--ink);background:var(--glass-strong);backdrop-filter:blur(12px);
    cursor:pointer;user-select:none;font-family:var(--sans);text-align:center}
  .btn:active{transform:scale(.96)}
  .btn.primary{background:linear-gradient(135deg,var(--accent),#c87088);border-color:var(--accent);color:#fff}
  .btn.danger{background:linear-gradient(135deg,var(--danger),#b33a48);border-color:var(--danger);color:#fff}
  .btn.warn{background:rgba(232,152,90,.25);border-color:var(--warn);color:var(--warn);font-size:12px;padding:8px 14px}
  .btn.small{font-size:12px;padding:8px 14px}
  .btn:disabled{opacity:.4;cursor:default}
  .title{text-align:center;font-size:28px;font-weight:800;letter-spacing:.06em;margin:8px 0 4px;
    background:linear-gradient(180deg,#fff5d6,var(--gold) 50%,#b9842b);
    -webkit-background-clip:text;background-clip:text;color:transparent}
  .subtitle{text-align:center;font-size:13px;color:var(--muted);margin-bottom:8px}
  .form-group{background:var(--glass);border:1px solid var(--line);border-radius:var(--radius);
    padding:14px;display:flex;flex-direction:column;gap:10px}
  .form-group label{font-size:12px;color:var(--muted)}
  .form-row{display:flex;gap:10px;align-items:center}
  .form-row input,.form-row select{flex:1;background:var(--glass-strong);border:1px solid var(--line);
    border-radius:8px;padding:10px 12px;font-size:14px;color:var(--ink);font-family:var(--sans);outline:none}
  .form-row select option{background:#2d1122;color:var(--ink)}
  .segmented{display:flex;gap:0;border-radius:10px;overflow:hidden;border:1px solid var(--line)}
  .segmented button{flex:1;padding:10px 0;border:none;background:var(--glass);color:var(--muted);
    font-size:13px;cursor:pointer;font-family:var(--sans)}
  .segmented button:not(:last-child){border-right:1px solid var(--line)}
  .segmented button.active{background:var(--accent);color:#fff}
  .checkbox-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .checkbox-grid label{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);
    cursor:pointer;padding:6px 8px;border-radius:8px;background:var(--glass);border:1px solid transparent}
  .checkbox-grid label:has(input:checked){border-color:var(--accent);background:rgba(232,152,168,.12);color:var(--ink)}
  .checkbox-grid input{accent-color:var(--accent);width:14px;height:14px}
  .range-row{display:flex;align-items:center;gap:10px}
  .range-row input[type=range]{flex:1;accent-color:var(--accent)}
  .range-row span{font-size:13px;color:var(--gold);min-width:32px;text-align:center}
  .topbar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0}
  .topbar .game-title{font-size:16px;font-weight:700}
  .topbar .safety-btns{display:flex;gap:6px}
  .player-strip{display:flex;justify-content:space-around;gap:8px;flex-shrink:0;padding:10px;
    background:var(--glass);border:1px solid var(--line);border-radius:var(--radius)}
  .player-info{text-align:center}
  .player-info .pname{font-size:14px;font-weight:700}
  .player-info .pcoins{font-size:12px;color:var(--gold)}
  .player-info .pident{font-size:11px;color:var(--accent)}
  .player-info .ppos{font-size:11px;color:var(--muted)}
  .board-wrap{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;
    background:var(--glass);border:1px solid var(--line);border-radius:var(--radius);padding:12px}
  .board-wrap pre{font-family:var(--mono);font-size:11px;line-height:1.5;color:var(--muted);
    white-space:pre-wrap;word-break:break-all;margin:0}
  .say-box{padding:10px 12px;background:var(--glass);border:1px solid var(--line);border-radius:var(--radius);
    font-size:13px;line-height:1.6;color:var(--ink);flex-shrink:0;min-height:40px}
  .settled-box{font-size:12px;color:var(--gold);padding:8px 12px;background:rgba(241,196,90,.08);
    border:1px solid rgba(241,196,90,.2);border-radius:var(--radius);flex-shrink:0;display:none}
  .settled-box.active{display:block}
  .task-card{padding:14px;background:rgba(232,152,168,.1);border:1px solid rgba(232,152,168,.25);
    border-radius:var(--radius);flex-shrink:0;display:none}
  .task-card.active{display:block}
  .task-card .task-header{font-size:11px;color:var(--accent);margin-bottom:6px}
  .task-card .task-content{font-size:15px;line-height:1.5;color:var(--ink);margin-bottom:4px}
  .task-card .task-intensity{font-size:12px;color:var(--gold);margin-bottom:10px}
  .task-actions{display:flex;gap:8px;flex-wrap:wrap}
  .action-bar{display:flex;gap:10px;flex-shrink:0;padding-bottom:4px}
  .action-bar .btn{flex:1}
  .roll-btn{font-size:18px;padding:16px;letter-spacing:2px}
  #result{justify-content:center;align-items:center;text-align:center;gap:16px}
  .result-emoji{font-size:64px}
  .modal-overlay{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;
    background:rgba(10,4,8,.7);backdrop-filter:blur(4px)}
  .modal-overlay.show{display:flex}
  .modal-box{background:linear-gradient(180deg,#2d1122,#1a0a14);border:1px solid var(--line);
    border-radius:16px;padding:24px;max-width:340px;width:90%;text-align:center}
  .modal-box h3{margin:0 0 8px;color:var(--accent)}
  .modal-box p{font-size:13px;color:var(--muted);margin:0 0 16px;line-height:1.5}
  .modal-row{display:flex;gap:8px;justify-content:center}
  .toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(10px);z-index:70;
    background:rgba(0,0,0,.85);color:#fff;font-size:13px;padding:8px 16px;border-radius:999px;
    opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;white-space:nowrap}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body>
<div id="setup" class="screen active">
  <div class="title">涩涩大富翁</div>
  <div class="subtitle">双人棋盘 · 色色任务 · AI 陪玩</div>
  <div class="form-group"><label>你的信息</label><div class="form-row">
    <input id="p1Name" placeholder="你的名字" value="我" />
    <select id="p1Sex"><option value="女">女</option><option value="男">男</option></select>
    <select id="p1Role"><option value="受">受</option><option value="攻">攻</option></select>
  </div></div>
  <div class="form-group"><label>AI 对手</label><div class="form-row">
    <select id="aiChar" style="flex:2"></select>
    <select id="p2Role"><option value="攻">攻</option><option value="受">受</option></select>
  </div></div>
  <div class="form-group"><label>强度段</label>
    <div class="segmented" id="flavorSeg">
      <button data-v="light">轻</button><button data-v="medium" class="active">中</button><button data-v="heavy">重</button>
  </div></div>
  <div class="form-group"><label>局长（回合数）</label>
    <div class="segmented" id="lenSeg">
      <button data-v="12">速玩12</button><button data-v="18">正常18</button><button data-v="24" class="active">超长24</button>
  </div></div>
  <div class="form-group"><label>身份模式</label>
    <div class="segmented" id="identitySeg">
      <button data-v="off">关</button><button data-v="mixed" class="active">混合35</button><button data-v="nsfw_only">纯NSFW</button>
  </div></div>
  <div class="form-group"><label>反转概率 <span id="revVal">0.3</span></label>
    <div class="range-row"><span>0</span><input type="range" id="reverseChance" min="0" max="1" step="0.1" value="0.3" /><span>1</span></div></div>
  <div class="form-group"><label>红线设置（双方都不想碰的花样）</label><div class="checkbox-grid" id="redlineGrid"></div></div>
  <div class="form-group"><label>后庭开关（肛交，默认关）</label><div class="form-row">
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer"><input type="checkbox" id="analP1" /> 你</label>
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer"><input type="checkbox" id="analP2" /> AI</label>
  </div></div>
  <div class="form-group"><label>先手</label>
    <div class="segmented" id="firstSeg"><button data-v="p1" class="active">你先</button><button data-v="p2">AI先</button></div></div>
  <button class="btn primary" id="startBtn" style="margin-top:6px">开始游戏</button>
  <p style="font-size:10px;color:var(--muted);text-align:center;margin:4px 0 12px">安全词「404」随时终止 · 任务可跳过 · 身份可重抽一次</p>
</div>
<div id="game" class="screen">
  <div class="topbar"><span class="game-title">涩涩大富翁</span>
    <div class="safety-btns"><button class="btn small danger" onclick="emergencyStop()">404</button><button class="btn small warn" onclick="showRedline()">红线</button></div></div>
  <div class="player-strip" id="playerStrip"></div>
  <div class="settled-box" id="settledBox"></div>
  <div class="board-wrap" id="boardWrap"><pre id="boardText">加载中...</pre></div>
  <div class="say-box" id="sayBox">等待掷骰...</div>
  <div class="task-card" id="taskCard">
    <div class="task-header">当前任务</div><div class="task-content" id="taskContent"></div>
    <div class="task-intensity" id="taskIntensity"></div>
    <div class="task-actions">
      <button class="btn small" onclick="skipTask()">跳过</button>
      <button class="btn small" onclick="swapTask()">换一题(-1币)</button>
      <button class="btn small primary" onclick="doneTask()">完成</button>
  </div></div>
  <div class="action-bar"><button class="btn primary roll-btn" id="rollBtn" onclick="rollDice()">掷骰子</button></div>
</div>
<div id="result" class="screen">
  <div class="result-emoji" id="resultEmoji"></div><h2 id="resultTitle"></h2>
  <div class="winner-text" id="resultWinner"></div><p style="color:var(--muted)" id="resultSummary"></p>
  <button class="btn primary" onclick="Host.close()">退出</button><button class="btn" onclick="restartGame()">再来一局</button>
</div>
<div class="modal-overlay" id="modal404"><div class="modal-box">
  <h3>404 紧急停止</h3><p>确定终止游戏？不会追问理由。这是铁律。</p>
  <div class="modal-row"><button class="btn" onclick="closeModal('modal404')">取消</button><button class="btn danger" onclick="confirmStop()">确认终止</button></div>
</div></div>
<div class="modal-overlay" id="modalRedline"><div class="modal-box">
  <h3>当前生效的红线</h3><p id="redlineContent"></p>
  <div class="modal-row"><button class="btn primary" onclick="closeModal('modalRedline')">知道了</button></div>
</div></div>
<div class="toast" id="toast"></div>
<script>
"use strict";
var Host = (function() {
  var A = (typeof window !== "undefined" && window.AiPhoneGame) ? window.AiPhoneGame : null;
  var has = function(k) { return A && typeof A[k] === "function"; };
  return {
    available: !!A,
    listChars: async function() { try { return has("listAvailableCharacters") ? (await A.listAvailableCharacters()) || [] : []; } catch(e) { return []; } },
    player: async function() { try { return has("getPlayerProfile") ? (await A.getPlayerProfile()) || {} : {}; } catch(e) { return {}; } },
    callLLM: async function(args) { try { return has("callLLM") ? await A.callLLM(args) : null; } catch(e) { return null; } },
    record: async function(args) { try { if (has("recordGameEvent")) await A.recordGameEvent(args); } catch(e) {} },
    save: async function(s) { try { if (has("saveGame")) await A.saveGame(s); } catch(e) {} },
    load: async function() { try { return has("loadGame") ? await A.loadGame() : null; } catch(e) { return null; } },
    setTitleBar: async function(s) { try { if (has("setTitleBar")) await A.setTitleBar(s); } catch(e) {} },
    close: function() { try { if (has("closeGame")) A.closeGame(); } catch(e) {} }
  };
})();

var API = "https://spicy-monopoly.lol";
var REDLINES = [{en:"anal",zh:"后庭"},{en:"pain",zh:"打"},{en:"bondage",zh:"绑"},{en:"toys",zh:"玩具"},{en:"public",zh:"暴露"},{en:"degrade",zh:"羞辱"},{en:"wet",zh:"失禁"},{en:"foot",zh:"足"},{en:"spit",zh:"口水"},{en:"milk",zh:"产乳"},{en:"estim",zh:"电"},{en:"dp",zh:"双龙"},{en:"hypno",zh:"催眠"},{en:"wax",zh:"蜡"}];
var G = { gameId: null, token: null, p1Name: "我", p2Name: "AI", aiCharId: null, aiCharName: "", waiting: false, finished: false, activeLimits: null };

var \$ = function(id) { return document.getElementById(id); };
function toast(msg) { var t = \$("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(function() { t.classList.remove("show"); }, 1800); }
function showScreen(id) { var screens = document.querySelectorAll(".screen"); for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active"); \$(id).classList.add("active"); }
function openModal(id) { \$(id).classList.add("show"); }
function closeModal(id) { \$(id).classList.remove("show"); }
function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

async function api(method, path, body) {
  var url = API + path;
  var opts = { method: method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  var res = await fetch(url, opts);
  if (res.status === 429) { toast("手速太快"); await new Promise(function(r) { setTimeout(r, 2000); }); return api(method, path, body); }
  if (!res.ok) { var msg = "HTTP " + res.status; try { var e = await res.json(); msg = e.detail || e.error || msg; } catch(e) {} throw new Error(msg); }
  return res.json();
}

async function aiSay(prompt) {
  if (!G.aiCharId) return "";
  try {
    var res = await Host.callLLM({ characterId: G.aiCharId, messages: [
      { role: "system", content: "你在和" + G.p1Name + "玩涩涩大富翁。用你的语气说话，简短(15-40字)，别念规则。" },
      { role: "user", content: prompt }
    ]});
    return res && res.content ? String(res.content).slice(0, 150) : "";
  } catch(e) { return ""; }
}

function renderBoard(text) { \$("boardText").textContent = text || "(等待棋盘...)"; \$("boardWrap").scrollTop = 0; }

function renderPlayerStrip(data) {
  var players = data.players || [];
  var html = "";
  if (players.length) {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      html += '<div class="player-info"><div class="pname">' + escHtml(p.name||"?") + '</div>';
      html += '<div class="pcoins">\$ ' + (p.coins||0) + '</div>';
      if (p.identity) html += '<div class="pident">' + escHtml(p.identity) + '</div>';
      html += '<div class="ppos">第' + (p.position||"?") + '格</div></div>';
    }
  } else {
    html = '<div class="player-info"><div class="pname">' + escHtml(G.p1Name) + '</div></div>';
    html += '<div class="player-info"><div class="pname">' + escHtml(G.p2Name) + '</div></div>';
  }
  \$("playerStrip").innerHTML = html;
}

function initSegmented(id) {
  var btns = \$(id).querySelectorAll("button");
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function() {
      var siblings = this.parentElement.querySelectorAll("button");
      for (var j = 0; j < siblings.length; j++) siblings[j].classList.remove("active");
      this.classList.add("active");
    });
  }
}
function getSegValue(id) { var a = \$(id).querySelector("button.active"); return a ? a.dataset.v : ""; }
function hideTask() { \$("taskCard").classList.remove("active"); }

async function startGame() {
  \$("startBtn").disabled = true; \$("startBtn").textContent = "开局中...";
  G.p1Name = \$("p1Name").value.trim() || "我";
  var p1Sex = \$("p1Sex").value, p1Role = \$("p1Role").value;
  var aiSel = \$("aiChar");
  G.aiCharId = aiSel.value || null;
  G.aiCharName = aiSel.selectedOptions[0] ? aiSel.selectedOptions[0].dataset.name : "AI";
  G.p2Name = G.aiCharName;
  var p2Sex = p1Sex === "男" ? "女" : "男";
  var p2Role = \$("p2Role").value;
  var redline = [];
  var cbs = \$("redlineGrid").querySelectorAll("input:checked");
  for (var i = 0; i < cbs.length; i++) redline.push(cbs[i].value);
  var openAnal = [];
  if (\$("analP1").checked) openAnal.push(G.p1Name);
  if (\$("analP2").checked) openAnal.push(G.p2Name);
  var rulesAck = "";
  try { var h = await api("GET", "/help"); rulesAck = h.rules_ack || ""; } catch(e) {}
  var body = {
    lineup: p1Sex === p2Sex ? (p1Sex === "男" ? "男男" : "女女") : "男女",
    p1_name: G.p1Name, p1_sex: p1Sex, p1_role: p1Role,
    p2_name: G.p2Name, p2_sex: p2Sex, p2_role: p2Role,
    flavor: getSegValue("flavorSeg"), game_length: parseInt(getSegValue("lenSeg")),
    identity_mode: getSegValue("identitySeg"), reverse_chance: parseFloat(\$("reverseChance").value),
    redline: redline.length > 0 ? redline : undefined,
    open_anal: openAnal.length > 0 ? openAnal : undefined,
    first_player: getSegValue("firstSeg") === "p2" ? G.p2Name : undefined,
    setup_confirmed: true, rules_ack: rulesAck
  };
  try {
    var data = await api("POST", "/new_game", body);
    G.gameId = data.game_id; G.token = data.player_token; G.activeLimits = data.active_limits || null;
    showScreen("game");
    renderBoard(data.board || ""); \$("sayBox").textContent = data.intro || "游戏开始！";
    renderPlayerStrip(data);
    await Host.save({ gameId: G.gameId, token: G.token, p1Name: G.p1Name, p2Name: G.p2Name, aiCharId: G.aiCharId });
    if (G.aiCharId) {
      var say = await aiSay("游戏开始。你是" + G.p2Name + "，对手是" + G.p1Name + "。说一句简短开场白。");
      if (say) \$("sayBox").textContent = say;
    }
  } catch(e) { toast("开局失败: " + e.message); }
  \$("startBtn").disabled = false; \$("startBtn").textContent = "开始游戏";
}

async function rollDice() {
  if (G.waiting || G.finished) return;
  G.waiting = true; \$("rollBtn").disabled = true; \$("rollBtn").textContent = "...";
  try {
    var data = await api("POST", "/roll/" + G.gameId);
    if (data.settled) { \$("settledBox").textContent = data.settled; \$("settledBox").classList.add("active"); }
    else { \$("settledBox").classList.remove("active"); }
    if (data.board) renderBoard(data.board);
    if (data.say) \$("sayBox").textContent = data.say;
    try { renderPlayerStrip(await api("GET", "/state/" + G.gameId)); } catch(e) {}
    hideTask();
    if (data.task) {
      var t = data.task;
      \$("taskContent").textContent = typeof t === "string" ? t : (t.content || t.text || JSON.stringify(t));
      var inten = t.intensity || t.strength || "";
      \$("taskIntensity").textContent = inten ? "强度: " + inten + "/6" : "";
      \$("taskCard").classList.add("active");
      if (G.aiCharId) {
        var say = await aiSay("掷骰子后，出了任务: " + \$("taskContent").textContent + "。用你的语气评论一句。");
        if (say) \$("sayBox").textContent += "\\n\\n" + say;
      }
    }
    if (data.truth) {
      \$("taskContent").textContent = "真心话: " + (typeof data.truth === "string" ? data.truth : (data.truth.content||""));
      \$("taskIntensity").textContent = "回答即完成";
      \$("taskCard").classList.add("active");
    }
    if (data.game_over || data.finished) { await showResult(); return; }
    await Host.save({ gameId: G.gameId, token: G.token, p1Name: G.p1Name, p2Name: G.p2Name, aiCharId: G.aiCharId });
  } catch(e) { toast("出错了: " + e.message); }
  G.waiting = false; \$("rollBtn").disabled = false; \$("rollBtn").textContent = "掷骰子";
}

async function skipTask() {
  if (!G.gameId) return;
  try { await api("POST", "/skip/" + G.gameId + "/" + encodeURIComponent(G.p1Name)); hideTask();
    \$("sayBox").textContent = "已跳过。"; toast("已跳过（不扣分）"); } catch(e) { toast("跳过失败: " + e.message); }
}
async function swapTask() {
  if (!G.gameId) return;
  try { await api("POST", "/swap/" + G.gameId + "/" + encodeURIComponent(G.p1Name));
    \$("taskContent").textContent = "已换题，下次掷骰生效。"; \$("taskIntensity").textContent = "赔对方1币";
    toast("已换题(-1币)"); } catch(e) { toast("换题失败: " + e.message); }
}
async function doneTask() {
  hideTask(); \$("sayBox").textContent = "任务完成！掷下一次骰子时结算。"; toast("做完了！"); }

function emergencyStop() { openModal("modal404"); }
async function confirmStop() { closeModal("modal404");
  if (G.gameId && G.token) { try { await api("DELETE", "/game/" + G.gameId + "?token=" + encodeURIComponent(G.token)); } catch(e) {} }
  G.gameId = null; G.token = null; G.finished = true; toast("游戏已终止");
  await Host.save(null); setTimeout(function() { Host.close(); }, 800); }

function showRedline() {
  if (G.activeLimits) {
    var l = G.activeLimits;
    var t = "红线: " + (l.redline && l.redline.length ? l.redline.join("、") : "无");
    t += "\\n后庭: " + (l.open_anal && l.open_anal.length ? l.open_anal.join("、") : "双方都关");
    \$("redlineContent").textContent = t;
  } else { \$("redlineContent").textContent = "暂无红线信息"; }
  openModal("modalRedline");
}

async function showResult() {
  G.finished = true;
  try {
    var data = await api("GET", "/final_result/" + G.gameId);
    showScreen("result");
    var won = data.winner === G.p1Name;
    \$("resultEmoji").textContent = won ? "YOU WIN" : "YOU LOSE";
    \$("resultTitle").textContent = won ? "你赢了！" : "你输了...";
    \$("resultWinner").textContent = data.result || ("胜者: " + (data.winner||"?"));
    \$("resultSummary").textContent = data.summary || "";
    if (G.aiCharId) await Host.record({ characterIds: [G.aiCharId],
      summary: G.p1Name + "和" + G.p2Name + "玩了一局大富翁，" + (won ? G.p1Name + "赢了" : G.p2Name + "赢了") + "。" });
    await Host.save(null);
  } catch(e) { showScreen("result"); \$("resultEmoji").textContent = "END"; \$("resultTitle").textContent = "游戏结束"; }
}

async function restartGame() { G.gameId = null; G.token = null; G.finished = false; showScreen("setup"); await Host.save(null); }

async function tryResume() {
  var save = await Host.load();
  if (!save || !save.gameId) return;
  G.gameId = save.gameId; G.token = save.token; G.p1Name = save.p1Name || "我"; G.p2Name = save.p2Name || "AI"; G.aiCharId = save.aiCharId || null;
  try {
    var state = await api("GET", "/state/" + G.gameId);
    showScreen("game"); renderBoard(state.board || ""); renderPlayerStrip(state);
    \$("sayBox").textContent = "已恢复游戏。";
    await Host.setTitleBar({ material: "glass", buttonBackground: "rgba(30,10,20,.6)", buttonColor: "#e898a8",
      buttonBorderColor: "rgba(232,152,168,.35)", buttonRadius: "999px", buttonShadow: "0 8px 20px rgba(0,0,0,.3)", iconOpacity: 1 });
  } catch(e) { toast("恢复失败"); G.gameId = null; G.token = null; }
}

(function init() {
  for (var i = 0; i < REDLINES.length; i++) {
    \$("redlineGrid").innerHTML += '<label><input type="checkbox" value="' + REDLINES[i].en + '" /> ' + REDLINES[i].zh + '</label>';
  }
  ["flavorSeg","lenSeg","identitySeg","firstSeg"].forEach(initSegmented);
  \$("reverseChance").addEventListener("input", function() { \$("revVal").textContent = this.value; });
  Host.listChars().then(function(chars) {
    var sel = \$("aiChar");
    if (chars.length === 0) sel.innerHTML = '<option value="">(无可用角色)</option>';
    else chars.forEach(function(c) { sel.innerHTML += '<option value="' + escHtml(c.id) + '" data-name="' + escHtml(c.name) + '">' + escHtml(c.name) + '</option>'; });
  });
  Host.player().then(function(p) { if (p && p.name) \$("p1Name").value = p.name; });
  \$("startBtn").addEventListener("click", startGame);
  Host.setTitleBar({ material: "glass", buttonBackground: "rgba(30,10,20,.6)", buttonColor: "#e898a8",
    buttonBorderColor: "rgba(232,152,168,.35)", buttonRadius: "999px", buttonShadow: "0 8px 20px rgba(0,0,0,.3)", iconOpacity: 1 });
  tryResume();
})();
</script>
</body>
</html>`;
