-- Supabase SQL for the game hall marketplace.
-- Run this once in the Supabase SQL editor.

create table if not exists public.game_hall_games (
  id text primary key,

  title text not null,
  code_name text not null,
  subtitle text not null default '',
  synopsis text not null default '',
  play_note text not null default '',
  cover_image text not null default '',
  tags jsonb not null default '[]'::jsonb,

  author_id text not null default 'anonymous',
  author_name text not null default '匿名作者',
  author_avatar text not null default '',
  source text not null default 'community' check (source in ('builtin', 'community', 'local')),
  version integer not null default 1,

  role_slots jsonb not null default '[]'::jsonb,
  picker_html text not null,
  game_html text not null,
  allow_external_control boolean not null default false,

  purchase_count integer not null default 0 check (purchase_count >= 0),
  rating numeric not null default 0 check (rating >= 0 and rating <= 5),
  like_count integer not null default 0 check (like_count >= 0),
  favorite_count integer not null default 0 check (favorite_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),

  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_hall_games
  add column if not exists role_slots jsonb not null default '[]'::jsonb;

alter table public.game_hall_games
  add column if not exists picker_html text not null default '';

alter table public.game_hall_games
  add column if not exists game_html text not null default '';

alter table public.game_hall_games
  add column if not exists allow_external_control boolean not null default false;

alter table public.game_hall_games
  add column if not exists play_note text not null default '';

alter table public.game_hall_games
  add column if not exists cover_image text not null default '';

alter table public.game_hall_games
  add column if not exists author_avatar text not null default '';

alter table public.game_hall_games
  add column if not exists like_count integer not null default 0 check (like_count >= 0);

alter table public.game_hall_games
  add column if not exists favorite_count integer not null default 0 check (favorite_count >= 0);

alter table public.game_hall_games
  add column if not exists comment_count integer not null default 0 check (comment_count >= 0);

create index if not exists game_hall_games_updated_idx
  on public.game_hall_games (updated_at desc)
  where deleted_at is null;

create index if not exists game_hall_games_author_idx
  on public.game_hall_games (author_id, updated_at desc)
  where deleted_at is null;

create index if not exists game_hall_games_tags_idx
  on public.game_hall_games using gin (tags);

create table if not exists public.game_hall_likes (
  game_id text not null references public.game_hall_games(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index if not exists game_hall_likes_user_idx
  on public.game_hall_likes (user_id, created_at desc);

create table if not exists public.game_hall_favorites (
  game_id text not null references public.game_hall_games(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index if not exists game_hall_favorites_user_idx
  on public.game_hall_favorites (user_id, created_at desc);

create table if not exists public.game_hall_comments (
  id text primary key,
  game_id text not null references public.game_hall_games(id) on delete cascade,
  parent_id text references public.game_hall_comments(id) on delete cascade,
  author_id text not null,
  author_name text not null default '匿名玩家',
  author_avatar text not null default '',
  content text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.game_hall_comments
  add column if not exists parent_id text references public.game_hall_comments(id) on delete cascade;

create index if not exists game_hall_comments_game_idx
  on public.game_hall_comments (game_id, created_at asc)
  where deleted_at is null;

create index if not exists game_hall_comments_parent_idx
  on public.game_hall_comments (game_id, parent_id, created_at asc)
  where deleted_at is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'game-hall-assets',
  'game-hall-assets',
  true,
  1048576,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.game_hall_games enable row level security;
alter table public.game_hall_likes enable row level security;
alter table public.game_hall_favorites enable row level security;
alter table public.game_hall_comments enable row level security;

grant select on public.game_hall_games to anon;
grant select on public.game_hall_likes to anon;
grant select on public.game_hall_favorites to anon;
grant select on public.game_hall_comments to anon;

drop policy if exists "game_hall_games_public_read" on public.game_hall_games;
create policy "game_hall_games_public_read"
  on public.game_hall_games
  for select
  to anon
  using (deleted_at is null);

drop policy if exists "game_hall_likes_public_read" on public.game_hall_likes;
create policy "game_hall_likes_public_read"
  on public.game_hall_likes
  for select
  to anon
  using (true);

drop policy if exists "game_hall_favorites_public_read" on public.game_hall_favorites;
create policy "game_hall_favorites_public_read"
  on public.game_hall_favorites
  for select
  to anon
  using (true);

drop policy if exists "game_hall_comments_public_read" on public.game_hall_comments;
create policy "game_hall_comments_public_read"
  on public.game_hall_comments
  for select
  to anon
  using (deleted_at is null);

alter table public.game_hall_games replica identity full;
alter table public.game_hall_likes replica identity full;
alter table public.game_hall_favorites replica identity full;
alter table public.game_hall_comments replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_hall_games'
  ) then
    alter publication supabase_realtime add table public.game_hall_games;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_hall_comments'
  ) then
    alter publication supabase_realtime add table public.game_hall_comments;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ── 原子计数 RPC ─────────────────────────────────────────────
-- 点赞/收藏计数原先由 API 先读后写，多人并发会丢更新。
-- 这里改为在单个事务里：锁定游戏行 → 增删关系行 → 按关系表实数回写计数。

create or replace function public.game_hall_toggle_like(
  p_game_id text,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
  v_game public.game_hall_games;
begin
  -- 锁定游戏行，让同一游戏上的计数更新串行执行
  perform 1 from public.game_hall_games
   where id = p_game_id and deleted_at is null
   for update;
  if not found then
    return null;
  end if;

  delete from public.game_hall_likes
   where game_id = p_game_id and user_id = p_user_id;
  if found then
    v_liked := false;
  else
    insert into public.game_hall_likes (game_id, user_id)
    values (p_game_id, p_user_id)
    on conflict (game_id, user_id) do nothing;
    v_liked := true;
  end if;

  update public.game_hall_games
     set like_count = (select count(*) from public.game_hall_likes where game_id = p_game_id),
         updated_at = now()
   where id = p_game_id
   returning * into v_game;

  return jsonb_build_object('liked', v_liked, 'game', to_jsonb(v_game));
end;
$$;

create or replace function public.game_hall_set_favorite(
  p_game_id text,
  p_user_id text,
  p_favorited boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.game_hall_games;
begin
  perform 1 from public.game_hall_games
   where id = p_game_id and deleted_at is null
   for update;
  if not found then
    return null;
  end if;

  if p_favorited then
    insert into public.game_hall_favorites (game_id, user_id)
    values (p_game_id, p_user_id)
    on conflict (game_id, user_id) do nothing;
  else
    delete from public.game_hall_favorites
     where game_id = p_game_id and user_id = p_user_id;
  end if;

  update public.game_hall_games
     set favorite_count = (select count(*) from public.game_hall_favorites where game_id = p_game_id),
         updated_at = now()
   where id = p_game_id
   returning * into v_game;

  return jsonb_build_object('favorited', p_favorited, 'game', to_jsonb(v_game));
end;
$$;

create or replace function public.game_hall_recount_comments(
  p_game_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform 1 from public.game_hall_games
   where id = p_game_id and deleted_at is null
   for update;
  if not found then
    return null;
  end if;

  update public.game_hall_games
     set comment_count = (
           select count(*) from public.game_hall_comments
            where game_id = p_game_id and deleted_at is null
         ),
         updated_at = now()
   where id = p_game_id
   returning comment_count into v_count;

  return v_count;
end;
$$;

-- 只允许服务端（service_role）调用，避免匿名用户伪造 user_id 直接刷 RPC
revoke execute on function public.game_hall_toggle_like(text, text) from public, anon;
revoke execute on function public.game_hall_set_favorite(text, text, boolean) from public, anon;
grant execute on function public.game_hall_toggle_like(text, text) to service_role;
grant execute on function public.game_hall_set_favorite(text, text, boolean) to service_role;
revoke execute on function public.game_hall_recount_comments(text) from public, anon;
grant execute on function public.game_hall_recount_comments(text) to service_role;


notify pgrst, 'reload schema';
