-- 聊天记录同步表
-- 在 Supabase SQL Editor 中执行: https://supabase.com/dashboard/project/spqviscxskpgojvykybt/sql/new

CREATE TABLE IF NOT EXISTS chat_messages (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  role          TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'sent',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  media_type    TEXT,
  is_retracted  BOOLEAN DEFAULT false,
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按用户+会话+时间查询（最频繁的查询模式）
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_session
  ON chat_messages(user_id, session_id, created_at);

-- RLS：跟 memories 表一致，allow_all
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all ON chat_messages;
CREATE POLICY allow_all ON chat_messages FOR ALL USING (true);
