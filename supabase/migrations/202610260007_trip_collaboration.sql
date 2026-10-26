create table if not exists public.trip_invites (
 id uuid primary key default gen_random_uuid(),
 trip_id uuid not null references public.trips(id) on delete cascade,
 inviter_id uuid not null references auth.users(id) on delete cascade,
 invite_email text not null check(char_length(invite_email) between 3 and 254),
 role text not null check(role in ('editor','viewer')),
 token text not null unique check(token ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 accepted_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists trip_invites_owner_idx on public.trip_invites(trip_id,created_at desc);
create unique index if not exists trip_invites_one_pending_email_idx on public.trip_invites(trip_id,invite_email) where accepted_at is null;
alter table public.trip_invites enable row level security;
create policy trip_invites_owner_read on public.trip_invites for select
 using(exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=auth.uid()));
create policy trip_invites_owner_delete on public.trip_invites for delete
 using(exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=auth.uid()));

-- Trip participants may see the participant list and basic profile names.
drop policy if exists memberships_read on public.trip_members;
create policy memberships_shared_read on public.trip_members for select
 using(public.can_access_trip(trip_id));
create or replace function public.can_view_collaborator_profile(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select target=auth.uid()
 or exists(select 1 from public.trips t join public.trip_members m on m.trip_id=t.id where t.owner_id=auth.uid() and m.user_id=target)
 or exists(select 1 from public.trip_members mine join public.trip_members theirs on theirs.trip_id=mine.trip_id where mine.user_id=auth.uid() and theirs.user_id=target)
 or exists(select 1 from public.trips t join public.trip_members m on m.trip_id=t.id where t.owner_id=target and m.user_id=auth.uid());
$$;
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own_and_collaborators on public.profiles for select
 using(public.can_view_collaborator_profile(id));

revoke all on public.trip_invites from anon, authenticated;
grant select(id,trip_id,inviter_id,invite_email,role,expires_at,accepted_at,created_at)
 on public.trip_invites to authenticated;
grant delete on public.trip_invites to authenticated;

create or replace function public.create_trip_invite(p_trip_id uuid,p_email text,p_role text)
returns text language plpgsql security definer set search_path='' as $$
declare generated_token text;
begin
 if auth.uid() is null then raise exception 'Sign in to invite a collaborator'; end if;
 if p_role not in ('editor','viewer') then raise exception 'Choose viewer or editor access'; end if;
 if p_email is null or char_length(trim(p_email))>254 or trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address'; end if;
 if not exists(select 1 from public.trips t where t.id=p_trip_id and t.owner_id=auth.uid()) then raise exception 'Only the trip owner can invite collaborators'; end if;
 delete from public.trip_invites where trip_id=p_trip_id and accepted_at is null and expires_at<=now();
 if (select count(*) from public.trip_invites where trip_id=p_trip_id and accepted_at is null)>=20 then raise exception 'This trip has reached its pending invitation limit'; end if;
 generated_token:=pg_catalog.encode(extensions.gen_random_bytes(32),'hex');
 insert into public.trip_invites(trip_id,inviter_id,invite_email,role,token,expires_at)
 values(p_trip_id,auth.uid(),lower(trim(p_email)),p_role,generated_token,now()+interval '7 days');
 return generated_token;
end;
$$;

create or replace function public.accept_trip_invite(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.trip_invites%rowtype; current_email text;
begin
 if auth.uid() is null then raise exception 'Sign in to accept this invitation'; end if;
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'This invitation link is invalid'; end if;
 current_email:=lower(coalesce(auth.jwt()->>'email',''));
 select * into invitation from public.trip_invites i where i.token=p_token for update;
 if not found or invitation.accepted_at is not null or invitation.expires_at<=now() then raise exception 'This invitation has expired or was already used'; end if;
 if invitation.invite_email<>current_email then raise exception 'Sign in with the email address this invitation was sent to'; end if;
 insert into public.trip_members(trip_id,user_id,role) values(invitation.trip_id,auth.uid(),invitation.role)
 on conflict(trip_id,user_id) do update set role=excluded.role;
 update public.trip_invites set accepted_at=now() where id=invitation.id;
 return invitation.trip_id;
end;
$$;

revoke all on function public.create_trip_invite(uuid,text,text) from public,anon;
revoke all on function public.accept_trip_invite(text) from public,anon;
revoke all on function public.can_view_collaborator_profile(uuid) from public,anon;
grant execute on function public.create_trip_invite(uuid,text,text) to authenticated;
grant execute on function public.accept_trip_invite(text) to authenticated;
grant execute on function public.can_view_collaborator_profile(uuid) to authenticated;
