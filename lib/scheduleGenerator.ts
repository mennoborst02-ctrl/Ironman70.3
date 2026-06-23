/**
 * Dynamic training schedule generator.
 *
 * Principles:
 * - Counts back from race date, not forward from a fixed start
 * - Progressive overload: volume grows ~8% per week within a block
 * - Periodization: 3 weeks build + 1 week recovery (lower volume, same intensity)
 * - Sport-specific: only generates sessions for the athlete's disciplines
 * - Phase character: Base → Build → Race-specific → Taper
 * - Taper: last 3 weeks, volume drops fast, short sharp sessions remain
 */

import { Session, WeekSummary, Phase, PhaseInfo, Discipline } from "@/types/schema";
import { SportDiscipline, RaceGoal } from "@/lib/athleteSettings";

// ---- Helpers ----

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function prevMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function weeksBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / (7 * 86400 * 1000));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function mkId(weekNum: number, day: string): string {
  return `w${weekNum}-${day}`;
}

// ---- Volume scaling ----

// Returns a multiplier 0-1 for how much volume to schedule relative to peak.
// Applies periodization (every 4th week is a recovery week at 65% volume).
function volumeMultiplier(weekNum: number, totalWeeks: number): number {
  const weeksFromEnd = totalWeeks - weekNum;

  // Taper: last 3 weeks
  if (weeksFromEnd <= 2) return 0.35;
  if (weeksFromEnd <= 4) return 0.55;

  // Build block: 3-up 1-down pattern
  const blockPosition = (weekNum - 1) % 4; // 0,1,2 = build weeks, 3 = recovery
  const isRecovery = blockPosition === 3;

  // Linear ramp from 60% to 95% over the full schedule (excluding taper)
  const buildWeeks = totalWeeks - 4; // exclude taper weeks
  const progress = Math.min(1, weekNum / buildWeeks);
  const baseFactor = 0.60 + progress * 0.35;

  return isRecovery ? baseFactor * 0.65 : baseFactor;
}

// ---- Phase assignment ----

function phaseForWeek(weekNum: number, totalWeeks: number): Phase {
  const weeksFromEnd = totalWeeks - weekNum;
  if (weeksFromEnd <= 3) return 4; // Taper
  const pct = weekNum / totalWeeks;
  if (pct < 0.38) return 1; // Base
  if (pct < 0.65) return 2; // Build
  return 3; // Race-specific
}

// ---- Session factories per discipline ----

interface SessionTemplate {
  day: string;
  discipline: Discipline;
  title: string;
  description: string;
  baseDurationMin: number;
  targetPaceTemplate?: string;
  isKeySession: boolean;
  swimType?: "pool" | "openwater";
}

const SWIM_TEMPLATES: SessionTemplate[] = [
  {
    day: "ma",
    discipline: "swim",
    title: "Zwemmen — techniek",
    description: "Baanzwemmen, focus op slagtechniek en ademritme.",
    baseDurationMin: 50,
    isKeySession: false,
    swimType: "pool",
  },
  {
    day: "do",
    discipline: "swim",
    title: "Zwemmen — openwater",
    description: "Openwater duurzwemmen. Focus op sighting en gelijkmatig tempo.",
    baseDurationMin: 45,
    isKeySession: false,
    swimType: "openwater",
  },
];

const BIKE_TEMPLATES = (phase: Phase): SessionTemplate[] => [
  {
    day: "wo",
    discipline: "bike",
    title: phase >= 3 ? "Drempeltraining fiets" : "Lange duurrit",
    description: phase >= 3
      ? "2×20 min op drempeltempo. Kerntraining voor je fietstempo richting de race."
      : "Zone 2 duurrit. Lekker rustig, ademhaling onder controle houden.",
    baseDurationMin: phase >= 3 ? 90 : 150,
    targetPaceTemplate: phase >= 3 ? "35-37 km/h" : "30-32 km/h",
    isKeySession: true,
  },
  {
    day: "za",
    discipline: "bike",
    title: "Lange duurrit",
    description: "Opbouwende duurrit. Voeding testen op langere ritten.",
    baseDurationMin: 180,
    targetPaceTemplate: "30-34 km/h",
    isKeySession: true,
  },
];

const RUN_TEMPLATES = (phase: Phase): SessionTemplate[] => [
  {
    day: "di",
    discipline: "run",
    title: phase >= 2 ? "Tempolopen" : "Duurloop",
    description: phase >= 2
      ? "Intervaltraining: 4-6× 1km op wedstrijdtempo met 90 sec rust."
      : "Rustige duurloop in Zone 2. Niet harder dan comfortabel aanvoelt.",
    baseDurationMin: phase >= 2 ? 55 : 65,
    targetPaceTemplate: phase >= 3 ? "4:20-4:30/km" : phase >= 2 ? "4:40-4:50/km" : "5:10-5:30/km",
    isKeySession: phase >= 2,
  },
  {
    day: "vr",
    discipline: "run",
    title: "Herstelloop",
    description: "Heel rustig — herstel na de intensieve training van gisteren.",
    baseDurationMin: 35,
    targetPaceTemplate: "5:30-6:00/km",
    isKeySession: false,
  },
  {
    day: "zo",
    discipline: "run",
    title: "Lange duurloop",
    description: "Langste loop van de week. Opbouwend richting wedstrijdafstand.",
    baseDurationMin: 80,
    targetPaceTemplate: "4:50-5:20/km",
    isKeySession: true,
  },
];

const BRICK_TEMPLATE = (phase: Phase): SessionTemplate => ({
  day: "za",
  discipline: "brick",
  title: "Brick: fiets + loop",
  description: phase >= 3
    ? "2,5u fietsen op 35 km/h → direct 8 km lopen op wedstrijdtempo."
    : "1,5u fietsen → direct 3-5 km lopen. Wennen aan zware benen.",
  baseDurationMin: phase >= 3 ? 220 : 140,
  targetPaceTemplate: phase >= 3 ? "35 km/h + 4:30/km" : "32 km/h + 5:00/km",
  isKeySession: true,
});

const GYM_TEMPLATE: SessionTemplate = {
  day: "vr",
  discipline: "gym",
  title: "Sportschool",
  description: "Kracht en stabiliteit. Core, single-leg oefeningen, blessurepreventie.",
  baseDurationMin: 60,
  isKeySession: false,
};

// ---- Build one week ----

function buildDynamicWeek(
  mondayDate: string,
  weekNumber: number,
  totalWeeks: number,
  disciplines: SportDiscipline[],
  _race: RaceGoal
): Session[] {
  const phase = phaseForWeek(weekNumber, totalWeeks);
  const volMult = volumeMultiplier(weekNumber, totalWeeks);
  const isTaper = phase === 4;
  const isRecovery = (weekNumber - 1) % 4 === 3 && !isTaper;

  const dayOffset: Record<string, number> = {
    ma: 0, di: 1, wo: 2, do: 3, vr: 4, za: 5, zo: 6,
  };

  const sessions: Session[] = [];
  const addedDays = new Set<string>();

  function addSession(template: SessionTemplate, mult = volMult) {
    const date = addDays(mondayDate, dayOffset[template.day]);
    if (addedDays.has(template.day)) return; // no double sessions same day
    addedDays.add(template.day);

    const duration = Math.round(template.baseDurationMin * mult);

    sessions.push({
      id: mkId(weekNumber, template.day),
      date,
      discipline: template.discipline,
      swimType: template.swimType,
      title: isTaper ? `${template.title} (taper)` : isRecovery ? `${template.title} (herstelweek)` : template.title,
      description: isTaper
        ? "Taperweel — houd het kort en scherp. Benen fris houden voor de race."
        : isRecovery
        ? "Herstelweek — zelfde soort training maar lichter. Laat je lichaam bijkomen."
        : template.description,
      plannedDurationMin: Math.max(20, duration),
      targetPace: template.targetPaceTemplate,
      isKeySession: template.isKeySession && !isTaper && !isRecovery,
      status: "upcoming",
    });
  }

  function addRest(day: string) {
    const date = addDays(mondayDate, dayOffset[day]);
    if (addedDays.has(day)) return;
    addedDays.add(day);
    sessions.push({
      id: mkId(weekNumber, day),
      date,
      discipline: "rest",
      title: "Rust",
      description: isTaper ? "Rust — bewaar je energie voor de race." : "Actieve rust of volledige rust.",
      plannedDurationMin: 0,
      isKeySession: false,
      status: "rest",
    });
  }

  if (isTaper) {
    // Taper: short, sharp, mostly rest
    if (disciplines.includes("swim")) addSession(SWIM_TEMPLATES[0], 0.5);
    if (disciplines.includes("bike")) addSession({ ...BIKE_TEMPLATES(phase)[0], baseDurationMin: 50 }, 0.5);
    if (disciplines.includes("run")) addSession({ ...RUN_TEMPLATES(phase)[0], title: "Strides + lichte loop", baseDurationMin: 25 }, 0.5);
    ["ma", "di", "wo", "do", "vr", "za", "zo"].forEach((d) => addRest(d));
    return sessions.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Swim sessions
  if (disciplines.includes("swim")) {
    SWIM_TEMPLATES.forEach((t) => addSession(t));
  }

  // Bike sessions — in race-specific phase, replace one long ride with brick (if triathlon)
  if (disciplines.includes("bike")) {
    if (disciplines.includes("run") && disciplines.includes("swim") && phase >= 2) {
      // Triathlon: long ride on wo, brick on za (replaces the saturday long ride)
      addSession(BIKE_TEMPLATES(phase)[0]);
      addSession(BRICK_TEMPLATE(phase));
    } else {
      // Bike-only or duathlon: both bike sessions
      BIKE_TEMPLATES(phase).forEach((t) => addSession(t));
    }
  }

  // Run sessions
  if (disciplines.includes("run")) {
    RUN_TEMPLATES(phase).forEach((t) => {
      // Don't add rest-day run if brick already took that slot
      if (addedDays.has(t.day)) return;
      addSession(t);
    });
  }

  // Gym — always, unless taper
  if (!addedDays.has("vr")) addSession(GYM_TEMPLATE, 1);

  // Fill remaining days with rest
  ["ma", "di", "wo", "do", "vr", "za", "zo"].forEach((d) => addRest(d));

  return sessions.sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Phase info ----

function buildPhaseInfo(
  totalWeeks: number,
  startMonday: string,
  raceDate: string
): PhaseInfo[] {
  const boundaries = [0.38, 0.65, 1.0];
  const names = ["Aerobe basis", "Opbouw", "Race-specifiek", "Taper"];
  const shortNames = ["Basis", "Opbouw", "Race-spec", "Taper"];
  const focuses = [
    "Zone 2 duurvermogen opbouwen. Veel kilometers, weinig intensiteit. Techniek verbeteren.",
    "Volume én intensiteit groeien. Eerste bricks, tempowerk, langere ritten.",
    "Race-specifieke sessies: drempeltraining, lange bricks op wedstrijdtempo, voeding testen.",
    "Volume halveren, intensiteit bewaken. Benen fris houden voor de race.",
  ];
  const hourTargets: [number, number][] = [[7, 10], [9, 13], [11, 15], [4, 8]];

  const phases: PhaseInfo[] = [];
  let prevEnd = addDays(startMonday, -1);

  for (let i = 0; i < 4; i++) {
    const endWeek = i < 3
      ? Math.floor(totalWeeks * boundaries[i])
      : totalWeeks;
    const phaseEndMonday = addDays(startMonday, (endWeek - 1) * 7);
    const phaseEnd = i === 3 ? raceDate : addDays(phaseEndMonday, 6);

    phases.push({
      phase: (i + 1) as Phase,
      name: names[i],
      shortName: shortNames[i],
      dateStart: addDays(prevEnd, 1),
      dateEnd: phaseEnd,
      focus: focuses[i],
      weeklyHoursTarget: hourTargets[i],
    });

    prevEnd = phaseEnd;
  }

  return phases;
}

// ---- Main generator ----

export interface GeneratedSchedule {
  weeks: WeekSummary[];
  phases: PhaseInfo[];
  totalWeeks: number;
  raceDate: string;
}

export function generateSchedule(
  race: RaceGoal,
  disciplines: SportDiscipline[]
): GeneratedSchedule {
  const raceDateStr = race.date;
  const todayStr = today();

  // Start from next Monday (or today's Monday if today is Monday)
  const startMonday = prevMonday(todayStr);

  const total = Math.max(4, weeksBetween(startMonday, raceDateStr));
  const phaseInfo = buildPhaseInfo(total, startMonday, raceDateStr);

  const weeks: WeekSummary[] = [];
  let cursor = startMonday;

  for (let wNum = 1; wNum <= total; wNum++) {
    const sessionsRaw = buildDynamicWeek(cursor, wNum, total, disciplines, race);
    const totalPlanned = sessionsRaw.reduce((s, sess) => s + sess.plannedDurationMin, 0) / 60;
    const phase = phaseForWeek(wNum, total);

    weeks.push({
      weekNumber: wNum,
      phase,
      dateStart: cursor,
      dateEnd: addDays(cursor, 6),
      sessions: sessionsRaw,
      totalPlannedHours: Math.round(totalPlanned * 10) / 10,
    });

    cursor = addDays(cursor, 7);
  }

  return { weeks, phases: phaseInfo, totalWeeks: total, raceDate: raceDateStr };
}
