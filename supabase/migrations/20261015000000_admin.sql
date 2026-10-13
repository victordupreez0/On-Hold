-- Admin panel: moderation audit trail + a real explainers table (was
-- hardcoded client-side, so admins had no way to edit Learn content without
-- a redeploy). Content is seeded by backend/scripts/seed.py, not here --
-- the long apostrophe-heavy text is much safer as Python string literals
-- (parameterized insert) than hand-escaped SQL.

alter table reports add column moderated_by uuid references profiles (id) on delete set null;
alter table reports add column moderated_at timestamptz;

create table explainers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  scam_type scam_type not null,
  title text not null,
  summary text not null,
  example_channel channel not null,
  example_text text not null,
  signs text[] not null,
  what_to_do text[] not null,
  source_name text not null,
  source_url text not null,
  created_at timestamptz not null default now()
);
alter table explainers enable row level security;
