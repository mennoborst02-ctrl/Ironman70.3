import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const hasToken = Boolean(
    request.cookies.get("strava_access_token")?.value ||
      request.cookies.get("strava_refresh_token")?.value
  );
  const athleteName = request.cookies.get("strava_athlete_name")?.value ?? null;

  return NextResponse.json({ connected: hasToken, athleteName });
}
