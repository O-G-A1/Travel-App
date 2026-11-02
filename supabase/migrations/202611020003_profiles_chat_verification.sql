-- Public traveler profiles, role-aware signup, private identity submissions, and direct chat.
alter table public.profiles add column if not exists account_type text not null default 'passenger' check(account_type in ('passenger','driver'));
alter table public.profiles add column if not exists bio text check(char_length(coalesce(bio,'')) <= 500);
alter table public.profiles add column if not exists home_state text check(char_length(coalesce(home_state,'')) <= 80);
alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles add constraint profiles_display_name_check check(char_length(coalesce(display_name,'')) <= 100);
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_signed_in on public.profiles for select to authenticated using(true);
revoke select on public.profiles from anon,authenticated;
grant select(id,display_name,avatar_url,account_type,bio,home_state,created_at,updated_at) on public.profiles to authenticated;
grant update(display_name,avatar_url,bio,home_state) on public.profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy profile_photo_public_read on storage.objects for select using(bucket_id='profile-photos');
create policy profile_photo_owner_insert on storage.objects for insert to authenticated with check(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy profile_photo_owner_update on storage.objects for update to authenticated using(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy profile_photo_owner_delete on storage.objects for delete to authenticated using(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);

alter table public.driver_profiles add column if not exists phone text;
alter table public.driver_profiles add column if not exists home_state text;
alter table public.driver_profiles add column if not exists onboarding_status text not null default 'started' check(onboarding_status in ('started','submitted','verified','rejected'));
alter table public.driver_vehicles add column if not exists registration_number text;
revoke select on public.driver_profiles from anon,authenticated;
grant select(user_id,verification_status,licence_status,onboarding_status,created_at,updated_at) on public.driver_profiles to authenticated;
revoke select on public.driver_vehicles from anon,authenticated;
grant select(id,driver_id,make,model,color,registration_region,seats,verification_status,created_at) on public.driver_vehicles to authenticated;
grant insert,update on public.driver_vehicles to authenticated;

create table if not exists public.private_account_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 phone text check(char_length(coalesce(phone,'')) <= 24), updated_at timestamptz not null default now()
);
alter table public.private_account_profiles enable row level security;
create policy private_account_profile_owner on public.private_account_profiles for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update on public.private_account_profiles to authenticated;
create or replace function public.guard_driver_onboarding_status()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(auth.role(),'')='authenticated' and new.onboarding_status is distinct from old.onboarding_status then raise exception 'Driver onboarding status is managed by Voyara'; end if;
 return new;
end; $$;
create trigger driver_onboarding_status_guard before update on public.driver_profiles for each row execute function public.guard_driver_onboarding_status();

create table if not exists public.identity_submissions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 document_type text not null check(document_type in ('national_id','drivers_licence','voters_card','passport','nin_slip')),
 document_path text not null, face_capture_path text, status text not null default 'pending' check(status in ('pending','verified','rejected')),
 submitted_at timestamptz not null default now(), reviewed_at timestamptz,
 unique(user_id,document_type)
);
alter table public.identity_submissions enable row level security;
create policy identity_submission_owner_read on public.identity_submissions for select to authenticated using(user_id=auth.uid());
create policy identity_submission_owner_insert on public.identity_submissions for insert to authenticated with check(user_id=auth.uid() and status='pending');
create policy identity_submission_owner_update on public.identity_submissions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and status='pending');
grant select,insert,update on public.identity_submissions to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('identity-private','identity-private',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
create policy identity_storage_read_own on storage.objects for select to authenticated using(bucket_id='identity-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy identity_storage_insert_own on storage.objects for insert to authenticated with check(bucket_id='identity-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy identity_storage_update_own on storage.objects for update to authenticated using(bucket_id='identity-private' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='identity-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy identity_storage_delete_own on storage.objects for delete to authenticated using(bucket_id='identity-private' and (storage.foldername(name))[1]=auth.uid()::text);

create table if not exists public.direct_conversations (
 id uuid primary key default gen_random_uuid(), user_low uuid not null references auth.users(id) on delete cascade,
 user_high uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(),
 check(user_low < user_high), unique(user_low,user_high)
);
create table if not exists public.direct_messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 4000), created_at timestamptz not null default now(), read_at timestamptz
);
create index if not exists direct_messages_conversation_idx on public.direct_messages(conversation_id,created_at);
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
create policy conversation_participant_read on public.direct_conversations for select to authenticated using(auth.uid() in (user_low,user_high));
create policy message_participant_read on public.direct_messages for select to authenticated using(exists(select 1 from public.direct_conversations c where c.id=conversation_id and auth.uid() in(c.user_low,c.user_high)));
create policy message_participant_send on public.direct_messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.direct_conversations c where c.id=conversation_id and auth.uid() in(c.user_low,c.user_high)) and not exists(select 1 from public.direct_conversations c join public.user_blocks b on (b.blocker_id=c.user_low and b.blocked_id=c.user_high) or (b.blocker_id=c.user_high and b.blocked_id=c.user_low) where c.id=conversation_id));
grant select on public.direct_conversations,public.direct_messages to authenticated;
grant insert on public.direct_messages to authenticated;

create or replace function public.start_direct_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); lo uuid; hi uuid; result uuid;
begin
 if caller is null then raise exception 'Sign in to start a conversation'; end if;
 if other_user is null or other_user=caller then raise exception 'Choose another traveler'; end if;
 if not exists(select 1 from public.profiles where id=other_user) then raise exception 'Traveler not found'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=caller and blocked_id=other_user) or (blocker_id=other_user and blocked_id=caller)) then raise exception 'This conversation is unavailable'; end if;
 lo:=least(caller,other_user); hi:=greatest(caller,other_user);
 insert into public.direct_conversations(user_low,user_high) values(lo,hi) on conflict(user_low,user_high) do update set user_low=excluded.user_low returning id into result;
 return result;
end; $$;
revoke all on function public.start_direct_conversation(uuid) from public,anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path='' as $$
declare chosen_role text:=case when new.raw_user_meta_data->>'account_type'='driver' then 'driver' else 'passenger' end;
begin
 insert into public.profiles(id,display_name,account_type,home_state)
 values(new.id,nullif(trim(new.raw_user_meta_data->>'display_name'),''),chosen_role,nullif(trim(new.raw_user_meta_data->>'home_state'),''))
 on conflict(id) do update set account_type=excluded.account_type,home_state=excluded.home_state;
 insert into public.private_account_profiles(user_id,phone) values(new.id,nullif(trim(new.raw_user_meta_data->>'phone'),'')) on conflict(user_id) do update set phone=excluded.phone;
 if chosen_role='driver' then
  insert into public.driver_profiles(user_id,home_state) values(new.id,nullif(trim(new.raw_user_meta_data->>'home_state'),'')) on conflict(user_id) do nothing;
  if nullif(trim(new.raw_user_meta_data->>'vehicle_make'),'') is not null and nullif(trim(new.raw_user_meta_data->>'vehicle_model'),'') is not null and nullif(trim(new.raw_user_meta_data->>'vehicle_color'),'') is not null then
   insert into public.driver_vehicles(driver_id,make,model,color,registration_region,seats,registration_number)
   values(new.id,trim(new.raw_user_meta_data->>'vehicle_make'),trim(new.raw_user_meta_data->>'vehicle_model'),trim(new.raw_user_meta_data->>'vehicle_color'),coalesce(nullif(trim(new.raw_user_meta_data->>'home_state'),''),'Nigeria'),case when coalesce(new.raw_user_meta_data->>'seats','') ~ '^[0-9]{1,2}$' and (new.raw_user_meta_data->>'seats')::int between 1 and 12 then (new.raw_user_meta_data->>'seats')::int else 4 end,nullif(trim(new.raw_user_meta_data->>'plate'),''));
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.handle_new_user_profile() from public;
