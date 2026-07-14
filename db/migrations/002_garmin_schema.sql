-- Garmin Connect wellness + activities tables (Turso / SQLite)

create table if not exists garmin_wellness (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  date text not null,
  resting_hr integer,
  hrv_overnight real,
  sleep_seconds integer,
  sleep_score integer,
  body_battery_low integer,
  body_battery_high integer,
  stress_avg integer,
  steps integer,
  training_readiness integer,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (user_id, date)
);

create index if not exists idx_garmin_wellness_user_date on garmin_wellness(user_id, date);

create table if not exists garmin_activities (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  garmin_id text not null,
  name text not null default '',
  type text not null default 'unknown',
  start_time text,
  duration_s real,
  distance_m real,
  calories real,
  avg_hr integer,
  max_hr integer,
  elevation_m real,
  avg_power real,
  norm_power real,
  training_effect_aerobic real,
  training_effect_anaerobic real,
  vo2max real,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (user_id, garmin_id)
);

create index if not exists idx_garmin_activities_user_start on garmin_activities(user_id, start_time);
