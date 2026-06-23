"use client";

import { useEffect, useState } from "react";
import { mockStravaActivities } from "@/lib/mockData";
import { formatDateShort, formatDuration } from "@/lib/format";
import { useTrainingData, invalidateTrainingDataCache } from "@/lib/useTrainingData";
import StravaActivityModal from "@/components/StravaActivityModal";

export default function StravaPage() {
  const { stravaConnected, athleteName, loadAssessment, rawActivities, loading, error: dataError } = useTrainingData();
  const [pageError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const stravaError = params.get("strava_error");
    return stravaError ? stravaErrorMessage(stravaError) : null;
  });
  const [selectedActivity, setSelectedActivity] = useState<{
    id: number;
    name: string;
    type: string;
    start_date: string;
    moving_time: number;
    distance: number;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stravaError = params.get("strava_error");
    if (stravaError) {
      window.history.replaceState({}, "", "/strava");
      invalidateTrainingDataCache();
    }
  }, []);

  async function handleDisconnect() {
    await fetch("/api/strava/disconnect", { method: "POST" });
    invalidateTrainingDataCache();
    window.location.reload();
  }

  const error = pageError || dataError;

  return (
    <main className="px-5 pt-6">
      <h1 className="font-display font-bold text-2xl" style={{ color: "var(--text-primary)" }}>
        Strava
      </h1>
      <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
        Koppel je activiteiten voor automatische schema-aanpassing
      </p>

      {error && (
        <div
          className="mt-4 p-3 rounded-xl text-[12.5px]"
          style={{ background: "rgba(255,51,102,0.1)", color: "#ff3366" }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
          Laden...
        </div>
      ) : !stravaConnected ? (
        <ConnectCard />
      ) : (
        <>
          <ConnectedCard athleteName={athleteName} onDisconnect={handleDisconnect} />
          {loadAssessment && <TrainingLoad assessment={loadAssessment} />}
          <ActivityList activities={rawActivities} onSelect={setSelectedActivity} />
        </>
      )}

      {selectedActivity && <StravaActivityModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />}
    </main>
  );
}

function stravaErrorMessage(code: string): string {
  switch (code) {
    case "access_denied":
      return "Je hebt de koppeling met Strava geannuleerd.";
    case "server_niet_geconfigureerd":
      return "STRAVA_CLIENT_ID of STRAVA_CLIENT_SECRET ontbreekt nog in Vercel.";
    case "token_uitwisseling_mislukt":
      return "Koppelen met Strava is mislukt. Probeer het opnieuw.";
    default:
      return "Er ging iets mis bij het koppelen met Strava.";
  }
}

function ConnectCard() {
  return (
    <div
      className="mt-6 p-6 rounded-2xl flex flex-col items-center text-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(252,82,0,0.12)" }}
      >
        <StravaLogo />
      </div>
      <h2 className="font-display font-semibold text-[16px]" style={{ color: "var(--text-primary)" }}>
        Nog niet gekoppeld
      </h2>
      <p className="text-[12.5px] leading-relaxed mt-2 mb-5" style={{ color: "var(--text-muted)" }}>
        Koppel Strava zodat het schema je rustpols, trainingsbelasting en gemiste sessies kan zien — en zich daarop aanpast.
      </p>
      <a
        href="/api/strava/connect"
        className="px-5 py-3 rounded-full text-[13px] font-semibold w-full text-center"
        style={{ background: "#FC5200", color: "#fff" }}
      >
        Verbind met Strava
      </a>
    </div>
  );
}

function ConnectedCard({ athleteName, onDisconnect }: { athleteName: string | null; onDisconnect: () => void }) {
  return (
    <div
      className="mt-6 p-4 rounded-2xl flex items-center justify-between"
      style={{ background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.3)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(252,82,0,0.15)" }}
        >
          <StravaLogo small />
        </div>
        <div>
          <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
            Gekoppeld
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {athleteName || "Strava-account"} · sync actief
          </p>
        </div>
      </div>
      <button onClick={onDisconnect} className="text-[11.5px] underline" style={{ color: "var(--text-muted)" }}>
        Loskoppelen
      </button>
    </div>
  );
}

function TrainingLoad({
  assessment,
}: {
  assessment: { recentLoadScore: number; consecutiveDaysTrained: number; missedLast7Days: number; recommendation: string };
}) {
  const loadColor = assessment.recentLoadScore > 75 ? "var(--gym)" : assessment.recentLoadScore > 45 ? "var(--hockey)" : "var(--run)";
  return (
    <div className="mt-5 grid grid-cols-3 gap-2.5">
      <LoadStat label="Belasting 7d" value={String(assessment.recentLoadScore)} unit="/100" color={loadColor} />
      <LoadStat label="Dagen op rij" value={String(assessment.consecutiveDaysTrained)} unit="dgn" color="var(--text-primary)" />
      <LoadStat
        label="Gemist 7d"
        value={String(assessment.missedLast7Days)}
        unit="sessies"
        color={assessment.missedLast7Days > 0 ? "var(--gym)" : "var(--run)"}
      />
    </div>
  );
}

function LoadStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="p-3.5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="font-mono-data text-[20px] font-semibold" style={{ color }}>
          {value}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

interface DisplayActivity {
  id: string;
  name: string;
  date: string;
  type: string;
  durationMin: number;
  distanceKm: number;
  raw?: { id: number; name: string; type: string; start_date: string; moving_time: number; distance: number };
}

function ActivityList({
  activities,
  onSelect,
}: {
  activities: { id: number; name: string; start_date: string; type: string; moving_time: number; distance: number }[];
  onSelect: (a: { id: number; name: string; type: string; start_date: string; moving_time: number; distance: number }) => void;
}) {
  const hasReal = activities && activities.length > 0;

  const display: DisplayActivity[] = hasReal
    ? activities.map((a) => ({
        id: String(a.id),
        name: a.name,
        date: a.start_date,
        type: a.type,
        durationMin: Math.round(a.moving_time / 60),
        distanceKm: Math.round((a.distance / 1000) * 10) / 10,
        raw: a,
      }))
    : mockStravaActivities.map((a) => ({
        id: a.id,
        name: a.name,
        date: a.date,
        type: a.type,
        durationMin: a.durationMin,
        distanceKm: a.distanceKm,
      }));

  return (
    <div className="mt-6 mb-4">
      <h2 className="font-display font-semibold text-[15px] mb-3" style={{ color: "var(--text-primary)" }}>
        Recente activiteiten
      </h2>

      {!hasReal && (
        <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
          Nog geen activiteiten gevonden op je Strava-account. Hieronder een voorbeeld van hoe het eruitziet:
        </p>
      )}

      <div className="flex flex-col gap-2">
        {display.map((a) => {
          const clickable = Boolean(a.raw);
          return (
            <div
              key={a.id}
              onClick={() => a.raw && onSelect(a.raw)}
              className="p-3.5 rounded-2xl flex items-center justify-between"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                cursor: clickable ? "pointer" : "default",
              }}
            >
              <div>
                <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                  {a.name}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {formatDateShort(a.date)} · {a.type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-mono-data text-[13px]" style={{ color: "var(--text-primary)" }}>
                    {formatDuration(a.durationMin)}
                  </p>
                  {a.distanceKm > 0 && (
                    <p className="font-mono-data text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {a.distanceKm} km
                    </p>
                  )}
                </div>
                {clickable && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StravaLogo({ small }: { small?: boolean }) {
  const s = small ? 18 : 26;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M10.5 2L4 14h4l2.5-4.5L13 14h4L10.5 2z" fill="#FC5200" />
      <path d="M13.5 14l-2 4-2-4h-3l5 8 5-8h-3z" fill="#FC5200" opacity="0.6" />
    </svg>
  );
}
