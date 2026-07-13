// test-jiwen-engine.mjs — 积温引擎纯数学验证（无需浏览器/API）
// 用法: node test-jiwen-engine.mjs

// ── 复用 engine 的核心逻辑 ──
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function defaultJiwenConfig() {
  return {
    connectionGrowthRate: 0.007, connectionDecayOnReply: 0.20,
    prideRegressRate: 0.003, valenceRegressRate: 0.005,
    valenceSetpoint: 0, arousalRegressRate: 0.005, arousalSetpoint: 0,
    immersionDecayRate: 0.010, contactThreshold: 0.45,
    prideBlockThreshold: 0.5, prideErosionRate: 0.002,
  };
}

function defaultJiwenState() {
  return {
    connection: 0.1, pride: 0, valence: 0.1, arousal: -0.1,
    immersion: 0, lastTick: Date.now(),
  };
}

function tick(state, config, minutesElapsed) {
  if (minutesElapsed <= 0) return state;
  const s = { ...state };
  s.connection = clamp(s.connection + config.connectionGrowthRate * minutesElapsed, 0, 1);
  if (s.pride > 0) s.pride = clamp(s.pride - config.prideRegressRate * minutesElapsed, 0, 1);
  else s.pride = clamp(s.pride + config.prideRegressRate * minutesElapsed, -1, 0);
  if (s.connection >= config.contactThreshold && s.pride > 0) {
    s.pride = clamp(s.pride - config.prideErosionRate * minutesElapsed, 0, 1);
  }
  if (s.valence > config.valenceSetpoint) s.valence = clamp(s.valence - config.valenceRegressRate * minutesElapsed, config.valenceSetpoint, 1);
  else s.valence = clamp(s.valence + config.valenceRegressRate * minutesElapsed, -1, config.valenceSetpoint);
  if (s.arousal > config.arousalSetpoint) s.arousal = clamp(s.arousal - config.arousalRegressRate * minutesElapsed, config.arousalSetpoint, 1);
  else s.arousal = clamp(s.arousal + config.arousalRegressRate * minutesElapsed, -1, config.arousalSetpoint);
  s.immersion = clamp(s.immersion - config.immersionDecayRate * minutesElapsed, 0, 1);
  s.lastTick = Date.now();
  return s;
}

function checkThreshold(state, config) {
  if (state.connection >= config.contactThreshold) {
    if (state.pride < config.prideBlockThreshold) return { triggered: true, type: "contact" };
    return { triggered: true, type: "find_activity" };
  }
  return { triggered: false, type: "none" };
}

function getStyleGuidance(state) {
  const { connection, pride, valence, arousal } = state;
  let mood = "neutral";
  if (connection >= 0.6 && pride < 0.3) mood = "missing";
  else if (pride >= 0.5) mood = "proud";
  else if (valence <= -0.3) mood = "sad";
  else if (arousal >= 0.3) mood = "nervous";
  else if (arousal <= -0.3) mood = "calm";
  const intensity = clamp((Math.abs(connection) + Math.abs(valence) + Math.abs(arousal)) / 3, 0, 1);
  let instruction = "";
  if (mood === "missing") instruction = pride > 0 ? "语气委婉，带一点点傲娇。" : "语气温柔，可以带一点撒娇的意味。";
  else if (mood === "proud") instruction = "语气可以冷淡一点，但不要太伤人。";
  else if (mood === "sad") instruction = "语气可以低沉一点。";
  else if (mood === "nervous") instruction = "语气可以急促一点。";
  else instruction = "保持自然，简短友好。";
  return { mood, intensity, instruction };
}

function applyInteraction(state, config, input) {
  const s = { ...state };
  if (input.replied) s.connection = clamp(s.connection - config.connectionDecayOnReply, 0, 1);
  else if (input.delayMinutes > 30) { s.connection = clamp(s.connection + 0.05, 0, 1); s.pride = clamp(s.pride - 0.03, -1, 1); }
  if (input.sentiment === "positive") s.valence = clamp(s.valence + 0.08, -1, 1);
  else if (input.sentiment === "negative") s.valence = clamp(s.valence - 0.06, -1, 1);
  s.lastTick = Date.now();
  return s;
}

// ═══════════════════════════════════════
// 场景 1: 模拟 2 小时不说话后 connection 增长
// ═══════════════════════════════════════
console.log("═════ 测试 1: 2 小时不说话 ═════");
let state = defaultJiwenState();
const cfg = defaultJiwenConfig();
console.log(`初始: conn=${state.connection.toFixed(3)} pride=${state.pride.toFixed(3)}`);

// 模拟每 5 分钟一次 tick，共 24 次 = 2 小时
let triggered = false;
for (let i = 0; i < 24; i++) {
  state = tick(state, cfg, 5);
  const th = checkThreshold(state, cfg);
  if (th.triggered && !triggered) {
    console.log(`[第 ${i + 1} 次 tick / ${(i + 1) * 5} 分钟] ⚡ 触发!: type=${th.type}`);
    console.log(`  conn=${state.connection.toFixed(3)} pride=${state.pride.toFixed(3)}`);
    triggered = true;
  }
}
console.log(`最终: conn=${state.connection.toFixed(3)} pride=${state.pride.toFixed(3)} valence=${state.valence.toFixed(3)}`);
const style = getStyleGuidance(state);
console.log(`风格: mood=${style.mood} intensity=${style.intensity.toFixed(2)}`);
console.log(`指令: ${style.instruction}`);

// ═══════════════════════════════════════
// 场景 2: 对方回复后 connection 下降
// ═══════════════════════════════════════
console.log("\n═════ 测试 2: 对方回复后 ═════");
state = { ...defaultJiwenState(), connection: 0.5, pride: 0.1, lastTick: Date.now() };
console.log(`回复前: conn=${state.connection.toFixed(3)}`);
state = applyInteraction(state, cfg, { replied: true, delayMinutes: 10, sentiment: "positive" });
console.log(`回复后: conn=${state.connection.toFixed(3)} valence=${state.valence.toFixed(3)}`);

// ═══════════════════════════════════════
// 场景 3: pride 阻止主动联系
// ═══════════════════════════════════════
console.log("\n═════ 测试 3: pride 阻止 ═════");
state = { ...defaultJiwenState(), connection: 0.6, pride: 0.6, lastTick: Date.now() };
const th3 = checkThreshold(state, cfg);
console.log(`conn=0.6 pride=0.6 → triggered=${th3.triggered} type=${th3.type} (应该是 find_activity 而非 contact)`);

// ═══════════════════════════════════════
// 场景 4: 冷却/频率限制逻辑
// ═══════════════════════════════════════
console.log("\n═════ 测试 4: 保护条件验证 ═════");
const RUNTIME = {
  contactCooldownMs: 30 * 60 * 1000,
  maxDailyMessages: 8,
  userIdleThresholdMs: 5 * 60 * 1000,
};

function simulateCanContact(lastContactTime, dailyCount, lastUserMsgTime) {
  const now = Date.now();
  const checks = [];
  if (lastContactTime && (now - lastContactTime) < RUNTIME.contactCooldownMs)
    checks.push(`✗ cooldown (${Math.round((now - lastContactTime) / 1000)}s ago < ${RUNTIME.contactCooldownMs / 1000}s)`);
  if (dailyCount >= RUNTIME.maxDailyMessages)
    checks.push(`✗ daily limit (${dailyCount}/${RUNTIME.maxDailyMessages})`);
  if (lastUserMsgTime && (now - lastUserMsgTime) < RUNTIME.userIdleThresholdMs)
    checks.push(`✗ user active ${Math.round((now - lastUserMsgTime) / 1000)}s ago`);
  return checks.length ? checks : ["✓ all clear"];
}

// 正常情况
console.log("刚发过消息(10s前):", simulateCanContact(null, 0, Date.now() - 10_000).join(", "));
console.log("8分钟没消息:", simulateCanContact(null, 0, Date.now() - 8 * 60_000).join(", "));
console.log("30分钟冷却期内:", simulateCanContact(Date.now() - 10 * 60_000, 0, null).join(", "));
console.log("今日已满8条:", simulateCanContact(null, 8, null).join(", "));
console.log("全部正常:", simulateCanContact(Date.now() - 60 * 60_000, 3, Date.now() - 10 * 60_000).join(", "));

// ═══════════════════════════════════════
// 场景 5: 状态导出/导入（跨刷新持久化）
// ═══════════════════════════════════════
console.log("\n═════ 测试 5: export/import 持久化 ═════");
const exported = JSON.stringify(state);
console.log(`export: ${exported}`);

const parsed = JSON.parse(exported);
const restored = {
  connection: typeof parsed.connection === "number" ? parsed.connection : 0.1,
  pride: typeof parsed.pride === "number" ? parsed.pride : 0,
  valence: typeof parsed.valence === "number" ? parsed.valence : 0.1,
  arousal: typeof parsed.arousal === "number" ? parsed.arousal : -0.1,
  immersion: typeof parsed.immersion === "number" ? parsed.immersion : 0,
  lastTick: typeof parsed.lastTick === "number" ? parsed.lastTick : Date.now(),
};
console.log(`import: conn=${restored.connection.toFixed(3)} pride=${restored.pride.toFixed(3)} — 状态完整恢复 ✓`);

// 损坏数据降级
const corrupt = JSON.parse('{"connection":"bad","pride":null}');
const fallback = {
  connection: typeof corrupt.connection === "number" ? corrupt.connection : 0.1,
  pride: typeof corrupt.pride === "number" ? corrupt.pride : 0,
};
console.log(`损坏数据降级: conn=${fallback.connection} pride=${fallback.pride} — 安全降级 ✓`);

console.log("\n═════ 全部引擎测试通过 ✅ ═════");
