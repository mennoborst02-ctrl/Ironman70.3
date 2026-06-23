"use client";

import { useActivityDetail } from "@/lib/useActivityDetail";
import { Session } from "@/types/schema";

export default function ActivityDetailPanel({ session }: { session: Session }) {
  const stravaId = session.actual?.stravaActivityId;
  const { loading, error, splits, heartRateZones, paceComparison, avgHeartRate, maxHeartRate, maxSpeedMs } =
    useActivityDetail(stravaId, session.id, session.discipline, session.targetPace);

  if (!stravaId) return null;

  if (loading) {
    return (
      <div className="mt-3 pt-3 text-[12px]" style={{ borderTop: "1px dashed var(--border)", color: "var(--text-muted)" }}>
        Details laden...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 pt-3 text-[12px]" style={{ borderTop: "1px dashed var(--border)", color: "var(--text-muted)" }}>
        {error}
      </div>
    );
  }

  const hasAnything = splits.length > 0 || heartRateZones || paceComparison || avgHeartRate || maxSpeedMs;
  if (!hasAnything) return null;

  return (
    <div className="mt-3 pt-3 flex flex-col gap-4" style={{ borderTop: "1px dashed var(--border)" }}>
      {paceComparison && <PaceComparisonRow comparison={paceComparison} />}
      {(avgHeartRate || maxHeartRate || maxSpeedMs) && (
        <HeartRateSpeedSummary
          avgHeartRate={avgHeartRate}
          maxHeartRate={maxHeartRate}
          maxSpeedMs={maxSpeedMs}
          discipline={session.discipline}
        />
      )}
      {splits.length > 0 && <SplitsTable splits={splits} />}
      {heartRateZones && <HeartRateZones zones={heartRateZones} />}
    </div>
  );
}

function HeartRateSpeedSummary({
  avgHeartRate,
  maxHeartRate,
  maxSpeedMs,
  discipline,
}: {
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  maxSpeedMs: number | null;
  discipline: Session["discipline"];
}) {
  const maxSpeedLabel = maxSpeedMs ? formatMaxSpeed(maxSpeedMs, discipline) : null;

  return (
    <div className="flex items-center gap-4">
      {avgHeartRate && <MiniStat label="Gem. hartslag" value={`${avgHeartRate} bpm`} />}
      {maxHeartRate && <MiniStat label="Max hartslag" value={`${maxHeartRate} bpm`} />}
      {maxSpeedLabel && <MiniStat label="Max snelheid" value={maxSpeedLabel} />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="font-mono-data text-[13px] mt-0.5" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function formatMaxSpeed(speedMs: number, discipline: Session["discipline"]): string {
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

function PaceComparisonRow({ comparison }: { comparison: { actualPace: string; targetPace: string; deltaPctFromTarget: number; verdict: string } }) {
  const color =
    comparison.verdict === "sneller" ? "var(--run)" : comparison.verdict === "langzamer" ? "var(--gym)" : "var(--text-primary)";
  const label = comparison.verdict === "sneller" ? "Sneller dan doel" : comparison.verdict === "langzamer" ? "Langzamer dan doel" : "Op schema";

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Tempo vs. doel ({comparison.targetPace})
        </div>
        <div className="font-mono-data text-[14px] mt-0.5" style={{ color }}>
          {comparison.actualPace}
        </div>
      </div>
      <span
        className="text-[11px] font-semibold px-2 py-1 rounded-full"
        style={{ color, background: `${color}1a` }}
      >
        {label} {comparison.deltaPctFromTarget > 0 ? "+" : ""}
        {comparison.deltaPctFromTarget}%
      </span>
    </div>
  );
}

function SplitsTable({ splits }: { splits: { distanceKm: number; avgPace: string; avgSpeedMs?: number; avgHeartRate?: number }[] }) {
  const speeds = splits.map((s) => s.avgSpeedMs ?? 0).filter((v) => v > 0);
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        Tempo-verdeling per km
      </div>
      <div className="flex flex-col gap-1">
        {splits.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono-data text-[11px] w-6" style={{ color: "var(--text-muted)" }}>
              {i + 1}
            </span>
            <div className="flex-1 h-5 rounded-md overflow-hidden flex items-center" style={{ background: "var(--surface-raised)" }}>
              <div
                className="h-full rounded-md"
                style={{
                  width: maxSpeed > 0 ? `${Math.max(8, ((s.avgSpeedMs ?? 0) / maxSpeed) * 100)}%` : "8%",
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
        ))}
      </div>
    </div>
  );
}

function HeartRateZones({ zones }: { zones: { zone: number; label: string; timeMin: number; pctOfTotal: number }[] }) {
  const zoneColors = ["#00e5a0", "#00d4ff", "#ffd60a", "#ff9500", "#ff3366"];

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        Hartslagzones
      </div>
      <div className="flex h-3 rounded-full overflow-hidden mb-2">
        {zones.map((z) => (
          <div
            key={z.zone}
            style={{ width: `${z.pctOfTotal}%`, background: zoneColors[z.zone - 1] ?? "var(--border)" }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {zones
          .filter((z) => z.pctOfTotal > 0)
          .map((z) => (
            <div key={z.zone} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: zoneColors[z.zone - 1] }} />
                <span style={{ color: "var(--text-primary)" }}>{z.label}</span>
              </div>
              <span className="font-mono-data" style={{ color: "var(--text-muted)" }}>
                {z.timeMin} min · {z.pctOfTotal}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
