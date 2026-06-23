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

async function fetchWithAuth(url: string, accessToken: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
}

// Haalt detailgegevens op voor één activiteit: splits per km, hartslagzones, power.
// GET /api/strava/activity-detail?id=123456
export async function GET(request: NextRequest) {
  const activityId = request.nextUrl.searchParams.get("id");
  if (!activityId) {
    return NextResponse.json({ error: "id parameter ontbreekt" }, { status: 400 });
  }

  let accessToken = request.cookies.get("strava_access_token")?.value;
  const refreshToken = request.cookies.get("strava_refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ error: "niet gekoppeld" }, { status: 401 });
  }

  let refreshedTokenData = null;
  if (!accessToken && refreshToken) {
    refreshedTokenData = await refreshAccessToken(refreshToken);
    if (!refreshedTokenData) {
      return NextResponse.json({ error: "token verversen mislukt" }, { status: 401 });
    }
    accessToken = refreshedTokenData.access_token;
  }

  // Detail-endpoint geeft o.a. splits_metric (per km), hartslag- en snelheidsdata.
  let detailRes = await fetchWithAuth(`https://www.strava.com/api/v3/activities/${activityId}`, accessToken!);

  if (detailRes.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed) {
      accessToken = refreshed.access_token;
      refreshedTokenData = refreshed;
      detailRes = await fetchWithAuth(`https://www.strava.com/api/v3/activities/${activityId}`, accessToken!);
    }
  }

  if (!detailRes.ok) {
    return NextResponse.json({ error: "kon activiteit niet ophalen" }, { status: detailRes.status });
  }

  const detail = await detailRes.json();

  // Hartslagzones — apart endpoint, kan ontbreken als er geen HR-data is.
  let zones = null;
  const zonesRes = await fetchWithAuth(`https://www.strava.com/api/v3/activities/${activityId}/zones`, accessToken!);
  if (zonesRes.ok) {
    zones = await zonesRes.json();
  }

  const response = NextResponse.json({
    id: detail.id,
    name: detail.name,
    type: detail.type,
    splits_metric: detail.splits_metric ?? null, // array van {distance, elapsed_time, average_speed, average_heartrate}
    average_heartrate: detail.average_heartrate ?? null,
    max_heartrate: detail.max_heartrate ?? null,
    average_speed: detail.average_speed ?? null,
    max_speed: detail.max_speed ?? null,
    zones, // hartslagzones: [{type: "heartrate", distribution_buckets: [{min,max,time}]}]
  });

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
