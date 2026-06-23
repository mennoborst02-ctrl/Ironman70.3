import { NextRequest, NextResponse } from "next/server";

// Stap 1 van de OAuth-flow: stuurt de gebruiker naar Strava's eigen inlogscherm.
// De Client ID mag publiek zijn (die staat ook gewoon in de URL die Strava ziet).
export async function GET(req: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID ontbreekt. Zet deze in Vercel → Settings → Environment Variables." },
      { status: 500 }
    );
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/strava/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    // scope: read = profiel, activity:read_all = alle activiteiten (ook privé) kunnen lezen
    scope: "read,activity:read_all",
  });

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`);
}
