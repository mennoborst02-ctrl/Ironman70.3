export type Discipline = "swim" | "bike" | "run" | "brick" | "hockey" | "gym" | "rest";
export type SwimType = "pool" | "openwater";
export type Phase = 1 | 2 | 3 | 4;

export interface PhaseInfo {
  phase: Phase;
  name: string;
  shortName: string;
  dateStart: string; // ISO date
  dateEnd: string;
  focus: string;
  weeklyHoursTarget: [number, number]; // min, max
}

export interface Session {
  id: string;
  date: string; // ISO date
  discipline: Discipline;
  swimType?: SwimType;
  title: string;
  description: string;
  plannedDurationMin: number;
  plannedDistanceKm?: number;
  targetPace?: string; // e.g. "4:25/km" or "35 km/h"
  isKeySession: boolean; // long ride, brick, race-pace etc.
  status: "upcoming" | "completed" | "missed" | "modified" | "rest";
  // Strava-linked actuals (filled once completed)
  actual?: {
    durationMin: number;
    distanceKm?: number;
    avgHeartRate?: number;
    avgPace?: string;
    stravaActivityId?: string;
    perceivedLoad?: "easy" | "moderate" | "hard" | "very_hard";
  };
  adaptationNote?: string; // why this session was changed, if modified
}

export interface WeekSummary {
  weekNumber: number;
  phase: Phase;
  dateStart: string;
  dateEnd: string;
  sessions: Session[];
  totalPlannedHours: number;
  totalActualHours?: number;
  recoveryScore?: number; // 0-100, derived from Strava data
}

export interface AthleteGoals {
  raceName: string;
  raceDate: string;
  raceLocation: string;
  targetTotalTime: string; // "4:30:00"
  splits: {
    swim: { distanceKm: number; targetTime: string; targetPace: string };
    t1: { targetTime: string };
    bike: { distanceKm: number; targetTime: string; targetSpeed: string };
    t2: { targetTime: string };
    run: { distanceKm: number; targetTime: string; targetPace: string };
  };
  ftpWatts?: number;
  currentBests: {
    swim1km: string;
    bike40km: string;
    run10km: string;
  };
}

export interface AdaptationRule {
  id: string;
  trigger: string;
  action: string;
  icon: string;
}

export interface StravaActivity {
  id: string;
  date: string;
  type: "Swim" | "Ride" | "Run";
  name: string;
  durationMin: number;
  distanceKm: number;
  avgHeartRate?: number;
  matchedSessionId?: string;
}

export interface ActivitySplit {
  distanceKm: number; // meestal 1.0 per split
  elapsedTimeSec: number;
  avgSpeedMs: number;
  avgPace: string; // "4:32/km"
  avgHeartRate?: number;
}

export interface HeartRateZoneBucket {
  zone: number; // 1-5
  label: string; // "Z1 Herstel", "Z2 Duur", etc.
  minBpm: number;
  maxBpm: number | null;
  timeMin: number;
  pctOfTotal: number;
}

export interface ActivityDetail {
  id: string;
  splits: ActivitySplit[];
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  maxSpeedMs: number | null;
  heartRateZones: HeartRateZoneBucket[] | null;
}

export interface PaceComparison {
  sessionId: string;
  discipline: "swim" | "bike" | "run";
  targetPace: string;
  actualPace: string;
  deltaPctFromTarget: number; // positief = langzamer dan doel
  verdict: "sneller" | "op_schema" | "langzamer";
}
