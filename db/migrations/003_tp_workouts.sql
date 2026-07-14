-- TrainingPeaks workouts table
create table if not exists tp_workouts (
  id text primary key,
  user_id text not null,
  tp_id text not null,
  date text not null,
  title text default '',
  workout_type text,
  duration_planned_s real,
  duration_actual_s real,
  distance_planned_m real,
  distance_actual_m real,
  tss_planned real,
  tss_actual real,
  if_planned real,
  if_actual real,
  avg_power real,
  norm_power real,
  avg_hr integer,
  calories integer,
  elevation_m real,
  completed integer default 0,
  description text default '',
  created_at text default (datetime('now')),
  updated_at text default (datetime('now')),
  unique(user_id, tp_id)
);

create index if not exists idx_tp_workouts_user_date on tp_workouts(user_id, date);
