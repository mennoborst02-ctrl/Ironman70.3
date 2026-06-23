"use client";

import { useEffect, useState } from "react";
import { generateSchedule, GeneratedSchedule } from "@/lib/scheduleGenerator";
import { matchActivitiesToSessions, assessRecentLoad, RawStravaActivity, LoadAssessment } from "@/lib/stravaMatching";
import { applyAutomaticAdaptations } from "@/lib/adaptationEngine";
import { analyzePerformance, CoachAdvice } from "@/lib/coachAnalysis";
import { useAthleteSettings } from "@/lib/athleteSettings";
import { WeekSummary, PhaseInfo } from "@/types/schema";
import { RACE_DATE } from "@/lib/mockData";

export const TODAY = new Date().toISOString().slice(0, 10);

interface UseTrainingDataResult {
  weeks: WeekSummary[];
  phases: PhaseInfo[];
  loading: boolean;
  stravaConnected: boolean;
  athleteName: string | null;
  loadAssessment: LoadAssessment | null;
  coachAdvice: CoachAdvice | null;
  rawActivities: RawStravaActivity[];
  error: string | null;
}

interface RawFetchResult {
  stravaConnected: boolean;
  athleteName: string | null;
  loadAssessment: LoadAssessment | null;
  rawActivities: RawStravaActivity[];
  error: string | null;
}

let cachedFetch: RawFetchResult | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

async function fetchStravaData(): Promise<RawFetchResult> {
  try {
    const statusRes = await fetch("/api/strava/status");
    const status = await statusRes.json();

    if (!status.connected) {
      return { stravaConnected: false, athleteName: null, loadAssessment: null, rawActivities: [], error: null };
    }

    const actRes = await fetch("/api/strava/activities");
    const actData = await actRes.json();
    const activities: RawStravaActivity[] = Array.isArray(actData.activities) ? actData.activities : [];

    return {
      stravaConnected: true,
      athleteName: status.athleteName,
      loadAssessment: null, // filled below after matching
      rawActivities: activities,
      error: null,
    };
  } catch {
    return { stravaConnected: false, athleteName: null, loadAssessment: null, rawActivities: [], error: "Kon Strava-data niet ophalen." };
  }
}

export function useTrainingData(): UseTrainingDataResult {
  const [settings] = useAthleteSettings();

  // Generate schedule from settings (race + disciplines)
  const schedule: GeneratedSchedule = (() => {
    if (settings.race) {
      return generateSchedule(settings.race, settings.disciplines);
    }
    // Fallback: generate with default race goal if no race set yet
    return generateSchedule(
      { name: "Jouw race", date: RACE_DATE, targetTime: "—", disciplines: settings.disciplines, distances: {} },
      settings.disciplines
    );
  })();

  const [raw, setRaw] = useState<RawFetchResult>(() => {
    if (cachedFetch && Date.now() - cachedAt < CACHE_MS) return cachedFetch;
    return { stravaConnected: false, athleteName: null, loadAssessment: null, rawActivities: [], error: null };
  });
  const [loading, setLoading] = useState(() => !(cachedFetch && Date.now() - cachedAt < CACHE_MS));

  useEffect(() => {
    if (cachedFetch && Date.now() - cachedAt < CACHE_MS) return;

    let cancelled = false;
    fetchStravaData().then((result) => {
      if (cancelled) return;
      cachedFetch = result;
      cachedAt = Date.now();
      setRaw(result);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  // Match Strava activities onto schedule
  const matchedWeeks: WeekSummary[] = raw.rawActivities.length > 0
    ? (() => {
        const allSessions = schedule.weeks.flatMap((w) => w.sessions);
        const matched = matchActivitiesToSessions(allSessions, raw.rawActivities);
        return schedule.weeks.map((week) => {
          const sessions = week.sessions.map((s) => matched.find((m) => m.id === s.id) ?? s);
          const totalActual = sessions.reduce((sum, s) => sum + (s.actual?.durationMin ?? 0), 0) / 60;
          return { ...week, sessions, totalActualHours: Math.round(totalActual * 10) / 10 };
        });
      })()
    : schedule.weeks;

  // Compute load assessment
  const loadAssessment = raw.rawActivities.length > 0
    ? assessRecentLoad(raw.rawActivities, matchedWeeks.flatMap((w) => w.sessions))
    : null;

  // Apply automatic schedule adaptations
  const adaptedWeeks = applyAutomaticAdaptations(matchedWeeks, settings);

  // Coach analysis
  const daysLeft = settings.race
    ? Math.ceil((new Date(settings.race.date).getTime() - new Date().getTime()) / 86400000)
    : 365;

  const coachAdvice = settings.race && raw.rawActivities.length > 0
    ? analyzePerformance(raw.rawActivities, adaptedWeeks, settings.disciplines, settings.race, daysLeft)
    : null;

  return {
    weeks: adaptedWeeks,
    phases: schedule.phases,
    loading,
    stravaConnected: raw.stravaConnected,
    athleteName: raw.athleteName,
    loadAssessment,
    coachAdvice,
    rawActivities: raw.rawActivities,
    error: raw.error,
  };
}

export function invalidateTrainingDataCache() {
  cachedFetch = null;
  cachedAt = 0;
}

export function getWeekForDateFrom(weeks: WeekSummary[], date: string): WeekSummary | undefined {
  return weeks.find((w) => date >= w.dateStart && date <= w.dateEnd);
}
