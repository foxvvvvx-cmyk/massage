// lib/memories-sync.ts
// Supabase memory sync — shares the same memories table as 沈度 (shendu)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function sbHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

export type SyncedMemory = {
  id: number;
  content: string;
  category: string;
  tags: string;
  usage_count: number;
  last_used: string | null;
  source: string;
  created_at: string;
  character_id: string;
  app_source: string;
};

// ── Name → character_id mapping (same convention as 沈度) ──
const NAME_TO_ID: Record<string, string> = {
  "沈度": "shendu",
  "Monday": "monday",
  "monday": "monday",
  "Butler": "butler",
  "butler": "butler",
  "Nox": "nox",
  "nox": "nox",
};

export function resolveCharacterId(characterName: string): string {
  return NAME_TO_ID[characterName] || characterName.toLowerCase().replace(/\s+/g, "_");
}

// ── Fetch memories for a given character ──
export async function fetchMemories(characterId: string): Promise<SyncedMemory[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const url = `${SUPABASE_URL}/rest/v1/memories?select=*&character_id=eq.${encodeURIComponent(characterId)}&order=created_at.desc&limit=100`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) return [];
  return res.json();
}

// ── Push a single memory to Supabase ──
export async function pushMemory(memory: {
  id: number;
  content: string;
  category?: string;
  tags?: string;
  character_id: string;
  source?: string;
}): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/memories`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify([{
        id: memory.id,
        content: memory.content,
        category: memory.category || "默认",
        tags: memory.tags || "",
        usage_count: 0,
        source: memory.source || "manual",
        created_at: new Date().toISOString(),
        character_id: memory.character_id,
        app_source: "virtual-phone",
      }]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Push a batch of memories ──
export async function pushMemoriesBatch(memories: SyncedMemory[]): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !memories.length) return false;
  try {
    const rows = memories.map((m) => ({
      id: m.id,
      content: m.content,
      category: m.category || "默认",
      tags: m.tags || "",
      usage_count: m.usage_count || 0,
      last_used: m.last_used || null,
      source: m.source || "manual",
      created_at: m.created_at || new Date().toISOString(),
      character_id: m.character_id,
      app_source: "virtual-phone",
    }));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/memories`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify(rows),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Delete a memory ──
export async function deleteMemoryFromCloud(id: number): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/memories?id=eq.${id}`, {
      method: "DELETE",
      headers: sbHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Check if Supabase is configured ──
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}
