"use client";

import { Session } from "@/types/schema";
import { disciplineConfig, dayLetter, dayNumber } from "@/lib/format";

export default function DayGlyph({
  session,
  isToday,
  onClick,
}: {
  session: Session;
  isToday?: boolean;
  onClick?: () => void;
}) {
  const isRest = session.discipline === "rest";
  const cfg = disciplineConfig[session.discipline];
  const isPast = session.status === "completed" || session.status === "missed" || session.status === "modified";
  const missed = session.status === "missed";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0"
      style={{ width: 44 }}
    >
      <span
        className="font-mono-data text-[10px] tracking-wider uppercase"
        style={{ color: isToday ? "var(--volt)" : "var(--text-muted)", fontWeight: isToday ? 700 : 500 }}
      >
        {dayLetter(session.date)}
      </span>

      <div
        className="relative flex items-center justify-center rounded-xl"
        style={{
          width: 40,
          height: 40,
          background: isRest
            ? "var(--surface)"
            : isPast && !missed
            ? cfg.color
            : isToday
            ? "linear-gradient(135deg, var(--volt), var(--mint))"
            : "var(--surface-raised)",
          border: isToday
            ? "2px solid var(--volt)"
            : missed
            ? "1.5px dashed var(--pink)"
            : isRest
            ? "1.5px solid var(--border)"
            : isPast
            ? "1.5px solid transparent"
            : `1.5px solid ${cfg.color}55`,
          opacity: missed ? 0.55 : 1,
          boxShadow: isToday ? "0 0 16px rgba(204,255,0,0.35)" : "none",
        }}
      >
        {isRest ? (
          // rest: hollow ring, deliberately quiet
          <div
            className="rounded-full"
            style={{ width: 12, height: 12, border: "2px solid var(--text-muted)" }}
          />
        ) : isPast || isToday ? (
          // completed or today: filled bolt — this is a training day, charged
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
              fill={isToday ? "var(--night)" : "var(--night)"}
              opacity={isToday ? 1 : 0.85}
            />
          </svg>
        ) : (
          // future training day: outline bolt
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke={cfg.color} strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <span className="font-mono-data text-[10px]" style={{ color: "var(--text-muted)" }}>
        {dayNumber(session.date)}
      </span>
    </button>
  );
}
