-- On Hold: initial schema. Mirrors mobile/src/types.ts.
-- RLS is enabled everywhere with no policies: the API (service role / pooler
-- connection) is the only door, FastAPI enforces who sees what. This keeps
-- the auto-generated PostgREST endpoint from exposing anything.

create type role as enum ('protected', 'guardian', 'admin');
create type verdict as enum ('stop', 'wait', 'safe');
create type channel as enum ('sms', 'whatsapp', 'email', 'call');
create type scam_type as enum (
  'bank', 'sassa', 'sars', 'aarto', 'family', 'courier', 'jobs', 'debicheck', 'investment', 'other'
);
create type report_status as enum ('pending', 'approved', 'rejected');
create type link_status as enum ('pending', 'active');
create type alert_type as enum ('stop_verdict', 'wait_verdict', 'asked_for_help', 'invite_accepted');

-- ---------- Suburbs (static reference data, seeded below) ----------

create table suburbs (
  name text primary key,
  city text not null,
  lat double precision not null,
  lng double precision not null
);
alter table suburbs enable row level security;

-- Ported from mobile/src/fixtures.ts SUBURBS, so map pins line up everywhere.
insert into suburbs (name, city, lat, lng) values
  ('Soweto', 'Johannesburg', -26.2485, 27.854),
  ('Sandton', 'Johannesburg', -26.1076, 28.0567),
  ('Randburg', 'Johannesburg', -26.0936, 28.0064),
  ('Roodepoort', 'Johannesburg', -26.1625, 27.8725),
  ('Benoni', 'Ekurhuleni', -26.1885, 28.3208),
  ('Centurion', 'Pretoria', -25.8603, 28.1894),
  ('Hatfield', 'Pretoria', -25.7487, 28.238),
  ('Mamelodi', 'Pretoria', -25.711, 28.395),
  ('Bellville', 'Cape Town', -33.9022, 18.629),
  ('Mitchells Plain', 'Cape Town', -34.0446, 18.6181),
  ('Sea Point', 'Cape Town', -33.9156, 18.388),
  ('Durbanville', 'Cape Town', -33.8323, 18.6464),
  ('Umhlanga', 'Durban', -29.7256, 31.0849),
  ('Pinetown', 'Durban', -29.817, 30.857),
  ('Chatsworth', 'Durban', -29.91, 30.885),
  ('Summerstrand', 'Gqeberha', -34.001, 25.673);

-- ---------- Profiles ----------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role role not null default 'protected',
  simple_mode boolean not null default false,
  suburb text references suburbs (name),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- Creates a profile row when someone signs up. Role is read from signup
-- metadata but coerced to protected/guardian only -- admin can never be
-- granted by the client, it's set by hand in the DB.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    case when new.raw_user_meta_data ->> 'role' = 'guardian' then 'guardian'::role else 'protected'::role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Checks ----------
-- The raw message/screenshot is never stored -- scam texts often carry the
-- person's own account details. Only the verdict is persisted.

create table checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('message', 'call')),
  verdict verdict not null,
  confidence real not null check (confidence between 0 and 1),
  scam_type scam_type,
  headline text not null,
  reasons text[] not null default '{}',
  next_steps text[] not null default '{}',
  say_this text,
  created_at timestamptz not null default now()
);
alter table checks enable row level security;
create index checks_user_id_created_at_idx on checks (user_id, created_at desc);

-- ---------- Reports ----------

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  check_id uuid references checks (id) on delete set null,
  channel channel not null,
  scam_type scam_type not null,
  description text not null check (char_length(description) between 10 and 1000),
  sender text,
  suburb text not null references suburbs (name),
  status report_status not null default 'pending',
  reject_reason text,
  created_at timestamptz not null default now()
);
alter table reports enable row level security;
create index reports_reporter_id_idx on reports (reporter_id);
create index reports_status_created_at_idx on reports (status, created_at desc);
create index reports_suburb_idx on reports (suburb) where status = 'approved';

-- ---------- Family (guardian links + alerts) ----------

create table guardian_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references profiles (id) on delete cascade,
  protected_id uuid references profiles (id) on delete cascade,
  protected_name text not null,
  invited_phone text,
  code text not null unique,
  status link_status not null default 'pending',
  share_calls boolean not null default true,
  share_verdicts boolean not null default true,
  created_at timestamptz not null default now(),
  unique (guardian_id, protected_id)
);
alter table guardian_links enable row level security;
create index guardian_links_guardian_id_idx on guardian_links (guardian_id);
create index guardian_links_protected_id_idx on guardian_links (protected_id);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references guardian_links (id) on delete cascade,
  type alert_type not null,
  check_id uuid references checks (id) on delete set null,
  detail text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
alter table alerts enable row level security;
create index alerts_link_id_created_at_idx on alerts (link_id, created_at desc);
