import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jncwhwimflkmsizacamt.supabase.co";

// Anon key: safe to use in the browser (read-only via RLS)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuY3dod2ltZmxrbXNpemFjYW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODY4MjksImV4cCI6MjA5NjA2MjgyOX0.3g86D2_mXfnm8rDvl_d2l1w9RdkGTuoecslqYhSJAFY";

// Server-side client uses the service role key (set in Vercel env vars)
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set in environment");
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
}

// Browser-safe client (read-only data via RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface TriathlonUser {
  id: string;
  strava_athlete_id: number;
  name: string;
  avatar_url: string | null;
  group_code: string;
  sport_goal: "triathlon" | "run" | "bike" | "all";
  created_at: string;
}

export interface WeeklyStats {
  id: string;
  user_id: string;
  week_start: string;
  total_hours_swim: number;
  total_hours_bike: number;
  total_hours_run: number;
  total_hours_other: number;
  longest_activity_min: number;
  longest_activity_type: string | null;
  activity_count_swim: number;
  activity_count_bike: number;
  activity_count_run: number;
  activity_count_other: number;
  kudos_received: number;
  synced_at: string;
}

export interface LeaderboardEntry {
  user: TriathlonUser;
  stats: WeeklyStats | null;
}

// Returns the Monday of the current week
export function currentWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
