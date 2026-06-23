"use client";

import { useActivityDetail } from "@/lib/useActivityDetail";
import { formatDateLong, formatDuration, disciplineConfig } from "@/lib/format";
import { Discipline } from "@/types/schema";

interface StravaActivityLite {
  id: number;
  name: string;
  type: string;
  start_date: string;
  moving_time: number;
  distance: number;
}

const stravaTypeToDiscipline: Record<string, Discipline> = {
  Run: "run",
  Ride: "bike",
  VirtualRide: "bike",
  Swim: "swim",
};

export default function StravaActivityModal({ activity, onClose }: { activity: StravaActivityLite; onClose: () => void }) {
  const discipline = stravaTypeToDiscipline[activity.type] ?? "run";
  const cfg = disciplineConfig[discipline];
  const durationMin = Math.round(activity.moving_time / 60);
  const distanceKm = Math.round((activity.distance / 1000) * 10) / 10;

  const { loading, error, splits, heartRateZones, avgHeartRate, maxHeartRate, maxSpeedMs } = useActivityDetail(
    String(activity.id),
    `strava-${activity.id}`,
    discipline,
    undefined
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(10,10,10,0.75)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl flex flex-col"
        style={{
          background: "var(--night)",
          border: "1px solid var(--border)",
          borderBottom: "none",
          maxHeight: "85vh",
          minHeight: "50vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned header: handle, date, close button — always reachable */}
        <div className="shrink-0 px-5 pt-3.5 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono-data text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
              {formatDateLong(activity.start_date)}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--surface)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body: everything else, however long */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8" style={{ WebkitOverflowScrolling: "touch" }}>

        {/* Activity summary card, styled consistent with SessionCard */}
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: cfg.bgTint }}>
              <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-[15px] truncate" style={{ color: "var(--text-primary)" }}>
                {activity.name}
              </h3>
              <p className="text-[12px] mt-0.5" style={{ color: cfg.color }}>
                {cfg.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <Stat label="Duur" value={formatDuration(durationMin)} />
            {distanceKm > 0 && <Stat label="Afstand" value={`${distanceKm} km`} />}
          </div>

          {/* Detail content: pace/HR summary, splits, HR zones */}
          {loading && (
            <div className="mt-3 pt-3 text-[12px]" style={{ borderTop: "1px dashed var(--border)", color: "var(--text-muted)" }}>
              Details laden...
            </div>
          )}

          {error && (
            <div className="mt-3 pt-3 text-[12px]" style={{ borderTop: "1px dashed var(--border)", color: "var(--text-muted)" }}>
              {error}
            </div>
          )}

          {!loading && !error && (avgHeartRate || maxHeartRate || maxSpeedMs || splits.length > 0 || heartRateZones) && (
            <div className="mt-3 pt-3 flex flex-col gap-4" style={{ borderTop: "1px dashed var(--border)" }}>
              {(avgHeartRate || maxHeartRate || maxSpeedMs) && (
                <div className="flex items-center gap-4">
                  {avgHeartRate && <Stat label="Gem. hartslag" value={`${avgHeartRate} bpm`} mono />}
                  {maxHeartRate && <Stat label="Max hartslag" value={`${maxHeartRate} bpm`} mono />}
                  {maxSpeedMs && <Stat label="Max snelheid" value={formatMaxSpeed(maxSpeedMs, discipline)} mono />}
                </div>
              )}

              {splits.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                    Tempo-verdeling per km
                  </div>
                  <div className="flex flex-col gap-1">
                    {splits.map((s, i) => {
                      const speeds = splits.map((sp) => sp.avgSpeedMs).filter((v) => v > 0);
                      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="font-mono-data text-[11px] w-6" style={{ color: "var(--text-muted)" }}>
                            {i + 1}
                          </span>
                          <div className="flex-1 h-5 rounded-md overflow-hidden flex items-center" style={{ background: "var(--surface-raised)" }}>
                            <div
                              className="h-full rounded-md"
                              style={{
                                width: maxSpeed > 0 ? `${Math.max(8, (s.avgSpeedMs / maxSpeed) * 100)}%` : "8%",
                                background: "linear-gradient(90deg, var(--volt), var(--mint))",
                              }}
                            />
                          </div>
                          <span className="font-mono-data text-[11px] w-20 text-right" style={{ color: "var(--text-primary)" }}>
                            {s.avgPace}
                          </span>
                          {s.avgHeartRate && (
                            <span className="font-mono-data text-[10px] w-12 text-right" style={{ color: "var(--text-muted)" }}>
                              {s.avgHeartRate} bpm
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {heartRateZones && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                    Hartslagzones
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden mb-2">
                    {heartRateZones.map((z) => (
                      <div
                        key={z.zone}
                        style={{
                          width: `${z.pctOfTotal}%`,
                          background: ["#00e5a0", "#00d4ff", "#ffd60a", "#ff9500", "#ff3366"][z.zone - 1] ?? "var(--border)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    {heartRateZones
                      .filter((z) => z.pctOfTotal > 0)
                      .map((z) => (
                        <div key={z.zone} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: ["#00e5a0", "#00d4ff", "#ffd60a", "#ff9500", "#ff3366"][z.zone - 1] }}
                            />
                            <span style={{ color: "var(--text-primary)" }}>{z.label}</span>
                          </div>
                          <span className="font-mono-data" style={{ color: "var(--text-muted)" }}>
                            {z.timeMin} min · {z.pctOfTotal}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className={`text-[13px] font-medium ${mono ? "font-mono-data" : ""}`} style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function formatMaxSpeed(speedMs: number, discipline: Discipline): string {
  if (discipline === "bike") return `${(speedMs * 3.6).toFixed(1)} km/h`;
  if (discipline === "swim") {
    const secPer100m = speedMs > 0 ? 100 / speedMs : 0;
    const min = Math.floor(secPer100m / 60);
    const sec = Math.round(secPer100m % 60);
    return `${min}:${sec.toString().padStart(2, "0")}/100m`;
  }
  const secPerKm = speedMs > 0 ? 1000 / speedMs : 0;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}
