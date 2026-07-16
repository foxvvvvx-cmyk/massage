-- 云备份桶一次性初始化（在"你自己的" Supabase 项目的 SQL Editor 运行一次）。
--
-- 为什么需要这一步：App 的云备份只使用 anon（publishable）key，
-- 不再要求填 service_role key —— 管理员钥匙绝不应该放进浏览器。
-- anon key 无法创建存储桶，所以桶和访问策略在这里预先建好。
--
-- 安全说明：下面的策略把 anon key 的读写范围严格限制在 ai-phone-backup
-- 这一个桶内，项目里的其他表、桶不受影响。备份数据是否敏感取决于你
-- 自己：anon key 只保存在你自己的浏览器里，不要把它发给别人。

insert into storage.buckets (id, name, public)
values ('ai-phone-backup', 'ai-phone-backup', false)
on conflict (id) do nothing;

drop policy if exists "ai_phone_backup_select" on storage.objects;
create policy "ai_phone_backup_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'ai-phone-backup');

drop policy if exists "ai_phone_backup_insert" on storage.objects;
create policy "ai_phone_backup_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'ai-phone-backup');

drop policy if exists "ai_phone_backup_update" on storage.objects;
create policy "ai_phone_backup_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'ai-phone-backup')
  with check (bucket_id = 'ai-phone-backup');

drop policy if exists "ai_phone_backup_delete" on storage.objects;
create policy "ai_phone_backup_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'ai-phone-backup');
