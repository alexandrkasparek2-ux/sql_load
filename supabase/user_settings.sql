-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists user_settings (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  key         text        not null,
  value       jsonb       not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

alter table user_settings enable row level security;

create policy "users can manage own settings"
  on user_settings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
