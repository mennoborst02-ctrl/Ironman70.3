import { AthleteGoals, PhaseInfo, Session, WeekSummary, AdaptationRule, StravaActivity, Discipline } from "@/types/schema";

// RACE_DATE wordt nu bepaald door de gebruikersinstellingen (settings.race.date).
// We houden een fallback voor het schema-generator die een vaste datum nodig heeft.
export const RACE_DATE = "2027-06-13"; // schema-generator fallback
export const TODAY = new Date().toISOString().slice(0, 10); // echte datum van vandaag

export const athleteGoals: AthleteGoals = {
  raceName: "Ironman 70.3 Westfriesland",
  raceDate: RACE_DATE,
  raceLocation: "Westfriesland, NL",
  targetTotalTime: "4:30:00",
  splits: {
    swim: { distanceKm: 1.9, targetTime: "38:00", targetPace: "2:00/100m" },
    t1: { targetTime: "2:30" },
    bike: { distanceKm: 90, targetTime: "2:34:00", targetSpeed: "35 km/h" },
    t2: { targetTime: "1:30" },
    run: { distanceKm: 21.1, targetTime: "1:34:00", targetPace: "4:28/km" },
  },
  ftpWatts: undefined,
  currentBests: {
    swim1km: "22:40",
    bike40km: "1:19:08 (42,4 km)",
    run10km: "48:12",
  },
};

export const phases: PhaseInfo[] = [
  {
    phase: 1,
    name: "Aerobe basis",
    shortName: "Basis",
    dateStart: "2026-06-15",
    dateEnd: "2026-09-27",
    focus: "Zone 2 duurvermogen, zwemtechniek, fietsvolume opbouwen. Geen hockey — ongestoord bouwen.",
    weeklyHoursTarget: [8, 10],
  },
  {
    phase: 2,
    name: "Opbouw",
    shortName: "Opbouw",
    dateStart: "2026-09-28",
    dateEnd: "2026-12-27",
    focus: "Hockey hervat (di/do training, zo wedstrijd). Lange ritten naar 3,5-4u, zwemvolume naar 3x/week.",
    weeklyHoursTarget: [9, 12],
  },
  {
    phase: 3,
    name: "Race-specifiek",
    shortName: "Race-specifiek",
    dateStart: "2026-12-28",
    dateEnd: "2027-05-09",
    focus: "Zwaarste bricks, drempeltraining fiets (35 km/h doel), voeding testen, openwater hervat.",
    weeklyHoursTarget: [11, 14],
  },
  {
    phase: 4,
    name: "Taper",
    shortName: "Taper",
    dateStart: "2027-05-10",
    dateEnd: "2027-06-13",
    focus: "Volume afbouwen, intensiteit kort en scherp houden. Hockey laatste 2 weken minimaliseren.",
    weeklyHoursTarget: [4, 9],
  },
];

export const adaptationRules: AdaptationRule[] = [
  {
    id: "r1",
    trigger: "Sessie staat gepland op een ingestelde horeca-werkdag",
    action: "Sessie verschuift automatisch 2 uur later, zodat je na een late dienst kunt uitslapen",
    icon: "moon",
  },
  {
    id: "r2",
    trigger: "Hockeywedstrijd op zondag gespeeld (vast in het schema)",
    action: "Maandagochtend wordt automatisch lichter: kwaliteit vervangen door Zone 2 of rust",
    icon: "shield",
  },
  {
    id: "r3",
    trigger: "Strava-activiteit mist 2 dagen op rij t.o.v. schema",
    action: "Belasting-waarschuwing op Vandaag, status wordt 'Gemist' per sessie",
    icon: "calendar-x",
  },
  {
    id: "r4",
    trigger: "Tempo tijdens training >15% langzamer dan doeltempo",
    action: "Melding bij die sessie. Bij twee keer op rij: eerstvolgende vergelijkbare sessie wordt automatisch lichter",
    icon: "gauge",
  },
  {
    id: "r5",
    trigger: "Gemiddelde hartslag tijdens training >10% boven verwachte zone",
    action: "Melding bij die sessie. Bij twee keer op rij: eerstvolgende vergelijkbare sessie wordt automatisch lichter",
    icon: "heart-pulse",
  },
];

// ---- Session generation ----

function id(weekNum: number, day: string) {
  return `w${weekNum}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function phaseForDate(date: string): 1 | 2 | 3 | 4 {
  const p = phases.find((p) => date >= p.dateStart && date <= p.dateEnd);
  return (p?.phase ?? 4) as 1 | 2 | 3 | 4;
}

// Build one week of sessions given the Monday date and phase
function buildWeek(mondayDate: string, weekNumber: number): Session[] {
  const phase = phaseForDate(mondayDate);
  const sessions: Session[] = [];

  const dates = {
    ma: mondayDate,
    di: addDays(mondayDate, 1),
    wo: addDays(mondayDate, 2),
    do: addDays(mondayDate, 3),
    vr: addDays(mondayDate, 4),
    za: addDays(mondayDate, 5),
    zo: addDays(mondayDate, 6),
  };


  if (phase === 1) {
    // Aerobe basis: ma zwem, di loop, wo fiets lang, do zwem, vr gym, za fiets/loop, zo rust/zwem
    sessions.push(mk(id(weekNumber, "ma"), dates.ma, "swim", "Zwemmen — techniek", "Baanzwemmen, focus op slagtechniek en ademritme.", 50, undefined, undefined, false, { swimType: "pool" }));
    sessions.push(mk(id(weekNumber, "di"), dates.di, "run", "Duurloop Z2", "Rustig tempo, gesprekstempo aanhouden.", 65, 11, "5:45/km", false));
    sessions.push(mk(id(weekNumber, "wo"), dates.wo, "bike", "Lange duurrit", "Zone 2, vóór werk. Dit is je kernsessie van de week.", 150, 75, "30 km/h", true));
    sessions.push(mk(id(weekNumber, "do"), dates.do, "swim", "Zwemmen — openwater", "Zodra mogelijk buiten, anders baanzwemmen 60 min.", 45, undefined, undefined, false, { swimType: "openwater" }));
    sessions.push(mk(id(weekNumber, "vr"), dates.vr, "gym", "Sportschool", "Kracht — blessurepreventie, single-leg werk, core.", 60, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "za"), dates.za, "run", "Duurloop", "Langere rustige duurloop, vóór werk.", 80, 13, "5:30/km", false));
    sessions.push(mk(id(weekNumber, "zo"), dates.zo, "rest", "Rust", "Actief herstel of volledige rust.", 0, undefined, undefined, false));
  } else if (phase === 2) {
    sessions.push(mk(id(weekNumber, "ma"), dates.ma, "swim", "Zwemmen — groep", "Triclub, contactzwemmen oefenen voor openwater starts.", 60, undefined, undefined, false, { swimType: "pool" }));
    sessions.push(mk(id(weekNumber, "di"), dates.di, "hockey", "Hockey training", "Telt als interval/snelheidswerk.", 90, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "wo"), dates.wo, "bike", "Lange duurrit", "Opbouwend naar 3,5u. Vóór werk.", 180, 95, "32 km/h", true));
    sessions.push(mk(id(weekNumber, "do"), dates.do, "hockey", "Hockey training", "Telt als interval/snelheidswerk.", 90, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "vr"), dates.vr, "gym", "Sportschool + loop", "Kracht + 30 min lopen, eerste brick-gevoel.", 75, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "za"), dates.za, "run", "Lange duurloop", "Opbouwend richting halve marathon, vóór werk.", 95, 16, "5:15/km", true));
    sessions.push(mk(id(weekNumber, "zo"), dates.zo, "hockey", "Hockeywedstrijd", "Telt als actieve training.", 70, undefined, undefined, false));
  } else if (phase === 3) {
    sessions.push(mk(id(weekNumber, "ma"), dates.ma, "swim", "Zwemmen — 1,9km opbouw", "Aan-stuk-zwemmen richting racetempo 2:00/100m.", 70, 1.9, "2:00/100m", true, { swimType: "pool" }));
    sessions.push(mk(id(weekNumber, "di"), dates.di, "hockey", "Hockey training", "—", 90, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "wo"), dates.wo, "bike", "Drempeltraining", "2×20 min op drempeltempo — bouwt FTP voor 35 km/h doel.", 90, 45, "36-38 km/h", true));
    sessions.push(mk(id(weekNumber, "do"), dates.do, "hockey", "Hockey + brick-loop", "Na hockey 20 min lopen op kalm tempo — klein brick-effect.", 110, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "vr"), dates.vr, "gym", "Sportschool licht + zwem", "Stabiliteit en techniek, geen zware benen.", 75, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "za"), dates.za, "brick", "Brick: fiets + loop", "2,5u fietsen op 35 km/h → direct 8 km lopen. Zwaarste sessie van de week.", 220, 98, "35 km/h + 4:30/km", true));
    sessions.push(mk(id(weekNumber, "zo"), dates.zo, "hockey", "Hockeywedstrijd", "Herstel krijgt prioriteit erna.", 70, undefined, undefined, false));
  } else {
    sessions.push(mk(id(weekNumber, "ma"), dates.ma, "swim", "Zwemmen rustig", "Kort en scherp, racetempo proeven.", 35, 1, "2:00/100m", false, { swimType: "pool" }));
    sessions.push(mk(id(weekNumber, "di"), dates.di, "hockey", "Hockey training (licht)", "Laatste 2 weken: rustig aan.", 60, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "wo"), dates.wo, "bike", "Fietsen los", "Benen losmaken, niet harder dan Z2.", 60, 30, "30 km/h", false));
    sessions.push(mk(id(weekNumber, "do"), dates.do, "run", "Strides", "15 min joggen + 4×100m op racetempo.", 25, 4, "4:30/km", false));
    sessions.push(mk(id(weekNumber, "vr"), dates.vr, "rest", "Rust", "Mobiliteit en stretching, spullen klaarleggen.", 20, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "za"), dates.za, "rest", "Activeren", "Kort en licht — laatste keer voelen vóór de race.", 20, undefined, undefined, false));
    sessions.push(mk(id(weekNumber, "zo"), dates.zo, "rest", "Race / rust", "—", 0, undefined, undefined, false));
  }

  return sessions;
}

function mk(
  sid: string,
  date: string,
  discipline: Discipline,
  title: string,
  description: string,
  plannedDurationMin: number,
  plannedDistanceKm: number | undefined,
  targetPace: string | undefined,
  isKeySession: boolean,
  extra?: { swimType?: "pool" | "openwater" }
): Session {
  const status: Session["status"] = date < TODAY ? "completed" : date === TODAY ? "upcoming" : "upcoming";
  return {
    id: sid,
    date,
    discipline,
    swimType: extra?.swimType,
    title,
    description,
    plannedDurationMin,
    plannedDistanceKm,
    targetPace,
    isKeySession,
    status: discipline === "rest" ? "rest" : status,
  };
}

// Generate all weeks from phase 1 start to race date
function generateAllWeeks(): WeekSummary[] {
  const weeks: WeekSummary[] = [];
  let cursor = phases[0].dateStart; // first Monday
  let weekNum = 1;

  while (cursor <= RACE_DATE) {
    const sessions = buildWeek(cursor, weekNum);
    const phase = phaseForDate(cursor);
    const totalPlannedHours = sessions.reduce((sum, s) => sum + s.plannedDurationMin, 0) / 60;

    weeks.push({
      weekNumber: weekNum,
      phase,
      dateStart: cursor,
      dateEnd: addDays(cursor, 6),
      sessions,
      totalPlannedHours: Math.round(totalPlannedHours * 10) / 10,
    });

    cursor = addDays(cursor, 7);
    weekNum++;
  }

  return weeks;
}

export const allWeeks: WeekSummary[] = generateAllWeeks();

export function getWeekForDate(date: string): WeekSummary | undefined {
  return allWeeks.find((w) => date >= w.dateStart && date <= w.dateEnd);
}

export function getTodaySession(): Session | undefined {
  const week = getWeekForDate(TODAY);
  return week?.sessions.find((s) => s.date === TODAY);
}

export function daysUntilRace(raceDate?: string): number {
  const target = new Date(raceDate ?? RACE_DATE);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ---- Mock completed sessions (for the past, to show actuals) ----
// We retroactively mark the most recent 10 days of sessions as completed with plausible actuals.

function seedActuals() {
  const past = allWeeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.date < TODAY && s.discipline !== "rest")
    .slice(-8);

  past.forEach((s, i) => {
    const variance = 0.9 + (i % 5) * 0.05;
    s.status = i === 2 ? "missed" : i === 5 ? "modified" : "completed";
    if (s.status !== "missed") {
      s.actual = {
        durationMin: Math.round(s.plannedDurationMin * variance),
        distanceKm: s.plannedDistanceKm ? Math.round(s.plannedDistanceKm * variance * 10) / 10 : undefined,
        avgHeartRate: s.discipline === "run" ? 152 : s.discipline === "bike" ? 142 : 128,
        avgPace: s.targetPace,
        perceivedLoad: i % 3 === 0 ? "moderate" : i % 3 === 1 ? "easy" : "hard",
      };
    }
    if (s.status === "modified") {
      s.adaptationNote = "Automatisch verlicht — rustpols lag 14% boven gemiddelde na late hореca-dienst.";
    }
  });
}

seedActuals();

// ---- Mock Strava activities (for the Strava tab) ----
export const mockStravaActivities: StravaActivity[] = allWeeks
  .flatMap((w) => w.sessions)
  .filter((s) => s.status === "completed" || s.status === "modified")
  .slice(-6)
  .map((s, i) => ({
    id: `strava-${i}`,
    date: s.date,
    type: s.discipline === "swim" ? "Swim" : s.discipline === "bike" ? "Ride" : "Run",
    name: s.title,
    durationMin: s.actual?.durationMin ?? s.plannedDurationMin,
    distanceKm: s.actual?.distanceKm ?? s.plannedDistanceKm ?? 0,
    avgHeartRate: s.actual?.avgHeartRate,
    matchedSessionId: s.id,
  }));
