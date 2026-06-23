import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, currentWeekStart } from "@/lib/supabaseClient";

// Strava type -> our discipline bucket
function disciplineFromType(type: string): "swim" | "bike" | "run" | "other" {
  const t = type.toLowerCase();
  if (t.includes("swim")) return "swim";
  if (t.includes("ride") || t.includes("virtual")) return "bike";
  if (t.includes("run")) return "run";
  return "other";
}

async function refreshToken(refreshTok: string): Promise<string | null> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshTok,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const d = await res.json();
  return d.access_token ?? null;
}

async function syncUser(
  db: ReturnType<typeof getSupabaseAdmin>,
  user: {
    id: string;
    strava_athlete_id: number;
    strava_access_token: string;
    strava_refresh_token: string;
    strava_token_expires_at: number;
  },
  weekStart: string
) {
  let token = user.strava_access_token;

  // Refresh if expired
  if (Math.floor(Date.now() / 1000) >= user.strava_token_expires_at - 300) {
    const newToken = await refreshToken(user.strava_refresh_token);
    if (!newToken) return { error: "Token verversen mislukt" };
    token = newToken;
    await db.from("triathlon_users").update({ strava_access_token: newToken }).eq("id", user.id);
  }

  // Fetch activities for the current week (from Monday)
  const after = Math.floor(new Date(weekStart).getTime() / 1000);
  const activitiesRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!activitiesRes.ok) return { error: "Strava fetch mislukt" };
  const activities = await activitiesRes.json();

  // Aggregate
  const stats = {
    total_hours_swim: 0,
    total_hours_bike: 0,
    total_hours_run: 0,
    total_hours_other: 0,
    longest_activity_min: 0,
    longest_activity_type: null as string | null,
    activity_count_swim: 0,
    activity_count_bike: 0,
    activity_count_run: 0,
    activity_count_other: 0,
    kudos_received: 0,
  };

  for (const a of activities) {
    const discipline = disciplineFromType(a.type ?? "");
    const hours = (a.moving_time ?? 0) / 3600;
    const kudos = a.kudos_count ?? 0;
    const durationMin = Math.round((a.moving_time ?? 0) / 60);

    stats[`total_hours_${discipline}`] += hours;
    stats[`activity_count_${discipline}`] += 1;
    stats.kudos_received += kudos;

    if (durationMin > stats.longest_activity_min) {
      stats.longest_activity_min = durationMin;
      stats.longest_activity_type = discipline;
    }
  }

  // Round hours
  stats.total_hours_swim = Math.round(stats.total_hours_swim * 100) / 100;
  stats.total_hours_bike = Math.round(stats.total_hours_bike * 100) / 100;
  stats.total_hours_run = Math.round(stats.total_hours_run * 100) / 100;
  stats.total_hours_other = Math.round(stats.total_hours_other * 100) / 100;

  const { error } = await db.from("triathlon_weekly_stats").upsert(
    { user_id: user.id, week_start: weekStart, ...stats, synced_at: new Date().toISOString() },
    { onConflict: "user_id,week_start" }
  );

  return error ? { error: error.message } : { ok: true };
}

// POST /api/group/sync
// Can be called by the user themselves, or by a Vercel cron job.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { groupCode } = body as { groupCode?: string };

  if (!groupCode) {
    return NextResponse.json({ error: "Geen groepscode opgegeven" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const weekStart = currentWeekStart();

  const { data: users, error } = await db
    .from("triathlon_users")
    .select("id, strava_athlete_id, strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("group_code", groupCode.trim().toUpperCase());

  if (error || !users) {
    return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 });
  }

  const results = await Promise.all(users.map((u) => syncUser(db, u, weekStart)));
  return NextResponse.json({ synced: results.length, weekStart, results });
}

// GET /api/group/sync — Vercel cron hits this
export async function GET(request: NextRequest) {
  // Verify cron secret so random people can't trigger it
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const weekStart = currentWeekStart();

  const { data: users } = await db
    .from("triathlon_users")
    .select("id, strava_athlete_id, strava_access_token, strava_refresh_token, strava_token_expires_at");

  if (!users?.length) return NextResponse.json({ synced: 0 });

  const results = await Promise.all(users.map((u) => syncUser(db, u, weekStart)));
  return NextResponse.json({ synced: results.length, weekStart });
}
