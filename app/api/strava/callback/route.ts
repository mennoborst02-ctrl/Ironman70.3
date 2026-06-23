import { NextRequest, NextResponse } from "next/server";

// Stap 2 van de OAuth-flow: Strava stuurt de gebruiker hierheen terug met een
// tijdelijke "code". Die wisselen we hier in voor een access token — dit
// gebeurt op de server, dus de Client Secret komt nooit in de browser.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  // Na succesvolle koppeling: als de user via onboarding is gekomen stuur hem
  // terug naar onboarding (de referrer-check), anders naar /strava.
  const referer = request.headers.get("referer") ?? "";
  const backTo = referer.includes("onboarding") ? "/onboarding" : "/strava";
  const appUrl = new URL(backTo, request.nextUrl.origin);

  if (error) {
    // Gebruiker heeft geweigerd of er ging iets mis bij Strava
    appUrl.searchParams.set("strava_error", error);
    return NextResponse.redirect(appUrl);
  }

  if (!code) {
    appUrl.searchParams.set("strava_error", "geen_code_ontvangen");
    return NextResponse.redirect(appUrl);
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    appUrl.searchParams.set("strava_error", "server_niet_geconfigureerd");
    return NextResponse.redirect(appUrl);
  }

  // Wissel de tijdelijke code in voor een access token + refresh token
  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    appUrl.searchParams.set("strava_error", "token_uitwisseling_mislukt");
    return NextResponse.redirect(appUrl);
  }

  const tokenData = await tokenResponse.json();
  // tokenData bevat: access_token, refresh_token, expires_at, athlete { ... }

  const response = NextResponse.redirect(appUrl);

  // Sla tokens op in een httpOnly cookie — onbereikbaar voor JavaScript in de
  // browser, dus veilig tegen scripts die op de pagina draaien.
  response.cookies.set("strava_access_token", tokenData.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: tokenData.expires_at - Math.floor(Date.now() / 1000),
    path: "/",
  });

  response.cookies.set("strava_refresh_token", tokenData.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // refresh token blijft lang geldig
    path: "/",
  });

  response.cookies.set(
    "strava_athlete_name",
    `${tokenData.athlete?.firstname ?? ""} ${tokenData.athlete?.lastname ?? ""}`.trim(),
    { secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" }
  );

  return response;
}
