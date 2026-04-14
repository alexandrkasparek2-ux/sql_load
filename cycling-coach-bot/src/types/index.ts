// Shared domain types for the cycling coach bot.

export interface StravaActivity {
  id: number;
  name: string;
  start_date: string;
  distance: number; // meters
  moving_time: number; // seconds
  total_elevation_gain?: number;
  average_power?: number;
  weighted_average_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number; // relative effort
  type?: string;
}

export interface TPWorkout {
  id: string;
  date: string;
  title: string;
  description?: string;
  planned_tss?: number;
  planned_duration_seconds?: number;
  workout_type?: string;
}

export interface TPMetrics {
  ctl: number; // Chronic Training Load (Fitness)
  atl: number; // Acute Training Load (Fatigue)
  tsb: number; // Training Stress Balance (Form)
  tss_7day: number;
  as_of: string;
}

export interface WhoopRecovery {
  recovery_score: number; // 0-100
  hrv: number;
  resting_heart_rate: number;
  sleep_performance: number;
  date: string;
}

export interface WhoopSleep {
  date: string;
  sleep_performance: number;
  total_in_bed_minutes: number;
  disturbance_count: number;
}

export interface CustomDashboardPayload {
  fetched_at: string;
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface AthleteData {
  strava: {
    last_7_days: StravaActivity[];
    total_distance_km: number;
    avg_power?: number;
    avg_heartrate?: number;
  } | { unavailable: true; reason: string };

  trainingpeaks: TPMetrics | { unavailable: true; reason: string };

  whoop:
    | {
        today: WhoopRecovery;
        sleep_history: WhoopSleep[];
      }
    | { unavailable: true; reason: string };

  custom: CustomDashboardPayload;
}

export type Provider = 'strava' | 'trainingpeaks' | 'whoop';

export interface OAuthTokenRow {
  user_id: number;
  provider: Provider;
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null; // unix seconds
  extra_json: string | null;
}

export interface UserRow {
  id: number;
  telegram_id: number;
  created_at: number;
  monitoring_enabled: number; // 0/1
}

export interface AthleteProfile {
  ftp_watts: number | null;
  weight_kg: number | null;
  max_hr: number | null;
  goal: string | null;
  updated_at: number | null;
}

export interface ConversationMessage {
  id?: number;
  user_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

export interface CoachResponse {
  summary: string;
  analysis: string[];
  recommendation: string;
  question?: string;
}
