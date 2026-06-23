import { NextRequest, NextResponse } from "next/server";

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function GET(request: NextRequest) {
  let accessToken = request.cookies.get("strava_access_token")?.value;
  const refreshToken = request.cookies.get("strava_refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ connected: false, activities: [] });
  }

  // Token verlopen of niet aanwezig? Probeer te verversen met refresh token.
  let refreshedTokenData = null;
  if (!accessToken && refreshToken) {
    refreshedTokenData = await refreshAccessToken(refreshToken);
    if (!refreshedTokenData) {
      return NextResponse.json({ connected: false, activities: [] });
    }
    accessToken = refreshedTokenData.access_token;
  }

  const activitiesRes = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=20",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (activitiesRes.status === 401) {
    // Token bleek alsnog verlopen — probeer eenmalig te verversen
    if (refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed) {
        const retryRes = await fetch(
          "https://www.strava.com/api/v3/athlete/activities?per_page=20",
          { headers: { Authorization: `Bearer ${refreshed.access_token}` } }
        );
        const activities = await retryRes.json();
        const response = NextResponse.json({ connected: true, activities });
        response.cookies.set("strava_access_token", refreshed.access_token, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: refreshed.expires_at - Math.floor(Date.now() / 1000),
          path: "/",
        });
        return response;
      }
    }
    return NextResponse.json({ connected: false, activities: [] });
  }

  const activities = await activitiesRes.json();

  const response = NextResponse.json({ connected: true, activities });

  // Als we net ververst hebben, zet de nieuwe token ook in de cookie
  if (refreshedTokenData) {
    response.cookies.set("strava_access_token", refreshedTokenData.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: refreshedTokenData.expires_at - Math.floor(Date.now() / 1000),
      path: "/",
    });
  }

  return response;
}
