import { Discipline } from "@/types/schema";

export const disciplineConfig: Record<
  Discipline,
  { label: string; color: string; bgTint: string; emoji: string }
> = {
  swim: { label: "Zwemmen", color: "var(--swim)", bgTint: "rgba(74,181,216,0.12)", emoji: "🏊" },
  bike: { label: "Fietsen", color: "var(--bike)", bgTint: "rgba(255,140,66,0.12)", emoji: "🚴" },
  run: { label: "Hardlopen", color: "var(--run)", bgTint: "rgba(107,207,138,0.12)", emoji: "🏃" },
  brick: { label: "Brick", color: "var(--brick)", bgTint: "rgba(200,125,255,0.12)", emoji: "⚡" },
  hockey: { label: "Hockey", color: "var(--hockey)", bgTint: "rgba(255,209,102,0.12)", emoji: "🏑" },
  gym: { label: "Sportschool", color: "var(--gym)", bgTint: "rgba(255,93,143,0.12)", emoji: "🏋️" },
  rest: { label: "Rust", color: "var(--rest)", bgTint: "rgba(74,81,112,0.12)", emoji: "🌙" },
};

export function formatDuration(min: number): string {
  if (min === 0) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}u` : `${h}u${m}`;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

export function dayLetter(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { weekday: "short" }).slice(0, 2).toUpperCase();
}

export function dayNumber(dateStr: string): string {
  const d = new Date(dateStr);
  return String(d.getDate());
}
