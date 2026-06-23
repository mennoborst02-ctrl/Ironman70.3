# Sunrise — Ironman 70.3 Trainer

Trainingsapp voor de Ironman 70.3 Westfriesland, 13 juni 2027.

## Starten (lokaal testen)

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Wat erin zit

- **Vandaag** — countdown, sessie van vandaag, week in zon/maan-tegels, fase-voortgang
- **Schema** — volledig 42-weken plan in 4 fases, per week uitklapbaar
- **Strava** — connect-knop (nu mock), activiteiten, trainingsbelasting
- **Profiel** — racedoelen, splits, huidige PR's, instellingen

Alles draait nu op mock-data in `lib/mockData.ts`. Dat bestand bevat ook de
4-fase logica (basis / opbouw / race-specifiek / taper) en de 5 aanpas-regels
die straks echt gekoppeld worden aan Strava.

## Volgende stap: Strava-koppeling

1. Maak een Vercel-project van deze repo (vercel.com → Add New → Project)
2. Zet in Vercel → Settings → Environment Variables:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
3. Pas in je Strava API-instellingen (strava.com/settings/api) het
   "Authorization Callback Domain" aan naar je echte Vercel-domein
4. Dan bouwen we een API-route (`app/api/strava/callback/route.ts`) die de
   OAuth-uitwisseling doet — de Client Secret blijft op de server, nooit
   zichtbaar in de browser.

## Design

Sunrise-over-openwater thema — donkere nachtlucht boven, oranje zonsopgang
in het midden, water met rimpelingen onder. Het signature-element is de
zon/maan-dagtegel: een gevulde zon voor elke trainingsdag, een maan voor rust.
