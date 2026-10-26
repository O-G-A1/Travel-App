create table if not exists public.packing_items (
 id uuid primary key default gen_random_uuid(),
 trip_id uuid not null references public.trips(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 160),
 category text not null default 'Essentials',
 is_packed boolean not null default false,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists packing_trip_sort_idx on public.packing_items(trip_id,category,sort_order);
alter table public.packing_items enable row level security;
create policy packing_read on public.packing_items for select using (public.can_access_trip(trip_id));
create policy packing_edit on public.packing_items for all using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id) and created_by=auth.uid());

create table if not exists public.emergency_contacts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 120),
 phone text not null check (char_length(phone) between 3 and 40),
 relationship text check (char_length(relationship) <= 80),
 notes text check (char_length(notes) <= 1000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists emergency_contacts_user_idx on public.emergency_contacts(user_id);
alter table public.emergency_contacts enable row level security;
create policy emergency_contacts_own on public.emergency_contacts for all using (user_id=auth.uid()) with check (user_id=auth.uid());
