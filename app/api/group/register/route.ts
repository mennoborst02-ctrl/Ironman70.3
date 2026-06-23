import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

// POST /api/group/register
// Called after Strava OAuth completes. Saves/updates the user in Supabase.
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("strava_access_token")?.value;
  const refreshToken = request.cookies.get("strava_refresh_token")?.value;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Niet verbonden met Strava" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { groupCode, sportGoal = "triathlon" } = body as {
    groupCode?: string;
    sportGoal?: string;
  };

  if (!groupCode || groupCode.trim().length < 3) {
    return NextResponse.json({ error: "Groepscode is te kort (minimaal 3 tekens)" }, { status: 400 });
  }

  // Fetch athlete profile from Strava
  const athleteRes = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!athleteRes.ok) {
    return NextResponse.json({ error: "Kon Strava-profiel niet ophalen" }, { status: 502 });
  }

  const athlete = await athleteRes.json();

  // Get token expiry from Strava (if missing, default to 6 hours from now)
  const expiresAt = Math.floor(Date.now() / 1000) + 21600;

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("triathlon_users")
    .upsert(
      {
        strava_athlete_id: athlete.id,
        name: `${athlete.firstname} ${athlete.lastname}`.trim(),
        avatar_url: athlete.profile_medium ?? null,
        group_code: groupCode.trim().toUpperCase(),
        sport_goal: sportGoal,
        strava_access_token: accessToken,
        strava_refresh_token: refreshToken,
        strava_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "strava_athlete_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Supabase upsert error:", error);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: data });
}
