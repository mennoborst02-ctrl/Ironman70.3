"use client";

import { useState } from "react";
import SunriseHero from "@/components/SunriseHero";
import PhaseProgress from "@/components/PhaseProgress";
import DayGlyph from "@/components/DayGlyph";
import SessionCard from "@/components/SessionCard";
import DayDetailModal from "@/components/DayDetailModal";
import Leaderboard from "@/components/Leaderboard";
import CoachCard from "@/components/CoachCard";
import { useTrainingData, getWeekForDateFrom, TODAY } from "@/lib/useTrainingData";
import { useAthleteSettings } from "@/lib/athleteSettings";
import { formatDateLong } from "@/lib/format";
import { Session } from "@/types/schema";

export default function VandaagPage() {
  const { weeks, phases, loading, stravaConnected, loadAssessment, coachAdvice } = useTrainingData();
  const [settings] = useAthleteSettings();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const week = getWeekForDateFrom(weeks, TODAY);
  const today = week?.sessions.find((s) => s.date === TODAY);

  if (!today || !week) return null;

  return (
    <main>
      <SunriseHero />

      <PhaseProgress phases={phases} currentPhase={week.phase} currentDate={TODAY} />

      {stravaConnected && loadAssessment && loadAssessment.recommendation !== "normaal" && (
        <div className="px-5 -mt-1 mb-1">
          <div
            className="p-3.5 rounded-2xl flex items-start gap-2.5"
            style={{
              background: loadAssessment.recommendation === "rust_inlassen" ? "rgba(255,51,102,0.1)" : "rgba(255,214,10,0.1)",
              border: `1px solid ${loadAssessment.recommendation === "rust_inlassen" ? "rgba(255,51,102,0.3)" : "rgba(255,214,10,0.3)"}`,
            }}
          >
            <span style={{ fontSize: 16 }}>{loadAssessment.recommendation === "rust_inlassen" ? "🛑" : "⚡"}</span>
            <div>
              <p
                className="text-[12.5px] font-medium"
                style={{ color: loadAssessment.recommendation === "rust_inlassen" ? "#ff3366" : "#ffd60a" }}
              >
                {loadAssessment.recommendation === "rust_inlassen" ? "Tijd voor rust" : "Schema past zich aan"}
              </p>
              <p className="text-[12px] leading-relaxed mt-0.5" style={{ color: "var(--text-muted)" }}>
                {loadAssessment.recommendationReason}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mt-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
            Deze week - {week.totalPlannedHours}u gepland
            {stravaConnected && week.totalActualHours !== undefined && ` · ${week.totalActualHours}u gedaan`}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {week.sessions.map((s) => (
            <DayGlyph key={s.id} session={s} isToday={s.date === TODAY} onClick={() => setSelectedSession(s)} />
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
          Vandaag - {formatDateLong(TODAY)}
        </span>
        <div className="mt-3">
          <SessionCard session={today} expanded />
        </div>
      </div>

      <div className="px-5 mt-6">
        <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
          Komt eraan
        </span>
        <div className="mt-3 flex flex-col gap-2.5">
          {week.sessions
            .filter((s) => s.date > TODAY)
            .slice(0, 3)
            .map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
        </div>
      </div>

      {!stravaConnected && !loading && (
        <div className="px-5 mt-6 mb-2">
          <a
            href="/strava"
            className="block p-3.5 rounded-2xl text-center text-[12.5px] font-medium"
            style={{ background: "var(--surface)", border: "1px dashed var(--border)", color: "var(--text-muted)" }}
          >
            Koppel Strava om dit schema automatisch te laten meebewegen met je trainingen →
          </a>
        </div>
      )}

      {coachAdvice && <CoachCard advice={coachAdvice} />}

      {settings.groupCode ? (
        <Leaderboard groupCode={settings.groupCode} />
      ) : stravaConnected ? (
        <div className="px-5 mt-6 mb-2">
          <a
            href="/profiel"
            className="block p-3.5 rounded-2xl text-center text-[12.5px] font-medium"
            style={{ background: "var(--surface)", border: "1px dashed var(--border)", color: "var(--text-muted)" }}
          >
            Stel een groepscode in om te vergelijken met anderen →
          </a>
        </div>
      ) : null}

      {selectedSession && <DayDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </main>
  );
}
