-- Style Quiz: authentication, profile, and avatar storage
-- Run this file once in Supabase Dashboard > SQL Editor.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '' check (char_length(name) <= 40),
  gender text not null default '回答しない'
    check (gender in ('男性', '女性', 'ノンバイナリー', 'その他', '回答しない')),
  age smallint check (age between 1 and 120),
  bio text not null default '',
  avatar_path text check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text),
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists bio text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_bio_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_bio_length_check
    check (char_length(bio) <= 300);
  end if;
end
$$;

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;
grant update (name, gender, age, bio, avatar_path) on table public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
drop function if exists public.set_updated_at();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists stylequiz_on_auth_user_created on auth.users;
drop trigger if exists stylequiz_on_auth_user_updated on auth.users;
drop function if exists public.handle_auth_user_change();

create or replace function private.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;

  insert into public.profiles (id, email, email_verified)
  values (
    new.id,
    new.email,
    new.email_confirmed_at is not null
  )
  on conflict (id) do update
  set email = excluded.email,
      email_verified = excluded.email_verified,
      updated_at = now();
  return new;
end;
$$;

revoke execute on function private.handle_auth_user_change() from public, anon, authenticated;

create trigger stylequiz_on_auth_user_created
after insert on auth.users
for each row execute function private.handle_auth_user_change();

create trigger stylequiz_on_auth_user_updated
after update of email, email_confirmed_at on auth.users
for each row execute function private.handle_auth_user_change();

insert into public.profiles (id, email, email_verified)
select id, email, email_confirmed_at is not null
from auth.users
where email is not null
on conflict (id) do update
set email = excluded.email,
    email_verified = excluded.email_verified,
    updated_at = now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
);

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
);
