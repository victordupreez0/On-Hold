-- When each person last used the app, so admins can see who's active.
-- Stamped by the API's auth dependency (at most once a minute per person),
-- not by the client, so it can't be faked or skipped.

alter table profiles add column last_seen_at timestamptz;
create index profiles_last_seen_at_idx on profiles (last_seen_at desc nulls last);
