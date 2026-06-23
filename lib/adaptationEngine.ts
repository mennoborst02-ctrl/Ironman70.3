import { Session, WeekSummary } from "@/types/schema";
import { AthleteSettings, Weekday, dateToWeekday } from "@/lib/athleteSettings";

/**
 * Regel 1 — horeca-dag: als een sessie gepland staat op een dag die de
 * gebruiker als horeca-werkdag heeft ingesteld, schuift de sessie 2 uur op.
 * Dit past alleen het label/beschrijving aan (de app heeft geen kloktijden
 * per sessie, dus we maken dit zichtbaar via een adaptationNote in plaats
 * van een onzichtbare tijd-wijziging).
 */
function applyHorecaShift(session: Session, horecaDays: Weekday[]): Session {
  if (session.discipline === "rest") return session;
  if (session.status !== "upcoming") return session;

  const weekday = dateToWeekday(session.date);
  if (!horecaDays.includes(weekday)) return session;

  return {
    ...session,
    adaptationNote: "Verschuift 2 uur later — je werkt deze dag in de horeca.",
  };
}

/**
 * Regel 2 — hockeywedstrijd op zondag: de maandagochtend-sessie wordt
 * automatisch verlicht (kwaliteit -> Zone 2 of rust-toon), ongeacht wat er
 * oorspronkelijk gepland stond.
 */
function applyMondayAfterMatch(session: Session, allSessions: Session[]): Session {
  if (session.status !== "upcoming") return session;
  const weekday = dateToWeekday(session.date);
  if (weekday !== "ma") return session;

  // Find the Sunday directly before this Monday
  const sundayDate = new Date(session.date);
  sundayDate.setDate(sundayDate.getDate() - 1);
  const sundayStr = sundayDate.toISOString().slice(0, 10);

  const sundaySession = allSessions.find((s) => s.date === sundayStr && s.discipline === "hockey");
  if (!sundaySession) return session;

  if (session.isKeySession || session.discipline === "bike" || session.discipline === "brick") {
    return {
      ...session,
      adaptationNote: "Verlicht — gisteren hockeywedstrijd gespeeld. Houd dit rustig (Zone 2) of sla over.",
    };
  }

  return session;
}

export interface PerformanceFlag {
  sessionId: string;
  type: "tempo_langzaam" | "hartslag_hoog";
  message: string;
}

/**
 * Regel 4 & 5 — tempo en hartslag tijdens een training vergelijken met wat
 * verwacht werd. We gebruiken de al berekende actual-data (gevuld door
 * stravaMatching.ts) zodat hier geen nieuwe Strava-calls nodig zijn.
 */
export function detectPerformanceFlags(sessions: Session[]): PerformanceFlag[] {
  const flags: PerformanceFlag[] = [];

  for (const session of sessions) {
    if (session.status !== "completed" && session.status !== "modified") continue;
    if (!session.actual) continue;

    // Tempo: vergelijk geplande duur met werkelijke duur voor eenzelfde afstand
    // als signaal voor "trager dan verwacht" wanneer er geen losse pace-data is.
    if (session.plannedDistanceKm && session.actual.distanceKm && session.actual.distanceKm > 0) {
      const plannedMinPerKm = session.plannedDurationMin / session.plannedDistanceKm;
      const actualMinPerKm = session.actual.durationMin / session.actual.distanceKm;
      const slowerByPct = ((actualMinPerKm - plannedMinPerKm) / plannedMinPerKm) * 100;

      if (slowerByPct > 15) {
        flags.push({
          sessionId: session.id,
          type: "tempo_langzaam",
          message: `Tempo lag ${Math.round(slowerByPct)}% onder doeltempo tijdens "${session.title}".`,
        });
      }
    }

    // Hartslag: vergelijk met een ruwe verwachte score per discipline.
    // Zonder ingestelde max hartslag van de gebruiker is dit een vaste
    // vuistregel-drempel per discipline, bedoeld als signaal, niet als exacte zone.
    const expectedHrCeiling: Record<string, number> = { run: 165, bike: 155, swim: 150, brick: 165 };
    const ceiling = expectedHrCeiling[session.discipline];
    if (ceiling && session.actual.avgHeartRate && session.actual.avgHeartRate > ceiling * 1.1) {
      flags.push({
        sessionId: session.id,
        type: "hartslag_hoog",
        message: `Gemiddelde hartslag (${session.actual.avgHeartRate} bpm) lag opvallend hoog tijdens "${session.title}".`,
      });
    }
  }

  return flags;
}

/**
 * Bij 2x dezelfde discipline-vlag op rij (binnen de laatste 3 sessies van die
 * discipline): markeer de eerstvolgende geplande sessie van die discipline
 * als automatisch verlicht. Dit is de "lichte automatische aanpassing"; grote
 * herplanningen blijven via scheduleProposals.ts aan de gebruiker gevraagd.
 */
function applyRepeatedFlagLightening(session: Session, flags: PerformanceFlag[], allSessions: Session[]): Session {
  if (session.status !== "upcoming") return session;
  if (session.discipline === "rest") return session;

  const sameDisciplineCompleted = allSessions
    .filter((s) => s.discipline === session.discipline && (s.status === "completed" || s.status === "modified"))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-3);

  const sameDisciplineFlags = flags.filter((f) => sameDisciplineCompleted.some((s) => s.id === f.sessionId));

  const tempoFlags = sameDisciplineFlags.filter((f) => f.type === "tempo_langzaam");
  const hrFlags = sameDisciplineFlags.filter((f) => f.type === "hartslag_hoog");

  if (tempoFlags.length >= 2) {
    return {
      ...session,
      adaptationNote: "Automatisch verlicht — tempo lag de laatste 2 trainingen onder doel. Bouw rustig op.",
    };
  }

  if (hrFlags.length >= 2) {
    return {
      ...session,
      adaptationNote: "Automatisch verlicht — hartslag was de laatste 2 trainingen opvallend hoog. Mogelijk vermoeidheid.",
    };
  }

  return session;
}

/**
 * Voert alle automatische, "lichte" aanpassingen uit op een lijst weken.
 * Geeft een nieuwe array terug; muteert niets in place.
 */
export function applyAutomaticAdaptations(weeks: WeekSummary[], settings: AthleteSettings): WeekSummary[] {
  const allSessions = weeks.flatMap((w) => w.sessions);
  const flags = detectPerformanceFlags(allSessions);

  return weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      let s = session;
      // Respecteer een al bestaande adaptationNote uit Strava-matching (bv.
      // "korter dan gepland") — automatische regels overschrijven die niet.
      if (s.adaptationNote) return s;

      s = applyHorecaShift(s, settings.horecaDays);
      if (s.adaptationNote) return s;

      s = applyMondayAfterMatch(s, allSessions);
      if (s.adaptationNote) return s;

      s = applyRepeatedFlagLightening(s, flags, allSessions);
      return s;
    }),
  }));
}
