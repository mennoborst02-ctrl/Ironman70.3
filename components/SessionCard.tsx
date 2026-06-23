"use client";

import { Session } from "@/types/schema";
import { disciplineConfig, formatDuration } from "@/lib/format";
import ActivityDetailPanel from "@/components/ActivityDetailPanel";

export default function SessionCard({
  session,
  expanded = false,
  showActivityDetail = false,
}: {
  session: Session;
  expanded?: boolean;
  showActivityDetail?: boolean;
}) {
  const cfg = disciplineConfig[session.discipline];
  const isRest = session.discipline === "rest";

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--surface)",
        border: `1px solid ${session.isKeySession ? cfg.color + "55" : "var(--border)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 40, height: 40, background: cfg.bgTint }}
          >
            <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-[15px] truncate" style={{ color: "var(--text-primary)" }}>
                {session.title}
              </h3>
              {session.isKeySession && (
                <span
                  className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: cfg.color, color: "var(--night)" }}
                >
                  Kern
                </span>
              )}
            </div>
            {!isRest && (
              <p className="text-[12px] mt-0.5" style={{ color: cfg.color }}>
                {cfg.label}
                {session.swimType === "openwater" && " · Openwater"}
              </p>
            )}
          </div>
        </div>

        <StatusBadge session={session} />
      </div>

      {expanded && (
        <p className="text-[13px] leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>
          {session.description}
        </p>
      )}

      {!isRest && (
        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <Stat label="Duur" value={formatDuration(session.plannedDurationMin)} />
          {session.plannedDistanceKm && <Stat label="Afstand" value={`${session.plannedDistanceKm} km`} />}
          {session.targetPace && <Stat label="Tempo" value={session.targetPace} />}
        </div>
      )}

      {session.actual && (
        <div
          className="flex items-center gap-4 mt-2 pt-2"
          style={{ borderTop: "1px dashed var(--border)" }}
        >
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Strava
          </span>
          <Stat label="Duur" value={formatDuration(session.actual.durationMin)} mono />
          {session.actual.distanceKm && <Stat label="Afstand" value={`${session.actual.distanceKm} km`} mono />}
          {session.actual.avgHeartRate && <Stat label="Hartslag" value={`${session.actual.avgHeartRate} bpm`} mono />}
        </div>
      )}

      {session.adaptationNote && (
        <div
          className="mt-3 px-3 py-2 rounded-lg text-[12px] leading-relaxed flex items-start gap-2"
          style={{ background: "rgba(255,214,10,0.1)", color: "#ffd60a" }}
        >
          <span>⚡</span>
          <span>{session.adaptationNote}</span>
        </div>
      )}

      {showActivityDetail && <ActivityDetailPanel session={session} />}
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className={`text-[13px] font-medium ${mono ? "font-mono-data" : ""}`}
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ session }: { session: Session }) {
  const map: Record<Session["status"], { label: string; color: string; bg: string } | null> = {
    completed: { label: "Gedaan", color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
    missed: { label: "Gemist", color: "#ff3366", bg: "rgba(255,51,102,0.12)" },
    modified: { label: "Aangepast", color: "#ffd60a", bg: "rgba(255,214,10,0.12)" },
    upcoming: null,
    rest: null,
  };
  const s = map[session.status];
  if (!s) return null;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}
