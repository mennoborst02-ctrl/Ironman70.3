"use client";

import { useEffect, useState } from "react";
import { parseSplits, parseHeartRateZones, comparePaceToTarget } from "@/lib/stravaDetail";
import { ActivitySplit, HeartRateZoneBucket, PaceComparison, Discipline } from "@/types/schema";

interface ActivityDetailResult {
  loading: boolean;
  error: string | null;
  splits: ActivitySplit[];
  heartRateZones: HeartRateZoneBucket[] | null;
  paceComparison: PaceComparison | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  maxSpeedMs: number | null;
}

const EMPTY: Omit<ActivityDetailResult, "loading"> = {
  error: null,
  splits: [],
  heartRateZones: null,
  paceComparison: null,
  avgHeartRate: null,
  maxHeartRate: null,
  maxSpeedMs: null,
};

const detailCache = new Map<string, ActivityDetailResult>();

export function useActivityDetail(
  stravaActivityId: string | undefined,
  sessionId: string,
  discipline: Discipline,
  targetPace: string | undefined
): ActivityDetailResult {
  const [result, setResult] = useState<ActivityDetailResult>(() => {
    if (stravaActivityId && detailCache.has(stravaActivityId)) {
      return detailCache.get(stravaActivityId)!;
    }
    return { loading: Boolean(stravaActivityId), ...EMPTY };
  });

  useEffect(() => {
    if (!stravaActivityId) {
      return;
    }

    const cacheKey = stravaActivityId;
    if (detailCache.has(cacheKey)) {
      // Al opgepakt via lazy init in useState hierboven.
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/strava/activity-detail?id=${stravaActivityId}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();

        const runOrSwimOrBike: Discipline = discipline === "brick" ? "run" : discipline;
        const splits = parseSplits(data.splits_metric, runOrSwimOrBike);
        const heartRateZones = parseHeartRateZones(data.zones);

        let paceComparison: PaceComparison | null = null;
        if (targetPace && data.average_speed && (discipline === "swim" || discipline === "bike" || discipline === "run")) {
          paceComparison = comparePaceToTarget(sessionId, discipline, targetPace, data.average_speed);
        }

        const next: ActivityDetailResult = {
          loading: false,
          error: null,
          splits,
          heartRateZones,
          paceComparison,
          avgHeartRate: data.average_heartrate ?? null,
          maxHeartRate: data.max_heartrate ?? null,
          maxSpeedMs: data.max_speed ?? null,
        };

        detailCache.set(cacheKey, next);
        if (!cancelled) setResult(next);
      } catch {
        const next: ActivityDetailResult = { ...EMPTY, loading: false, error: "Kon details niet ophalen" };
        if (!cancelled) setResult(next);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [stravaActivityId, sessionId, discipline, targetPace]);

  return result;
}
