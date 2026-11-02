-- Additive foundation for Voyara's intercity and intrastate ride marketplace.
-- No existing planner data is altered or removed.
create table if not exists public.driver_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  licence_status text not null default 'unsubmitted' check (licence_status in ('unsubmitted','pending','verified','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.driver_vehicles (
  id uuid primary key default gen_random_uuid(), driver_id uuid not null references auth.users(id) on delete cascade,
  make text not null check (char_length(make) between 1 and 80), model text not null check (char_length(model) between 1 and 80),
  color text not null check (char_length(color) between 1 and 40), registration_region text not null check (char_length(registration_region) between 1 and 80),
  seats smallint not null check (seats between 1 and 12), verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);
create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(), driver_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.driver_vehicles(id) on delete set null,
  origin text not null check (char_length(origin) between 2 and 160), destination text not null check (char_length(destination) between 2 and 160),
  origin_region text, destination_region text, route_type text not null default 'interstate' check (route_type in ('intrastate','interstate')),
  departure_at timestamptz not null, available_seats smallint not null check (available_seats between 1 and 12),
  fare_per_seat numeric(12,2) not null check (fare_per_seat >= 0), currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  notes text check (char_length(coalesce(notes,'')) <= 1000), status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (departure_at > created_at - interval '1 day')
);
create index if not exists journeys_search_idx on public.journeys(status, departure_at, origin, destination);
create table if not exists public.journey_stops (
  id uuid primary key default gen_random_uuid(), journey_id uuid not null references public.journeys(id) on delete cascade,
  stop_order smallint not null check (stop_order between 1 and 20), location text not null check (char_length(location) between 2 and 160),
  arrival_at timestamptz, unique(journey_id, stop_order)
);
create table if not exists public.journey_bookings (
  id uuid primary key default gen_random_uuid(), journey_id uuid not null references public.journeys(id) on delete cascade,
  passenger_id uuid not null references auth.users(id) on delete cascade, seats smallint not null check (seats between 1 and 8),
  status text not null default 'requested' check (status in ('requested','accepted','declined','cancelled','completed')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required','pending_confirmation','paid','disputed')),
  passenger_note text check (char_length(coalesce(passenger_note,'')) <= 500), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(journey_id, passenger_id)
);
create index if not exists journey_bookings_passenger_idx on public.journey_bookings(passenger_id, created_at desc);
create table if not exists public.journey_reviews (
  id uuid primary key default gen_random_uuid(), journey_id uuid not null references public.journeys(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade, subject_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5), body text check (char_length(coalesce(body,'')) <= 1200), created_at timestamptz not null default now(),
  unique(journey_id, reviewer_id), check (reviewer_id <> subject_id)
);
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references auth.users(id) on delete set null, journey_id uuid references public.journeys(id) on delete set null,
  reason text not null check (reason in ('safety','harassment','fraud','content','other')), details text check (char_length(coalesce(details,'')) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')), created_at timestamptz not null default now()
);
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade, blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(blocker_id, blocked_id), check (blocker_id <> blocked_id)
);

alter table public.driver_profiles enable row level security;
alter table public.driver_vehicles enable row level security;
alter table public.journeys enable row level security;
alter table public.journey_stops enable row level security;
alter table public.journey_bookings enable row level security;
alter table public.journey_reviews enable row level security;
alter table public.user_reports enable row level security;
alter table public.user_blocks enable row level security;

create policy driver_profile_public_read on public.driver_profiles for select to authenticated using (true);
create policy driver_profile_owner_insert on public.driver_profiles for insert to authenticated with check (user_id = auth.uid());
create policy driver_profile_owner_update on public.driver_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy vehicle_public_verified_read on public.driver_vehicles for select to authenticated using (verification_status = 'verified' or driver_id = auth.uid());
create policy vehicle_owner_insert on public.driver_vehicles for insert to authenticated with check (driver_id = auth.uid());
create policy vehicle_owner_update on public.driver_vehicles for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy journeys_authenticated_read on public.journeys for select to authenticated using (status <> 'cancelled');
-- Public discovery exposes only a deliberate allowlist of non-identifying listing fields.
create policy journeys_public_discovery on public.journeys for select to anon using (status = 'open' and departure_at > now());
create policy journeys_owner_insert on public.journeys for insert to authenticated with check (driver_id = auth.uid() and vehicle_id is not null and exists(select 1 from public.driver_profiles d where d.user_id = auth.uid() and d.verification_status = 'verified' and d.licence_status = 'verified') and exists(select 1 from public.driver_vehicles v where v.id = vehicle_id and v.driver_id = auth.uid() and v.verification_status = 'verified'));
create policy journeys_owner_update on public.journeys for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy stops_authenticated_read on public.journey_stops for select to authenticated using (exists(select 1 from public.journeys j where j.id = journey_id and j.status <> 'cancelled'));
create policy stops_driver_manage on public.journey_stops for all to authenticated using (exists(select 1 from public.journeys j where j.id = journey_id and j.driver_id = auth.uid())) with check (exists(select 1 from public.journeys j where j.id = journey_id and j.driver_id = auth.uid()));
create policy bookings_participant_read on public.journey_bookings for select to authenticated using (passenger_id = auth.uid() or exists(select 1 from public.journeys j where j.id = journey_id and j.driver_id = auth.uid()));
create policy booking_passenger_request on public.journey_bookings for insert to authenticated with check (passenger_id = auth.uid() and exists(select 1 from public.journeys j where j.id = journey_id and j.status = 'open' and j.driver_id <> auth.uid()));
create policy booking_passenger_cancel on public.journey_bookings for update to authenticated using (passenger_id = auth.uid()) with check (passenger_id = auth.uid() and status = 'cancelled');
create policy booking_driver_update on public.journey_bookings for update to authenticated using (exists(select 1 from public.journeys j where j.id = journey_id and j.driver_id = auth.uid())) with check (exists(select 1 from public.journeys j where j.id = journey_id and j.driver_id = auth.uid()));
create policy reviews_participant_read on public.journey_reviews for select to authenticated using (true);
create policy reviews_verified_participant_insert on public.journey_reviews for insert to authenticated with check (reviewer_id = auth.uid() and exists(select 1 from public.journey_bookings b join public.journeys j on j.id = b.journey_id where b.journey_id = journey_id and b.status = 'completed' and ((b.passenger_id = auth.uid() and subject_id = j.driver_id) or (j.driver_id = auth.uid() and subject_id = b.passenger_id))));
create policy reports_owner_read on public.user_reports for select to authenticated using (reporter_id = auth.uid());
create policy reports_owner_insert on public.user_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy blocks_owner_manage on public.user_blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Verification is provider/admin controlled. A driver cannot self-attest by editing status fields.
create or replace function public.guard_marketplace_verification_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if coalesce(auth.role(),'') = 'authenticated' then
   if tg_table_name = 'driver_profiles' then
     if tg_op = 'INSERT' then new.verification_status := 'unverified'; new.licence_status := 'unsubmitted';
     elsif new.verification_status is distinct from old.verification_status or new.licence_status is distinct from old.licence_status then raise exception 'Verification status is managed by Voyara'; end if;
   elsif tg_table_name = 'driver_vehicles' then
     if tg_op = 'INSERT' then new.verification_status := 'pending';
     elsif new.verification_status is distinct from old.verification_status then raise exception 'Vehicle verification status is managed by Voyara'; end if;
   end if;
 end if;
 return new;
end; $$;
create trigger driver_profiles_verification_guard before insert or update on public.driver_profiles for each row execute function public.guard_marketplace_verification_fields();
create trigger driver_vehicles_verification_guard before insert or update on public.driver_vehicles for each row execute function public.guard_marketplace_verification_fields();

grant select, insert, update on public.driver_profiles, public.driver_vehicles, public.journeys, public.journey_stops, public.journey_reviews, public.user_reports, public.user_blocks to authenticated;
grant select (id, origin, destination, route_type, departure_at, available_seats, fare_per_seat, currency, notes) on public.journeys to anon;
grant select, insert on public.journey_bookings to authenticated;
grant delete on public.journey_stops, public.user_blocks to authenticated;

-- Capacity is reserved atomically when a driver accepts a request.
create or replace function public.accept_journey_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.journey_bookings%rowtype; seats_left smallint;
begin
 if auth.uid() is null then raise exception 'Sign in to manage bookings'; end if;
 select b.* into target from public.journey_bookings b where b.id = p_booking_id for update;
 if not found then raise exception 'Booking not found'; end if;
 if not exists(select 1 from public.journeys j where j.id = target.journey_id and j.driver_id = auth.uid() and j.status = 'open') then raise exception 'Only the journey driver can accept this booking'; end if;
 select available_seats into seats_left from public.journeys where id = target.journey_id for update;
 if target.status <> 'requested' then raise exception 'This request is no longer pending'; end if;
 if seats_left < target.seats then raise exception 'Not enough seats remain'; end if;
 update public.journeys set available_seats = available_seats - target.seats, updated_at = now() where id = target.journey_id;
 update public.journey_bookings set status = 'accepted', payment_status = 'pending_confirmation', updated_at = now() where id = target.id;
end; $$;
revoke all on function public.accept_journey_booking(uuid) from public, anon;
grant execute on function public.accept_journey_booking(uuid) to authenticated;

create or replace function public.decline_journey_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.journey_bookings%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in to manage bookings'; end if;
 select b.* into target from public.journey_bookings b where b.id = p_booking_id for update;
 if not found or not exists(select 1 from public.journeys j where j.id = target.journey_id and j.driver_id = auth.uid()) then raise exception 'Booking not found'; end if;
 if target.status <> 'requested' then raise exception 'This request is no longer pending'; end if;
 update public.journey_bookings set status = 'declined', updated_at = now() where id = target.id;
end; $$;
revoke all on function public.decline_journey_booking(uuid) from public, anon;
grant execute on function public.decline_journey_booking(uuid) to authenticated;

create or replace function public.cancel_journey_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.journey_bookings%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in to cancel a booking'; end if;
 select b.* into target from public.journey_bookings b where b.id = p_booking_id for update;
 if not found or target.passenger_id <> auth.uid() then raise exception 'Booking not found'; end if;
 if target.status not in ('requested','accepted') then raise exception 'This booking can no longer be cancelled'; end if;
 if target.status = 'accepted' then update public.journeys set available_seats = available_seats + target.seats, updated_at = now() where id = target.journey_id; end if;
 update public.journey_bookings set status = 'cancelled', updated_at = now() where id = target.id;
end; $$;
revoke all on function public.cancel_journey_booking(uuid) from public, anon;
grant execute on function public.cancel_journey_booking(uuid) to authenticated;
