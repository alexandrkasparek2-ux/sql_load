create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references app_users(id) on delete cascade,
  weight numeric not null default 70,
  height numeric not null default 175,
  age integer not null default 30,
  gender text not null default 'male' check (gender in ('male', 'female')),
  ftp_watts integer default 250,
  caloric_deficit_offseason numeric default 0 check (caloric_deficit_offseason >= 0),
  target_weight_kg numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  date date not null,
  meal_slot text not null,
  food_id text not null,
  food_name text not null,
  grams numeric not null,
  kcal numeric not null default 0,
  carbs numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  na numeric not null default 0,
  k numeric not null default 0,
  mg numeric not null default 0,
  ca numeric not null default 0,
  fe numeric not null default 0,
  vit_c numeric not null default 0,
  vit_d numeric not null default 0,
  b12 numeric not null default 0,
  omega3 numeric not null default 0,
  zn numeric not null default 0,
  fiber numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_food_entries_user_date on food_entries(user_id, date);

create table if not exists training_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  date date not null,
  training_type text not null default 'rest',
  ride_hours numeric not null default 0,
  water_glasses integer not null default 0,
  coffee_cups integer not null default 0,
  extra_types text[] not null default '{}',
  activity_hours jsonb not null default '{}',
  activity_intensity jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_training_days_user_date on training_days(user_id, date);

create table if not exists weight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_weight_log_user_date on weight_log(user_id, date);

create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists idx_user_settings_user_key on user_settings(user_id, key);

create table if not exists supplement_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  date date not null,
  supplement_id text not null,
  supplement_name text not null,
  dose numeric not null default 0,
  unit text not null default 'mg',
  taken boolean not null default false,
  created_at timestamptz default now(),
  taken_at timestamptz default now(),
  unique (user_id, date, supplement_id)
);

create table if not exists daily_nutrition_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  date date not null,
  consumed_kcal numeric default 0,
  consumed_carbs numeric default 0,
  consumed_protein numeric default 0,
  consumed_fat numeric default 0,
  consumed_fiber numeric default 0,
  goal_kcal numeric default 0,
  goal_carbs numeric default 0,
  goal_protein numeric default 0,
  goal_fat numeric default 0,
  goal_water numeric default 0,
  goal_fiber numeric default 0,
  activity_kcal numeric default 0,
  activity_source text default 'none',
  deficit_kcal numeric default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists race_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  race_date date not null,
  distance_km numeric,
  elevation_m integer,
  estimated_duration_hours numeric,
  race_type text not null default 'B' check (race_type in ('A', 'B', 'C')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_race_events_user_date on race_events(user_id, race_date);

create table if not exists nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  date date not null,
  phase text not null default 'off_season',
  target_kcal numeric not null default 0,
  target_carbs_g numeric not null default 0,
  target_protein_g numeric not null default 0,
  target_fat_g numeric not null default 0,
  actual_kcal numeric,
  actual_carbs_g numeric,
  actual_protein_g numeric,
  actual_fat_g numeric,
  compliance_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_nutrition_targets_user_date on nutrition_targets(user_id, date);

create table if not exists training_load_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  date date not null,
  tss numeric not null default 0,
  ctl numeric,
  atl numeric,
  tsb numeric,
  training_kj numeric,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_training_load_user_date on training_load_daily(user_id, date);

create table if not exists on_bike_nutrition_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  race_event_id uuid references race_events(id) on delete set null,
  timestamp timestamptz not null default now(),
  item_name text not null,
  carbs_g numeric not null default 0,
  kcal numeric not null default 0,
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_on_bike_nutrition_user_event on on_bike_nutrition_log(user_id, race_event_id);
