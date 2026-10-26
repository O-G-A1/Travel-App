-- Trip ownership must not be transferable through an editor's row update.
drop policy if exists trips_update_editors on public.trips;
drop policy if exists trips_update_owner on public.trips;
create policy trips_update_owner on public.trips
for update using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.can_access_trip(target uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.trips t where t.id=target and t.owner_id=auth.uid())
      or exists(select 1 from public.trip_members m where m.trip_id=target and m.user_id=auth.uid());
$$;
create or replace function public.can_edit_trip(target uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.trips t where t.id=target and t.owner_id=auth.uid())
      or exists(select 1 from public.trip_members m where m.trip_id=target and m.user_id=auth.uid() and m.role='editor');
$$;
revoke all on function public.can_access_trip(uuid) from public;
revoke all on function public.can_edit_trip(uuid) from public;
grant execute on function public.can_access_trip(uuid) to authenticated;
grant execute on function public.can_edit_trip(uuid) to authenticated;
