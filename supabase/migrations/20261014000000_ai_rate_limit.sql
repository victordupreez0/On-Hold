-- One row per Claude call (a check or a follow-up chat message), timestamp
-- only -- no content, so this doesn't compromise the no-raw-text-stored
-- design. Backs an atomic per-user hourly cap (see app/main.py _check_rate_limit).

create table ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table ai_calls enable row level security;
create index ai_calls_user_id_created_at_idx on ai_calls (user_id, created_at desc);
