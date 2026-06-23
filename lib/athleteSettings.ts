"use client";

import { useEffect, useState } from "react";

export type Weekday = "ma" | "di" | "wo" | "do" | "vr" | "za" | "zo";
export type SportDiscipline = "swim" | "bike" | "run";
export type SportGoal = "triathlon" | "duathlon" | "run" | "bike" | "swim" | "all";

export const ALL_WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "ma", label: "Maandag" },
  { key: "di", label: "Dinsdag" },
  { key: "wo", label: "Woensdag" },
  { key: "do", label: "Donderdag" },
  { key: "vr", label: "Vrijdag" },
  { key: "za", label: "Zaterdag" },
  { key: "zo", label: "Zondag" },
];

export interface RaceGoal {
  name: string;          // "Ironman 70.3 Westfriesland"
  date: string;          // ISO "2027-06-13"
  targetTime: string;    // "4:30:00"
  disciplines: SportDiscipline[]; // ["swim","bike","run"]
  distances: {
    swim?: number;       // km
    bike?: number;       // km
    run?: number;        // km
  };
}

export interface AthleteSettings {
  // Onboarding completed?
  onboardingDone: boolean;

  // Sport profile
  sportGoal: SportGoal;
  disciplines: SportDiscipline[]; // which disciplines this athlete trains

  // Primary race
  race: RaceGoal | null;

  // Schedule constraints
  horecaDays: Weekday[];
  hockeyTrainingDays: Weekday[];
  hockeyMatchDay: Weekday;

  // Social
  groupCode: string;
}

export const DEFAULT_SETTINGS: AthleteSettings = {
  onboardingDone: false,
  sportGoal: "triathlon",
  disciplines: ["swim", "bike", "run"],
  race: null,
  horecaDays: ["ma", "wo", "za"],
  hockeyTrainingDays: ["di", "do"],
  hockeyMatchDay: "zo",
  groupCode: "",
};

// Goal presets
export const SPORT_GOAL_OPTIONS: {
  key: SportGoal;
  label: string;
  description: string;
  disciplines: SportDiscipline[];
  emoji: string;
}[] = [
  { key: "triathlon", label: "Triathlon", description: "Zwemmen + fietsen + lopen", disciplines: ["swim", "bike", "run"], emoji: "🏊🚴🏃" },
  { key: "duathlon", label: "Duathlon", description: "Fietsen + lopen", disciplines: ["bike", "run"], emoji: "🚴🏃" },
  { key: "run", label: "Hardlopen", description: "Alleen hardlopen", disciplines: ["run"], emoji: "🏃" },
  { key: "bike", label: "Fietsen", description: "Alleen fietsen", disciplines: ["bike"], emoji: "🚴" },
  { key: "swim", label: "Zwemmen", description: "Alleen zwemmen", disciplines: ["swim"], emoji: "🏊" },
  { key: "all", label: "Alles", description: "Meerdere sporten, flexibel", disciplines: ["swim", "bike", "run"], emoji: "⚡" },
];

const STORAGE_KEY = "ironman-trainer-settings-v2";

function loadSettings(): AthleteSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: AthleteSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

type Listener = (s: AthleteSettings) => void;
const listeners = new Set<Listener>();
let currentSettings: AthleteSettings | null = null;

function getCurrent(): AthleteSettings {
  if (currentSettings === null) currentSettings = loadSettings();
  return currentSettings;
}

function updateCurrent(next: AthleteSettings) {
  currentSettings = next;
  saveSettings(next);
  listeners.forEach((l) => l(next));
}

export function useAthleteSettings(): [AthleteSettings, (next: AthleteSettings) => void] {
  const [settings, setSettings] = useState<AthleteSettings>(() => getCurrent());

  useEffect(() => {
    const listener: Listener = (s) => setSettings(s);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return [settings, updateCurrent];
}

export function dateToWeekday(dateStr: string): Weekday {
  const map: Weekday[] = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  return map[new Date(dateStr).getDay()];
}

export function daysUntilDate(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
