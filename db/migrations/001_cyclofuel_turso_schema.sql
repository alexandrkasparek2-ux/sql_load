pragma foreign_keys = on;

create table if not exists app_users (
  id text primary key,
  email text unique,
  display_name text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists profiles (
  id text primary key references app_users(id) on delete cascade,
  weight real not null default 70,
  height real not null default 175,
  age integer not null default 30,
  gender text not null default 'male' check (gender in ('male', 'female')),
  ftp_watts integer default 250,
  caloric_deficit_offseason real default 0 check (caloric_deficit_offseason >= 0),
  target_weight_kg real,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists food_entries (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  date text not null,
  meal_slot text not null,
  food_id text not null,
  food_name text not null,
  grams real not null,
  kcal real not null default 0,
  carbs real not null default 0,
  protein real not null default 0,
  fat real not null default 0,
  na real not null default 0,
  k real not null default 0,
  mg real not null default 0,
  ca real not null default 0,
  fe real not null default 0,
  vit_c real not null default 0,
  vit_d real not null default 0,
  b12 real not null default 0,
  omega3 real not null default 0,
  zn real not null default 0,
  fiber real not null default 0,
  created_at text not null default (datetime('now'))
);

create index if not exists idx_food_entries_user_date on food_entries(user_id, date);

create table if not exists training_days (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  date text not null,
  training_type text not null default 'rest',
  ride_hours real not null default 0,
  water_glasses integer not null default 0,
  coffee_cups integer not null default 0,
  extra_types text not null default '[]',
  activity_hours text not null default '{}',
  activity_intensity text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (user_id, date)
);

create index if not exists idx_training_days_user_date on training_days(user_id, date);

create table if not exists weight_log (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  date text not null,
  weight_kg real not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (user_id, date)
);

create index if not exists idx_weight_log_user_date on weight_log(user_id, date);

create table if not exists user_settings (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  key text not null,
  value text not null default '{}',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (user_id, key)
);

create index if not exists idx_user_settings_user_key on user_settings(user_id, key);

create table if not exists supplement_log (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  date text not null,
  supplement_id text not null,
  supplement_name text not null,
  dose real not null default 0,
  unit text not null default 'mg',
  taken integer not null default 0,
  created_at text default (datetime('now')),
  taken_at text default (datetime('now')),
  unique (user_id, date, supplement_id)
);

create table if not exists daily_nutrition_snapshots (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  date text not null,
  consumed_kcal real default 0,
  consumed_carbs real default 0,
  consumed_protein real default 0,
  consumed_fat real default 0,
  consumed_fiber real default 0,
  goal_kcal real default 0,
  goal_carbs real default 0,
  goal_protein real default 0,
  goal_fat real default 0,
  goal_water real default 0,
  goal_fiber real default 0,
  activity_kcal real default 0,
  activity_source text default 'none',
  deficit_kcal real default 0,
  updated_at text default (datetime('now')),
  created_at text default (datetime('now')),
  unique (user_id, date)
);

create table if not exists race_events (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  name text not null,
  race_date text not null,
  distance_km real,
  elevation_m integer,
  estimated_duration_hours real,
  race_type text not null default 'B' check (race_type in ('A', 'B', 'C')),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create index if not exists idx_race_events_user_date on race_events(user_id, race_date);

create table if not exists nutrition_targets (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  date text not null,
  phase text not null default 'off_season',
  target_kcal real not null default 0,
  target_carbs_g real not null default 0,
  target_protein_g real not null default 0,
  target_fat_g real not null default 0,
  actual_kcal real,
  actual_carbs_g real,
  actual_protein_g real,
  actual_fat_g real,
  compliance_score real,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (user_id, date)
);

create index if not exists idx_nutrition_targets_user_date on nutrition_targets(user_id, date);

create table if not exists training_load_daily (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  date text not null,
  tss real not null default 0,
  ctl real,
  atl real,
  tsb real,
  training_kj real,
  source text not null default 'manual',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (user_id, date)
);

create index if not exists idx_training_load_user_date on training_load_daily(user_id, date);

create table if not exists on_bike_nutrition_log (
  id text primary key,
  user_id text not null references app_users(id) on delete cascade,
  race_event_id text references race_events(id) on delete set null,
  timestamp text not null default (datetime('now')),
  item_name text not null,
  carbs_g real not null default 0,
  kcal real not null default 0,
  notes text default '',
  created_at text not null default (datetime('now'))
);

create index if not exists idx_on_bike_nutrition_user_event on on_bike_nutrition_log(user_id, race_event_id);
