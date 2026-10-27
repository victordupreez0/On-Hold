-- A fourth outcome for warnings *about* scams (an awareness poster, a news report). It shows
-- grey with an "i", never green, so nobody reads a genuine warning as "that kind of message is fine".
alter type verdict add value 'info';

-- The official sources a verdict cites, as [{name, url}]. The AI picks them from a vetted list
-- in backend/app/ai.py (SOURCES), so it can't invent a link.
alter table checks add column sources jsonb not null default '[]';
