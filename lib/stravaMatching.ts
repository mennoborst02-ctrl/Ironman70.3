import { Session, Discipline } from "@/types/schema";

export interface RawStravaActivity {
  id: number;
  name: string;
  type: string; // Strava's type: "Run", "Ride", "Swim", etc.
  start_date: string; // ISO datetime
  moving_time: number; // seconds
  distance: number; // meters
  average_heartrate?: number;
  suffer_score?: number;
}

const stravaTypeToDiscipline: Record<string, Discipline> = {
  Run: "run",
  Ride: "bike",
  VirtualRide: "bike",
  Swim: "swim",
};

function disciplineMatches(stravaType: string, planned: Discipline): boolean {
  const mapped = stravaTypeToDiscipline[stravaType];
  if (!mapped) return false;
  // Brick-sessies kunnen in Strava als losse Ride + Run activiteiten staan.
  if (planned === "brick") return mapped === "bike" || mapped === "run";
  return mapped === planned;
}

function sameDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

function adaptationNoteFor(actualMin: number, plannedMin: number, tooShort: boolean): string {
  if (tooShort) {
    return `Korter dan gepland (${actualMin} van ${plannedMin} min) — kan op vermoeidheid wijzen.`;
  }
  return `Langer dan gepland (${actualMin} van ${plannedMin} min) — check of dit een bewuste keuze was.`;
}

/**
 * Koppelt Strava-activiteiten aan geplande sessies voor een gegeven week.
 * Geeft een nieuwe array sessions terug met .actual, .status en eventueel
 * .adaptationNote ingevuld op basis van wat er echt getraind is.
 */
export function matchActivitiesToSessions(sessions: Session[], activities: RawStravaActivity[]): Session[] {
  return sessions.map((session) => {
    if (session.discipline === "rest") return session;

    const match = activities.find(
      (a) => sameDay(a.start_date, session.date) && disciplineMatches(a.type, session.discipline)
    );

    if (!match) {
      const sessionDate = new Date(session.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sessionDate < today) {
        return { ...session, status: "missed" as const };
      }
      return session;
    }

    const durationMin = Math.round(match.moving_time / 60);
    const distanceKm = Math.round((match.distance / 1000) * 10) / 10;

    const durationRatio = session.plannedDurationMin > 0 ? durationMin / session.plannedDurationMin : 1;
    const tooShort = durationRatio < 0.7;
    const tooLong = durationRatio > 1.3;
    const isModified = tooShort || tooLong;

    return {
      ...session,
      status: isModified ? ("modified" as const) : ("completed" as const),
      actual: {
        durationMin,
        distanceKm,
        avgHeartRate: match.average_heartrate ? Math.round(match.average_heartrate) : undefined,
        stravaActivityId: String(match.id),
      },
      adaptationNote: isModified ? adaptationNoteFor(durationMin, session.plannedDurationMin, tooShort) : undefined,
    };
  });
}

// ---- Belasting & herstel inschatting op basis van recente activiteiten ----

export interface LoadAssessment {
  recentLoadScore: number; // 0-100, hoger = zwaarder belast
  consecutiveDaysTrained: number;
  missedLast7Days: number;
  recommendation: "normaal" | "verlicht" | "rust_inlassen";
  recommendationReason: string;
}

export function assessRecentLoad(activities: RawStravaActivity[], plannedSessions: Session[]): LoadAssessment {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const recent = activities.filter((a) => new Date(a.start_date) >= sevenDaysAgo);
  const totalMinutes = recent.reduce((sum, a) => sum + a.moving_time / 60, 0);
  const totalSufferScore = recent.reduce((sum, a) => sum + (a.suffer_score ?? 0), 0);

  // Eenvoudige belastingscore: combinatie van volume en gerapporteerde inspanning.
  const loadScore = Math.min(100, Math.round(totalMinutes / 6 + totalSufferScore / 4));

  // Tel opeenvolgende dagen met een activiteit (vanaf vandaag terug).
  let consecutiveDays = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    const hasActivity = activities.some((a) => a.start_date.slice(0, 10) === dStr);
    if (hasActivity) consecutiveDays++;
    else break;
  }

  const missedLast7Days = plannedSessions.filter((s) => {
    if (s.discipline === "rest") return false;
    const sDate = new Date(s.date);
    if (sDate < sevenDaysAgo || sDate > today) return false;
    return s.status === "missed";
  }).length;

  let recommendation: LoadAssessment["recommendation"] = "normaal";
  let recommendationReason = "Belasting en herstel zien er in balans uit.";

  if (consecutiveDays >= 7) {
    recommendation = "rust_inlassen";
    recommendationReason = `${consecutiveDays} dagen op rij getraind zonder rustdag — plan bewust een rustmoment in.`;
  } else if (loadScore > 75) {
    recommendation = "verlicht";
    recommendationReason = "Trainingsbelasting van de laatste 7 dagen ligt hoog — overweeg de volgende kwaliteitssessie te verlichten.";
  } else if (missedLast7Days >= 2) {
    recommendation = "verlicht";
    recommendationReason = `${missedLast7Days} geplande sessies gemist deze week — het schema schuift door zonder volume in te halen.`;
  }

  return {
    recentLoadScore: loadScore,
    consecutiveDaysTrained: consecutiveDays,
    missedLast7Days,
    recommendation,
    recommendationReason,
  };
}
