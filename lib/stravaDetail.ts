import { ActivitySplit, HeartRateZoneBucket, PaceComparison, Discipline } from "@/types/schema";

// ---- Tempo / splits ----

interface RawSplit {
  distance: number; // meters
  elapsed_time: number; // sec
  average_speed: number; // m/s
  average_heartrate?: number;
}

export function formatPaceFromSpeed(speedMs: number, discipline: Discipline): string {
  if (speedMs <= 0) return "—";
  if (discipline === "bike") {
    const kmh = speedMs * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  }
  if (discipline === "swim") {
    // pace per 100m
    const secPer100m = 100 / speedMs;
    const min = Math.floor(secPer100m / 60);
    const sec = Math.round(secPer100m % 60);
    return `${min}:${sec.toString().padStart(2, "0")}/100m`;
  }
  // run: pace per km
  const secPerKm = 1000 / speedMs;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

export function parseSplits(rawSplits: RawSplit[] | null, discipline: Discipline): ActivitySplit[] {
  if (!rawSplits) return [];
  return rawSplits.map((s) => ({
    distanceKm: Math.round((s.distance / 1000) * 100) / 100,
    elapsedTimeSec: s.elapsed_time,
    avgSpeedMs: s.average_speed,
    avgPace: formatPaceFromSpeed(s.average_speed, discipline),
    avgHeartRate: s.average_heartrate ? Math.round(s.average_heartrate) : undefined,
  }));
}

// ---- Hartslagzones ----
// Strava levert tijd-per-bucket terug; wij labelen de buckets naar 5 trainingszones.
// Zonder ingestelde max hartslag van de gebruiker gebruiken we Strava's eigen bucket-grenzen.

const ZONE_LABELS = ["Z1 Herstel", "Z2 Duur", "Z3 Tempo", "Z4 Drempel", "Z5 Maximaal"];

interface RawZoneBucket {
  min: number;
  max: number;
  time: number; // seconden
}

interface RawZoneData {
  type: string; // "heartrate" | "power"
  distribution_buckets: RawZoneBucket[];
}

export function parseHeartRateZones(zonesData: RawZoneData[] | null): HeartRateZoneBucket[] | null {
  if (!zonesData) return null;
  const hrZone = zonesData.find((z) => z.type === "heartrate");
  if (!hrZone) return null;

  const totalTime = hrZone.distribution_buckets.reduce((sum, b) => sum + b.time, 0);
  if (totalTime === 0) return null;

  return hrZone.distribution_buckets.map((b, i) => ({
    zone: i + 1,
    label: ZONE_LABELS[i] ?? `Z${i + 1}`,
    minBpm: b.min,
    maxBpm: b.max === -1 ? null : b.max,
    timeMin: Math.round((b.time / 60) * 10) / 10,
    pctOfTotal: Math.round((b.time / totalTime) * 100),
  }));
}

// ---- Vergelijking met doeltempo ----

function paceToSecondsPerUnit(pace: string): number | null {
  // "4:28/km" -> 268, "2:00/100m" -> 120, "35 km/h" -> omgerekend naar sec/km
  const kmhMatch = pace.match(/^([\d.]+)\s*km\/h$/);
  if (kmhMatch) {
    const kmh = parseFloat(kmhMatch[1]);
    return kmh > 0 ? 3600 / kmh : null;
  }
  const timeMatch = pace.match(/^(\d+):(\d+)/);
  if (timeMatch) {
    return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
  }
  return null;
}

function actualPaceFromSpeed(avgSpeedMs: number, discipline: Discipline): { pace: string; secondsPerUnit: number } {
  const pace = formatPaceFromSpeed(avgSpeedMs, discipline);
  let secondsPerUnit: number;
  if (discipline === "bike") {
    secondsPerUnit = avgSpeedMs > 0 ? 3600 / (avgSpeedMs * 3.6) : 0;
  } else if (discipline === "swim") {
    secondsPerUnit = avgSpeedMs > 0 ? 100 / avgSpeedMs : 0;
  } else {
    secondsPerUnit = avgSpeedMs > 0 ? 1000 / avgSpeedMs : 0;
  }
  return { pace, secondsPerUnit };
}

export function comparePaceToTarget(
  sessionId: string,
  discipline: "swim" | "bike" | "run",
  targetPace: string,
  avgSpeedMs: number
): PaceComparison | null {
  const targetSeconds = paceToSecondsPerUnit(targetPace);
  if (targetSeconds === null || avgSpeedMs <= 0) return null;

  const { pace: actualPace, secondsPerUnit: actualSeconds } = actualPaceFromSpeed(avgSpeedMs, discipline);

  // Voor fietsen is hoger sneller (km/h), dus de delta-richting is omgekeerd t.o.v. tijd-gebaseerde tempo's.
  // We werken consistent in "seconden per eenheid" zodat hoger = langzamer voor alle disciplines.
  const deltaPct = Math.round(((actualSeconds - targetSeconds) / targetSeconds) * 100);

  let verdict: PaceComparison["verdict"] = "op_schema";
  if (deltaPct < -3) verdict = "sneller";
  else if (deltaPct > 3) verdict = "langzamer";

  return {
    sessionId,
    discipline,
    targetPace,
    actualPace,
    deltaPctFromTarget: deltaPct,
    verdict,
  };
}
