/**
 * Coach analysis engine.
 *
 * Compares actual Strava performance against the generated schedule and
 * produces structured advice without any external AI API.
 *
 * Analysis dimensions:
 * 1. Volume adherence: are you doing enough total hours?
 * 2. Discipline balance: are you training all required disciplines?
 * 3. Pace/speed trend: are you getting faster or slower over time?
 * 4. Consistency: are you training regularly or in bursts?
 * 5. Intensity balance: too much hard, not enough easy (or vice versa)?
 * 6. Race readiness: projected finish vs target, based on current trends
 */

import { WeekSummary } from "@/types/schema";
import { RawStravaActivity } from "@/lib/stravaMatching";
import { SportDiscipline, RaceGoal } from "@/lib/athleteSettings";

export type InsightSeverity = "good" | "neutral" | "warning" | "critical";

export interface CoachInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  discipline?: SportDiscipline;
}

export interface CoachAdvice {
  weekAdvice: string;        // One-sentence focus for the coming week
  insights: CoachInsight[];  // Ordered by severity (critical first)
  raceReadiness: number;     // 0-100 score
  raceReadinessLabel: string;
  projectedFinish: string | null; // "4:28" or null if not enough data
  trend: "improving" | "steady" | "declining";
  trendReason: string;
}

// ---- Helpers ----


function avgPace(activities: RawStravaActivity[]): number | null {
  // Returns average seconds per km for run activities
  const runs = activities.filter((a) => a.type === "Run" && a.distance > 0);
  if (runs.length === 0) return null;
  return runs.reduce((s, a) => s + (a.moving_time / (a.distance / 1000)), 0) / runs.length;
}

function avgSpeed(activities: RawStravaActivity[]): number | null {
  // Returns average km/h for ride activities
  const rides = activities.filter((a) => (a.type === "Ride" || a.type === "VirtualRide") && a.distance > 0);
  if (rides.length === 0) return null;
  return rides.reduce((s, a) => s + (a.distance / 1000) / (a.moving_time / 3600), 0) / rides.length;
}

function avgSwimPace(activities: RawStravaActivity[]): number | null {
  // Returns seconds per 100m for swim activities
  const swims = activities.filter((a) => a.type === "Swim" && a.distance > 0);
  if (swims.length === 0) return null;
  return swims.reduce((s, a) => s + (a.moving_time / (a.distance / 100)), 0) / swims.length;
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function groupByWeek(activities: RawStravaActivity[]): Map<string, RawStravaActivity[]> {
  const map = new Map<string, RawStravaActivity[]>();
  for (const a of activities) {
    const ws = weekStart(a.start_date);
    if (!map.has(ws)) map.set(ws, []);
    map.get(ws)!.push(a);
  }
  return map;
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

function formatSwimPace(secPer100m: number): string {
  const min = Math.floor(secPer100m / 60);
  const sec = Math.round(secPer100m % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/100m`;
}

// ---- Main analysis ----

export function analyzePerformance(
  recentActivities: RawStravaActivity[],
  weeks: WeekSummary[],
  disciplines: SportDiscipline[],
  race: RaceGoal,
  daysUntilRace: number
): CoachAdvice {
  const insights: CoachInsight[] = [];

  // Use last 28 days of activities for trend analysis
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);
  const cutoffStr = cutoff.toISOString();
  const last4Weeks = recentActivities.filter((a) => a.start_date >= cutoffStr);

  // Group into weekly buckets for trend detection
  const byWeek = groupByWeek(last4Weeks);
  const weekKeys = Array.from(byWeek.keys()).sort();
  const recentWeeks = weekKeys.slice(-4).map((k) => byWeek.get(k)!);

  // ---- 1. Volume adherence ----
  const currentWeek = weeks.find((w) => {
    const t = new Date().toISOString().slice(0, 10);
    return t >= w.dateStart && t <= w.dateEnd;
  });

  if (currentWeek) {
    const plannedHours = currentWeek.totalPlannedHours;
    const thisWeekActs = byWeek.get(weekStart(new Date().toISOString().slice(0, 10))) ?? [];
    const doneHours = thisWeekActs.reduce((s, a) => s + a.moving_time / 3600, 0);
    const dayOfWeek = new Date().getDay(); // 0=sun, how far through the week
    const weekProgress = dayOfWeek === 0 ? 1 : dayOfWeek / 7;
    const expectedByNow = plannedHours * weekProgress;

    if (doneHours < expectedByNow * 0.5 && dayOfWeek >= 3) {
      insights.push({
        id: "volume-low",
        severity: "warning",
        title: "Volume achter op schema",
        body: `Je hebt deze week ${doneHours.toFixed(1)}u getraind, maar op dit punt in de week wordt ${expectedByNow.toFixed(1)}u verwacht. Probeer de komende dagen in te halen zonder te overbelasten.`,
      });
    } else if (doneHours > plannedHours * 1.3) {
      insights.push({
        id: "volume-high",
        severity: "warning",
        title: "Volume ligt hoog",
        body: `Je traint meer dan gepland (${doneHours.toFixed(1)}u vs ${plannedHours}u gepland). Meer is niet altijd beter — herstel is ook training.`,
      });
    } else if (doneHours >= expectedByNow * 0.8) {
      insights.push({
        id: "volume-good",
        severity: "good",
        title: "Volume op schema",
        body: `Je zit goed qua trainingsvolume deze week. Ga zo door.`,
      });
    }
  }

  // ---- 2. Discipline balance ----
  const last28Days = last4Weeks;

  for (const d of disciplines) {
    const typeMap: Record<SportDiscipline, string[]> = {
      swim: ["Swim"],
      bike: ["Ride", "VirtualRide"],
      run: ["Run"],
    };
    const types = typeMap[d];
    const acts = last28Days.filter((a) => types.includes(a.type));
    const expectedSessions = d === "swim" ? 6 : d === "bike" ? 4 : 8; // over 4 weeks

    if (acts.length === 0) {
      insights.push({
        id: `discipline-missing-${d}`,
        severity: daysUntilRace > 60 ? "warning" : "critical",
        title: `Geen ${d === "swim" ? "zwemsessies" : d === "bike" ? "fietstrainingen" : "hardlooptrainingen"} afgelopen 4 weken`,
        body: `Je hebt de afgelopen 4 weken niet ${d === "swim" ? "gezwommen" : d === "bike" ? "gefietst" : "hardgelopen"}. ${daysUntilRace < 60 ? "Met minder dan 60 dagen tot de race is dit risicovol." : "Probeer dit de komende week op te pakken."}`,
        discipline: d,
      });
    } else if (acts.length < expectedSessions * 0.5) {
      insights.push({
        id: `discipline-low-${d}`,
        severity: "warning",
        title: `Te weinig ${d === "swim" ? "zwemtrainingen" : d === "bike" ? "fietstrainingen" : "hardloopsessies"}`,
        body: `Slechts ${acts.length} ${d === "swim" ? "zwemsessies" : d === "bike" ? "fietstrainingen" : "hardloopsessies"} in 4 weken. Doel: minimaal ${Math.ceil(expectedSessions * 0.7)} voor goede opbouw.`,
        discipline: d,
      });
    }
  }

  // ---- 3. Pace/speed trends ----

  // Run pace trend
  if (disciplines.includes("run") && recentWeeks.length >= 2) {
    const paces = recentWeeks.map((w) => avgPace(w)).filter((p): p is number => p !== null);
    if (paces.length >= 2) {
      const first = paces.slice(0, Math.ceil(paces.length / 2));
      const last = paces.slice(Math.floor(paces.length / 2));
      const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
      const avgLast = last.reduce((a, b) => a + b, 0) / last.length;
      const improvePct = ((avgFirst - avgLast) / avgFirst) * 100;

      if (improvePct > 2) {
        insights.push({
          id: "run-improving",
          severity: "good",
          title: "Looptempo verbetert",
          body: `Je looptempo is de afgelopen weken ${improvePct.toFixed(1)}% sneller geworden. Huidige gem.: ${formatPace(avgLast)}.`,
          discipline: "run",
        });
      } else if (improvePct < -3) {
        insights.push({
          id: "run-slower",
          severity: "warning",
          title: "Looptempo daalt",
          body: `Je looptempo is ${Math.abs(improvePct).toFixed(1)}% langzamer geworden t.o.v. 2 weken geleden (${formatPace(avgFirst)} → ${formatPace(avgLast)}). Mogelijk vermoeidheid of te weinig herstel.`,
          discipline: "run",
        });
      }

      // Compare against race target
      if (race.distances.run && race.targetTime && race.targetTime !== "—") {
        const parts = race.targetTime.split(":").map(Number);
        const targetTotalSec = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
        const runFraction = race.distances.run / ((race.distances.swim ?? 0) + (race.distances.bike ?? 0) / 10 + race.distances.run);
        const targetRunSec = targetTotalSec * (disciplines.length === 1 ? 1 : runFraction);
        const targetPaceVal = targetRunSec / race.distances.run;
        const currentPace = avgLast;
        const gapPct = ((currentPace - targetPaceVal) / targetPaceVal) * 100;

        if (gapPct > 15) {
          insights.push({
            id: "run-pace-gap",
            severity: daysUntilRace < 90 ? "critical" : "warning",
            title: "Looptempo nog ver van doeltempo",
            body: `Huidig gem. tempo: ${formatPace(currentPace)}. Doeltempo: ${formatPace(targetPaceVal)}. Verschil: ${gapPct.toFixed(0)}%. ${daysUntilRace > 120 ? "Er is nog tijd om dit te overbruggen." : "Prioriteer temposessies de komende weken."}`,
            discipline: "run",
          });
        } else if (gapPct <= 5) {
          insights.push({
            id: "run-pace-ontarget",
            severity: "good",
            title: "Looptempo dicht bij doel",
            body: `Je huidig tempo (${formatPace(currentPace)}) is dicht bij het doeltempo (${formatPace(targetPaceVal)}). Goed bezig.`,
            discipline: "run",
          });
        }
      }
    }
  }

  // Bike speed trend
  if (disciplines.includes("bike") && recentWeeks.length >= 2) {
    const speeds = recentWeeks.map((w) => avgSpeed(w)).filter((s): s is number => s !== null);
    if (speeds.length >= 2) {
      const avgFirst = speeds.slice(0, Math.ceil(speeds.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(speeds.length / 2);
      const avgLast = speeds.slice(Math.floor(speeds.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(speeds.length / 2);
      const improvePct = ((avgLast - avgFirst) / avgFirst) * 100;

      if (improvePct > 2) {
        insights.push({
          id: "bike-improving",
          severity: "good",
          title: "Fietstempo verbetert",
          body: `Je gemiddeld fietstempo is de afgelopen weken ${improvePct.toFixed(1)}% hoger. Huidige gem.: ${formatSpeed(avgLast)}.`,
          discipline: "bike",
        });
      }
    }
  }

  // Swim pace trend
  if (disciplines.includes("swim") && recentWeeks.length >= 2) {
    const swimPaces = recentWeeks.map((w) => avgSwimPace(w)).filter((p): p is number => p !== null);
    if (swimPaces.length >= 2) {
      const first = swimPaces[0];
      const last = swimPaces[swimPaces.length - 1];
      const improvePct = ((first - last) / first) * 100;

      if (improvePct > 3) {
        insights.push({
          id: "swim-improving",
          severity: "good",
          title: "Zwemtempo verbetert",
          body: `Je zwemtempo is ${improvePct.toFixed(1)}% sneller. Huidig: ${formatSwimPace(last)}.`,
          discipline: "swim",
        });
      } else if (improvePct < -4) {
        insights.push({
          id: "swim-slower",
          severity: "neutral",
          title: "Zwemtempo iets langzamer",
          body: `Je zwemtempo is licht gedaald. Normaal bij vermoeidheid — check of je genoeg uitrust tussen zwemsessies.`,
          discipline: "swim",
        });
      }
    }
  }

  // ---- 4. Consistency ----
  if (recentWeeks.length >= 3) {
    const weeklyHours = recentWeeks.map((w) =>
      w.reduce((s, a) => s + a.moving_time / 3600, 0)
    );
    const avg = weeklyHours.reduce((a, b) => a + b, 0) / weeklyHours.length;
    const maxDeviation = Math.max(...weeklyHours.map((h) => Math.abs(h - avg)));
    const cv = avg > 0 ? maxDeviation / avg : 0;

    if (cv > 0.5 && avg > 3) {
      insights.push({
        id: "consistency",
        severity: "warning",
        title: "Trainingsvolume erg wisselend",
        body: `Jouw wekelijkse volume schommelt sterk (${weeklyHours.map((h) => h.toFixed(1)).join("u / ")}u). Consistentie is belangrijker dan af en toe een heel grote week. Probeer stabielere weken op te bouwen.`,
      });
    }
  }

  // ---- 5. Race readiness score ----
  let readiness = 50;

  // Volume adherence (up to +20)
  const totalRecentHours = last28Days.reduce((s, a) => s + a.moving_time / 3600, 0);
  const expectedMonthlyHours = (currentWeek?.totalPlannedHours ?? 8) * 4;
  const volumeRatio = totalRecentHours / Math.max(1, expectedMonthlyHours);
  readiness += Math.min(20, Math.round(volumeRatio * 20));

  // Discipline coverage (up to +15)
  const coveredDisciplines = disciplines.filter((d) => {
    const typeMap: Record<SportDiscipline, string[]> = {
      swim: ["Swim"], bike: ["Ride", "VirtualRide"], run: ["Run"],
    };
    return last28Days.some((a) => typeMap[d].includes(a.type));
  });
  readiness += Math.round((coveredDisciplines.length / disciplines.length) * 15);

  // Time to race (up to +15 — more time = more opportunity)
  if (daysUntilRace > 180) readiness += 15;
  else if (daysUntilRace > 90) readiness += 10;
  else if (daysUntilRace > 30) readiness += 5;

  // Critical insights penalty
  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  readiness -= criticalCount * 10;
  const warningCount = insights.filter((i) => i.severity === "warning").length;
  readiness -= warningCount * 4;

  readiness = Math.max(5, Math.min(98, readiness));

  // ---- 6. Trend ----
  let trend: CoachAdvice["trend"] = "steady";
  let trendReason = "Je trainingen zijn stabiel.";

  const goodInsights = insights.filter((i) => i.severity === "good").length;
  const badInsights = insights.filter((i) => i.severity === "warning" || i.severity === "critical").length;

  if (goodInsights > badInsights + 1) {
    trend = "improving";
    trendReason = "Meerdere disciplines tonen vooruitgang.";
  } else if (badInsights > goodInsights + 1) {
    trend = "declining";
    trendReason = "Let op: meerdere signalen wijzen op te hoge belasting of te weinig volume.";
  }

  // ---- 7. Week advice ----
  const missingDisciplines = disciplines.filter((d) =>
    insights.some((i) => i.id === `discipline-missing-${d}`)
  );
  const improvingDisciplines = disciplines.filter((d) =>
    insights.some((i) => i.id === `${d}-improving`)
  );

  let weekAdvice = "";
  if (missingDisciplines.length > 0) {
    const names: Record<SportDiscipline, string> = { swim: "zwemmen", bike: "fietsen", run: "hardlopen" };
    weekAdvice = `Focus deze week op ${missingDisciplines.map((d) => names[d]).join(" en ")} — dat is al te lang overgeslagen.`;
  } else if (insights.some((i) => i.id === "volume-low")) {
    weekAdvice = "Haal je geplande sessies deze week af — je loopt achter op schema.";
  } else if (insights.some((i) => i.id === "consistency")) {
    weekAdvice = "Zorg voor een rustigere, consistente week — stabiliteit is nu belangrijker dan volume.";
  } else if (improvingDisciplines.length > 0) {
    const names: Record<SportDiscipline, string> = { swim: "zwemmen", bike: "fietsen", run: "hardlopen" };
    weekAdvice = `Je ${improvingDisciplines.map((d) => names[d]).join(" en ")} gaan goed — bouw rustig verder op dit momentum.`;
  } else {
    weekAdvice = "Volg het schema, herstel goed en eet voldoende rond je trainingen.";
  }

  // ---- Projected finish ----
  let projectedFinish: string | null = null;
  if (disciplines.length === 1 && disciplines[0] === "run" && race.distances.run) {
    const runs = last28Days.filter((a) => a.type === "Run" && a.distance > 0);
    if (runs.length >= 3) {
      const currentPaceVal = runs.reduce((s, a) => s + a.moving_time / (a.distance / 1000), 0) / runs.length;
      const projSec = currentPaceVal * race.distances.run;
      const h = Math.floor(projSec / 3600);
      const m = Math.round((projSec % 3600) / 60);
      projectedFinish = `${h}:${m.toString().padStart(2, "0")}`;
    }
  } else if (disciplines.includes("bike") && race.distances.bike) {
    const rides = last28Days.filter((a) => (a.type === "Ride" || a.type === "VirtualRide") && a.distance > 0);
    if (rides.length >= 2) {
      const currentSpeedVal = rides.reduce((s, a) => s + (a.distance / 1000) / (a.moving_time / 3600), 0) / rides.length;
      const projBikeSec = (race.distances.bike / currentSpeedVal) * 3600;
      const swimSec = race.distances.swim ? (race.distances.swim / 100) * 120 : 0;
      const runSec = race.distances.run && last28Days.some((a) => a.type === "Run")
        ? (last28Days.filter((a) => a.type === "Run" && a.distance > 0)
            .reduce((s, a) => s + a.moving_time / (a.distance / 1000), 0) /
          last28Days.filter((a) => a.type === "Run" && a.distance > 0).length) *
          race.distances.run
        : 0;
      const totalSec = swimSec + projBikeSec + runSec + 240; // +4 min transitions
      if (totalSec > 0) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.round((totalSec % 3600) / 60);
        projectedFinish = `${h}:${m.toString().padStart(2, "0")}`;
      }
    }
  }

  // Sort insights: critical → warning → neutral → good
  const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, neutral: 2, good: 3 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const readinessLabel =
    readiness >= 80 ? "Race-klaar" :
    readiness >= 65 ? "Goed op weg" :
    readiness >= 50 ? "In opbouw" :
    readiness >= 35 ? "Nog veel te doen" :
    "Vroeg stadium";

  return { weekAdvice, insights, raceReadiness: readiness, raceReadinessLabel: readinessLabel, projectedFinish, trend, trendReason };
}
