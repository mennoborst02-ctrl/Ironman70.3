import { NextRequest, NextResponse } from "next/server";
import { supabase, currentWeekStart, LeaderboardEntry } from "@/lib/supabaseClient";

// GET /api/group/leaderboard?code=VOLT2027
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Geen groepscode opgegeven" }, { status: 400 });
  }

  const weekStart = currentWeekStart();

  // Fetch all users in group
  const { data: users, error: usersError } = await supabase
    .from("triathlon_users")
    .select("id, strava_athlete_id, name, avatar_url, group_code, sport_goal, created_at")
    .eq("group_code", code);

  if (usersError || !users) {
    return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 });
  }

  if (users.length === 0) {
    return NextResponse.json({ entries: [], weekStart, groupCode: code });
  }

  // Fetch this week's stats for all users in group
  const userIds = users.map((u) => u.id);
  const { data: stats } = await supabase
    .from("triathlon_weekly_stats")
    .select("*")
    .in("user_id", userIds)
    .eq("week_start", weekStart);

  const entries: LeaderboardEntry[] = users.map((user) => ({
    user,
    stats: stats?.find((s) => s.user_id === user.id) ?? null,
  }));

  // Sort by total hours (swim + bike + run + other) descending
  entries.sort((a, b) => {
    const hoursA = a.stats
      ? a.stats.total_hours_swim + a.stats.total_hours_bike + a.stats.total_hours_run + a.stats.total_hours_other
      : 0;
    const hoursB = b.stats
      ? b.stats.total_hours_swim + b.stats.total_hours_bike + b.stats.total_hours_run + b.stats.total_hours_other
      : 0;
    return hoursB - hoursA;
  });

  return NextResponse.json({ entries, weekStart, groupCode: code });
}
