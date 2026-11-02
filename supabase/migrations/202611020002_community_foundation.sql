-- Social travel features. Posts are text-first; media storage can be added with
-- a private moderation pipeline before public uploads are enabled.
create table if not exists public.travel_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  location text check (char_length(coalesce(location,'')) <= 160),
  created_at timestamptz not null default now()
);
create table if not exists public.travel_post_likes (
  post_id uuid not null references public.travel_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table if not exists public.travel_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.travel_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create table if not exists public.travel_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(follower_id,followed_id),
  check(follower_id <> followed_id)
);
alter table public.travel_posts enable row level security;
alter table public.travel_post_likes enable row level security;
alter table public.travel_post_comments enable row level security;
alter table public.travel_follows enable row level security;
create policy posts_read on public.travel_posts for select to authenticated using (true);
create policy posts_create on public.travel_posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_owner_delete on public.travel_posts for delete to authenticated using (author_id = auth.uid());
create policy post_likes_read on public.travel_post_likes for select to authenticated using (true);
create policy post_likes_manage on public.travel_post_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy post_comments_read on public.travel_post_comments for select to authenticated using (true);
create policy post_comments_create on public.travel_post_comments for insert to authenticated with check (author_id = auth.uid());
create policy post_comments_owner_delete on public.travel_post_comments for delete to authenticated using (author_id = auth.uid());
create policy follows_read on public.travel_follows for select to authenticated using (true);
create policy follows_manage on public.travel_follows for all to authenticated using (follower_id = auth.uid()) with check (follower_id = auth.uid());
grant select,insert,delete on public.travel_posts,public.travel_post_likes,public.travel_post_comments,public.travel_follows to authenticated;
