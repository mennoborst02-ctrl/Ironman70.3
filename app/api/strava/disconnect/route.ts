import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ disconnected: true });
  response.cookies.delete("strava_access_token");
  response.cookies.delete("strava_refresh_token");
  response.cookies.delete("strava_athlete_name");
  return response;
}
