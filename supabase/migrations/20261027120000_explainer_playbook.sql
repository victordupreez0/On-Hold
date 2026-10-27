-- Each guide now shows how the scam takes your money: the weakness the scammer is
-- counting on, and their plan step by step. Empty for a guide that hasn't been written yet.

alter table explainers
  add column counting_on text not null default '',
  add column playbook text[] not null default '{}';
