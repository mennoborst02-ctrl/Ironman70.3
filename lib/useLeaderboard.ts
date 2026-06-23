"use client";

import { useEffect, useState } from "react";
import { LeaderboardEntry } from "@/lib/supabaseClient";

interface LeaderboardResult {
  loading: boolean;
  entries: LeaderboardEntry[];
  weekStart: string | null;
  error: string | null;
  refetch: () => void;
}

interface CachedResult {
  entries: LeaderboardEntry[];
  weekStart: string;
  code: string;
  at: number;
}

let cache: CachedResult | null = null;
const CACHE_MS = 5 * 60 * 1000;

function getFromCache(groupCode: string): CachedResult | null {
  if (cache && cache.code === groupCode && Date.now() - cache.at < CACHE_MS) {
    return cache;
  }
  return null;
}

interface State {
  loading: boolean;
  entries: LeaderboardEntry[];
  weekStart: string | null;
  error: string | null;
}

export function useLeaderboard(groupCode: string): LeaderboardResult {
  const [state, setState] = useState<State>(() => {
    if (!groupCode) return { loading: false, entries: [], weekStart: null, error: null };
    const cached = getFromCache(groupCode);
    if (cached) return { loading: false, entries: cached.entries, weekStart: cached.weekStart, error: null };
    return { loading: true, entries: [], weekStart: null, error: null };
  });

  const [tick, setTick] = useState(0);

  function refetch() {
    cache = null;
    setState({ loading: true, entries: [], weekStart: null, error: null });
    setTick((t) => t + 1);
  }

  useEffect(() => {
    if (!groupCode) return;

    const cached = getFromCache(groupCode);
    if (cached) return; // already loaded via lazy init

    let cancelled = false;

    fetch(`/api/group/leaderboard?code=${encodeURIComponent(groupCode)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setState((s) => ({ ...s, loading: false, error: data.error }));
        } else {
          cache = { entries: data.entries, weekStart: data.weekStart, code: groupCode, at: Date.now() };
          setState({ loading: false, entries: data.entries, weekStart: data.weekStart, error: null });
        }
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: "Kon leaderboard niet laden" }));
      });

    return () => {
      cancelled = true;
    };
  }, [groupCode, tick]);

  return {
    loading: state.loading,
    entries: state.entries,
    weekStart: state.weekStart,
    error: state.error,
    refetch,
  };
}
