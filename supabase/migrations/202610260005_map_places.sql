alter table public.trips add column if not exists destination_latitude double precision check(destination_latitude is null or destination_latitude between -90 and 90);
alter table public.trips add column if not exists destination_longitude double precision check(destination_longitude is null or destination_longitude between -180 and 180);
create index if not exists saved_places_trip_user_idx on public.saved_places(user_id,trip_id,created_at);
