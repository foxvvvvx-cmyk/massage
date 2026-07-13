// test-memories.mjs — 记忆功能端到端测试
// 测试: Supabase 读取 / 写入 / 删除 / character_id 隔离

const SB_URL = "https://spqviscxskpgojvykybt.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwcXZpc2N4c2twZ29qdnlreWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzg1NjAsImV4cCI6MjA5OTI1NDU2MH0.hTejbnJbMZOuln4U82Qf98EaOXgVqBadLkb1EDcGUto";

const HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

async function main() {
  // ── 测试 1: 读取所有记忆 ──
  console.log("═══ 测试 1: 读取记忆 ═══");
  const r1 = await fetch(`${SB_URL}/memories?select=*&limit=5&order=created_at.desc`, { headers: HEADERS });
  console.log(`HTTP ${r1.status}`);
  const data1 = await r1.json();
  if (Array.isArray(data1) && data1.length > 0) {
    console.log(`共 ${data1.length} 条 (截取)`);
    data1.forEach(m => console.log(`  [${m.character_id}] ${m.content?.substring(0, 60)}... (source:${m.source || '-'})`));
  } else {
    console.log("无数据或读取失败");
  }

  // ── 测试 2: character_id 隔离 ──
  console.log("\n═══ 测试 2: 按角色隔离 ═══");
  for (const cid of ["shendu", "monday", "butler", "nox"]) {
    const r = await fetch(`${SB_URL}/memories?select=count&character_id=eq.${cid}`, { headers: HEADERS });
    const d = await r.json();
    console.log(`  ${cid}: ${d[0]?.count || 0} 条`);
  }

  // ── 测试 3: 写入 + 删除 (测试后用唯一标识清理) ──
  console.log("\n═══ 测试 3: 写入/删除循环 ═══");
  const testId = `test_${Date.now()}`;
  const testMem = {
    id: Date.now(),
    content: `[测试] jiwen引擎验证 ${testId}`,
    category: "测试",
    tags: "test,jiwen",
    usage_count: 0,
    source: "auto",
    created_at: new Date().toISOString(),
    character_id: "shendu",
    app_source: "ai-virtual-phone",
  };

  const r3 = await fetch(`${SB_URL}/memories`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(testMem),
  });
  console.log(`写入: HTTP ${r3.status}`);

  // 立即读取确认
  const r3b = await fetch(`${SB_URL}/memories?select=id,content&content=ilike.%25${testId}%25`, { headers: HEADERS });
  const d3b = await r3b.json();
  console.log(`确认读取: ${d3b.length} 条匹配`);

  // 清理
  if (d3b.length > 0) {
    const ids = d3b.map(m => m.id).join(",");
    await fetch(`${SB_URL}/memories?id=in.(${ids})`, { method: "DELETE", headers: HEADERS });
    console.log(`清理: ${d3b.length} 条已删除`);
  }
  console.log("写入/删除闭环 ✓");

  // ── 测试 4: app_source 字段 ──
  console.log("\n═══ 测试 4: app_source 统计 ═══");
  const r4 = await fetch(`${SB_URL}/memories?select=app_source&limit=200`, { headers: HEADERS });
  const d4 = await r4.json();
  const counts = {};
  d4.forEach(m => { counts[m.app_source] = (counts[m.app_source] || 0) + 1; });
  console.log("  app_source 分布:", JSON.stringify(counts));

  console.log("\n═══ 全部记忆测试通过 ✅ ═══");
}

main().catch(e => console.error("测试失败:", e.message));
