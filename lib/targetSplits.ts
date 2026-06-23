/**
 * Calculates estimated split times per discipline from a total target time.
 *
 * Strategy:
 * - For single-discipline athletes: all time goes to that discipline
 * - For triathlon/duathlon: estimate swim and bike times from typical paces
 *   at the given distance, then assign remaining time to run
 *
 * We use realistic "beginner-to-intermediate" reference paces as anchors:
 * - Swim: 2:10/100m (adjusts to distance — longer = slightly slower)
 * - Bike: 30 km/h base (adjusts up slightly for shorter distances)
 * - Transitions: 2:00 + 1:30 (T1 + T2) fixed
 * - Run: remainder of total target time
 */

import { RaceGoal } from "@/lib/athleteSettings";
import { SportDiscipline } from "@/lib/athleteSettings";

export interface TargetSplits {
  swimSec: number | null;      // seconds
  bikeSec: number | null;
  runSec: number | null;
  t1Sec: number;
  t2Sec: number;
  // Pace representations
  swimPaceSecPer100m: number | null;   // sec/100m
  bikeSpeedKmh: number | null;         // km/h
  runPaceSecPerKm: number | null;      // sec/km
}

function parseTargetTime(timeStr: string): number | null {
  if (!timeStr || timeStr === "—") return null;
  const parts = timeStr.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return null;
}

export function calculateTargetSplits(
  race: RaceGoal,
  disciplines: SportDiscipline[]
): TargetSplits {
  const totalSec = parseTargetTime(race.targetTime);
  const T1 = 150; // 2:30
  const T2 = 90;  // 1:30

  const swimKm = race.distances.swim ?? null;
  const bikeKm = race.distances.bike ?? null;
  const runKm = race.distances.run ?? null;

  // Single discipline — all time goes there
  if (disciplines.length === 1) {
    const d = disciplines[0];
    return {
      swimSec: d === "swim" && totalSec ? totalSec : null,
      bikeSec: d === "bike" && totalSec ? totalSec : null,
      runSec: d === "run" && totalSec ? totalSec : null,
      t1Sec: 0,
      t2Sec: 0,
      swimPaceSecPer100m: d === "swim" && totalSec && swimKm
        ? (totalSec / (swimKm * 10))
        : null,
      bikeSpeedKmh: d === "bike" && totalSec && bikeKm
        ? bikeKm / (totalSec / 3600)
        : null,
      runPaceSecPerKm: d === "run" && totalSec && runKm
        ? totalSec / runKm
        : null,
    };
  }

  // Multi-discipline: estimate swim and bike, assign rest to run
  let swimSec: number | null = null;
  let bikeSec: number | null = null;
  let runSec: number | null = null;

  // Swim estimate: use a typical pace scaled to distance
  if (disciplines.includes("swim") && swimKm) {
    // Reference: 2:05/100m for shorter swims, scaling slightly slower for longer
    const basePaceSecPer100m = 125 + (swimKm > 1 ? (swimKm - 1) * 5 : 0);
    swimSec = basePaceSecPer100m * (swimKm * 10);
  }

  // Bike estimate: use a typical speed
  if (disciplines.includes("bike") && bikeKm) {
    // Reference: 30 km/h for recreational, faster for shorter courses
    const baseSpeedKmh = bikeKm < 40 ? 32 : bikeKm < 80 ? 31 : 30;
    bikeSec = (bikeKm / baseSpeedKmh) * 3600;
  }

  // If we have a total target time, derive run time from remainder
  if (totalSec && runKm && disciplines.includes("run")) {
    const transitionSec = (swimSec !== null && bikeSec !== null) ? T1 + T2
      : (swimSec !== null || bikeSec !== null) ? T1
      : 0;
    const nonRunSec = (swimSec ?? 0) + (bikeSec ?? 0) + transitionSec;
    runSec = Math.max(totalSec - nonRunSec, runKm * 60 * 3); // minimum 3 min/km sanity check
  }

  // If no total time, just expose estimates
  if (!totalSec) {
    if (swimKm && disciplines.includes("swim")) swimSec = 125 * (swimKm * 10);
    if (bikeKm && disciplines.includes("bike")) bikeSec = (bikeKm / 30) * 3600;
    if (runKm && disciplines.includes("run")) runSec = runKm * 300; // 5:00/km default
  }

  return {
    swimSec,
    bikeSec,
    runSec,
    t1Sec: T1,
    t2Sec: T2,
    swimPaceSecPer100m: swimSec && swimKm ? swimSec / (swimKm * 10) : null,
    bikeSpeedKmh: bikeSec && bikeKm ? bikeKm / (bikeSec / 3600) : null,
    runPaceSecPerKm: runSec && runKm ? runSec / runKm : null,
  };
}

export function formatTargetPace(splits: TargetSplits, discipline: SportDiscipline): string | null {
  if (discipline === "swim" && splits.swimPaceSecPer100m) {
    const sec = splits.swimPaceSecPer100m;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}/100m`;
  }
  if (discipline === "bike" && splits.bikeSpeedKmh) {
    return `${splits.bikeSpeedKmh.toFixed(1)} km/h`;
  }
  if (discipline === "run" && splits.runPaceSecPerKm) {
    const sec = splits.runPaceSecPerKm;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}/km`;
  }
  return null;
}
