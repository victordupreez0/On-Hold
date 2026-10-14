-- Follow-up chat on a check, kept so History can show past conversations.
-- Only the person's questions and On Hold's answers are stored -- the
-- original message or screenshot they checked still never is.

create table check_messages (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references checks (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index check_messages_check_idx on check_messages (check_id, created_at);
alter table check_messages enable row level security;
