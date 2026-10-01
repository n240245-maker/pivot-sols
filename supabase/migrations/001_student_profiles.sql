begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Seeded from src/config/academic.ts by 002_academic_cycle.sql.
create table public.academic_config (
  id boolean primary key default true check (id),
  current_p1_batch integer not null check (current_p1_batch between 2 and 99)
);
alter table public.academic_config enable row level security;
revoke all on public.academic_config from anon, authenticated;

create function private.current_p1_batch() returns integer
language sql stable security definer set search_path = '' as $$
  select current_p1_batch from public.academic_config where id = true;
$$;

create function private.is_rgukt_email(value text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(
    length(btrim(value)) <= 254
    and lower(btrim(value)) ~ '^[a-z0-9!#$%&''*+/=?^_`{|}~.-]+@rguktn[.]ac[.]in$'
    and length(split_part(btrim(value), '@', 1)) between 1 and 64
    and split_part(btrim(value), '@', 1) not like '.%'
    and split_part(btrim(value), '@', 1) not like '%.'
    and position('..' in split_part(btrim(value), '@', 1)) = 0,
    false
  );
$$;

create function private.email_student_id(value text) returns text
language sql immutable set search_path = '' as $$
  select case when count(*) = 1 then upper(min(matches[1])) else null end
  from regexp_matches(lower(split_part(btrim(value), '@', 1)),
    '(?:^|[^a-z0-9])(n[0-9]{6})(?=$|[^a-z0-9])', 'g') as matches;
$$;

create function private.verified_rgukt_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid()) and email_confirmed_at is not null
      and private.is_rgukt_email(email)
      and coalesce(is_anonymous, false) = false
  );
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text unique not null check (student_id ~ '^N[0-9]{6}$'),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  email text unique not null check (private.is_rgukt_email(email)),
  batch integer not null check (batch between 0 and 99),
  academic_level text not null check (academic_level in ('P1', 'E1')),
  campus text not null default 'Nuzvid' check (campus = 'Nuzvid'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.validate_student_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  account auth.users%rowtype;
  email_id text;
  current_batch integer;
begin
  if auth.uid() is null or new.id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Profile owner must match authenticated user';
  end if;
  select * into account from auth.users where id = auth.uid();
  if not found or account.email_confirmed_at is null or not private.is_rgukt_email(account.email)
    or coalesce(account.is_anonymous, false) then
    raise exception using errcode = '42501', message = 'Confirmed institutional email required';
  end if;
  new.student_id := upper(btrim(new.student_id));
  if new.student_id !~ '^N[0-9]{6}$' then raise exception 'Invalid student ID'; end if;
  if tg_op = 'UPDATE' and (new.id <> old.id or new.student_id <> old.student_id) then
    raise exception using errcode = '42501', message = 'Student identity cannot be changed';
  end if;
  email_id := private.email_student_id(account.email);
  if email_id is not null and email_id <> new.student_id then raise exception 'Email and ID do not match'; end if;
  current_batch := private.current_p1_batch();
  if current_batch is null then raise exception 'Academic cycle is not configured'; end if;
  new.batch := substring(new.student_id from 2 for 2)::integer;
  if new.batch = current_batch then new.academic_level := 'P1';
  elsif new.batch = current_batch - 2 then new.academic_level := 'E1';
  else raise exception 'Unsupported academic batch';
  end if;
  -- Identity fields come from Auth/ID, never from client claims or metadata.
  new.email := lower(btrim(account.email));
  new.name := btrim(new.name);
  new.campus := 'Nuzvid';
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_at := now();
  else new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger validate_student_profile before insert or update on public.profiles
for each row execute function private.validate_student_profile();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

create policy "Students read their own supported profile" on public.profiles
for select to authenticated using (
  id = (select auth.uid()) and (select private.verified_rgukt_user())
  and batch in ((select private.current_p1_batch()), (select private.current_p1_batch()) - 2)
);
create policy "Students create their own profile" on public.profiles
for insert to authenticated with check (
  id = (select auth.uid()) and (select private.verified_rgukt_user())
  and batch in ((select private.current_p1_batch()), (select private.current_p1_batch()) - 2)
);
create policy "Students update their own profile" on public.profiles
for update to authenticated using (
  id = (select auth.uid()) and (select private.verified_rgukt_user())
) with check (
  id = (select auth.uid()) and (select private.verified_rgukt_user())
  and batch in ((select private.current_p1_batch()), (select private.current_p1_batch()) - 2)
);

-- Invoker rights preserve RLS. ON CONFLICT handles callback retries, concurrent
-- tabs and React StrictMode without overwriting a student's existing identity.
create function public.ensure_student_profile(p_student_id text, p_name text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result public.profiles%rowtype;
begin
  insert into public.profiles (id, student_id, name, email, batch, academic_level)
  values (auth.uid(), p_student_id, p_name, '', 0, 'P1')
  on conflict (id) do update set name = public.profiles.name
  returning * into result;
  return to_jsonb(result);
end;
$$;

-- Enable this function as the Before User Created Auth hook in Supabase.
-- It blocks creation, including direct API and OAuth attempts, outside RGUKT.
create function public.hook_restrict_rgukt_signup(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_rgukt_email(event->'user'->>'email')
    or coalesce(event->'user'->'app_metadata'->>'provider', '') not in ('email', 'google')
    or coalesce((event->'user'->>'is_anonymous')::boolean, false) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403,
      'message', 'Use your RGUKT Nuzvid institutional account.'));
  end if;
  return '{}'::jsonb;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.current_p1_batch(), private.is_rgukt_email(text), private.verified_rgukt_user() to authenticated;
revoke all on function public.ensure_student_profile(text, text) from public, anon;
grant execute on function public.ensure_student_profile(text, text) to authenticated;
revoke all on function public.hook_restrict_rgukt_signup(jsonb) from public, anon, authenticated;
grant execute on function public.hook_restrict_rgukt_signup(jsonb) to supabase_auth_admin;

commit;
