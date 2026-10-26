create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text check (char_length(display_name) <= 100),
 avatar_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.trips (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 120),
 destination text not null check (char_length(destination) between 1 and 120),
 country text check (char_length(country) <= 120),
 starts_on date, ends_on date, currency char(3) not null default 'USD',
 budget numeric(12,2) not null default 0 check (budget >= 0),
 travel_style text, interests text[] not null default '{}', group_size smallint not null default 1 check (group_size between 1 and 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index if not exists trips_owner_dates_idx on public.trips(owner_id, starts_on);
create table if not exists public.trip_members (
 trip_id uuid not null references public.trips(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'editor' check(role in ('editor','viewer')),
 created_at timestamptz not null default now(), primary key(trip_id,user_id)
);
create index if not exists trip_members_user_idx on public.trip_members(user_id);
create table if not exists public.itinerary_items (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 day_date date not null, title text not null check(char_length(title) between 1 and 180),
 notes text, starts_at time, ends_at time, place_name text, latitude double precision, longitude double precision,
 sort_order integer not null default 0, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists itinerary_trip_day_idx on public.itinerary_items(trip_id,day_date,sort_order);
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 amount numeric(12,2) not null check(amount >= 0), currency char(3) not null default 'USD',
 category text not null, description text, incurred_on date, created_at timestamptz not null default now()
);
create index if not exists expenses_trip_date_idx on public.expenses(trip_id,incurred_on);
create table if not exists public.saved_places (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 trip_id uuid references public.trips(id) on delete cascade, name text not null, address text,
 latitude double precision, longitude double precision, source text, created_at timestamptz not null default now()
);
create table if not exists public.trip_documents (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id) on delete cascade, storage_path text not null,
 file_name text not null, content_type text, created_at timestamptz not null default now()
);
create table if not exists public.journal_entries (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade, entry_date date not null,
 title text, body text, photo_paths text[] not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.trip_reminders (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, remind_at timestamptz not null,
 title text not null, completed_at timestamptz, created_at timestamptz not null default now()
);
create or replace function public.can_access_trip(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.trips t where t.id=target and t.owner_id=auth.uid()) or exists(select 1 from public.trip_members m where m.trip_id=target and m.user_id=auth.uid());
$$;
create or replace function public.can_edit_trip(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.trips t where t.id=target and t.owner_id=auth.uid()) or exists(select 1 from public.trip_members m where m.trip_id=target and m.user_id=auth.uid() and m.role='editor');
$$;
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.expenses enable row level security;
alter table public.saved_places enable row level security;
alter table public.trip_documents enable row level security;
alter table public.journal_entries enable row level security;
alter table public.trip_reminders enable row level security;
create policy profiles_read_own on public.profiles for select using(id=auth.uid());
create policy profiles_insert_own on public.profiles for insert with check(id=auth.uid());
create policy profiles_update_own on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy trips_read_members on public.trips for select using(owner_id=auth.uid() or public.can_access_trip(id));
create policy trips_insert_owner on public.trips for insert with check(owner_id=auth.uid());
create policy trips_update_owner on public.trips for update using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy trips_delete_owner on public.trips for delete using(owner_id=auth.uid());
create policy memberships_read on public.trip_members for select using(user_id=auth.uid() or exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=auth.uid()));
create policy memberships_owner_manage on public.trip_members for all using(exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=auth.uid())) with check(exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=auth.uid()));
create policy itinerary_read on public.itinerary_items for select using(public.can_access_trip(trip_id));
create policy itinerary_edit on public.itinerary_items for all using(public.can_edit_trip(trip_id)) with check(public.can_edit_trip(trip_id));
create policy expenses_read on public.expenses for select using(public.can_access_trip(trip_id));
create policy expenses_edit on public.expenses for all using(public.can_edit_trip(trip_id)) with check(public.can_edit_trip(trip_id) and created_by=auth.uid());
create policy places_own on public.saved_places for all using(user_id=auth.uid()) with check(user_id=auth.uid() and (trip_id is null or public.can_access_trip(trip_id)));
create policy documents_read on public.trip_documents for select using(public.can_access_trip(trip_id));
create policy documents_edit on public.trip_documents for all using(public.can_edit_trip(trip_id)) with check(public.can_edit_trip(trip_id) and uploaded_by=auth.uid());
create policy journal_read on public.journal_entries for select using(public.can_access_trip(trip_id));
create policy journal_edit on public.journal_entries for all using(public.can_edit_trip(trip_id)) with check(public.can_edit_trip(trip_id) and author_id=auth.uid());
create policy reminders_own on public.trip_reminders for all using(user_id=auth.uid() and public.can_access_trip(trip_id)) with check(user_id=auth.uid() and public.can_access_trip(trip_id));
