"use client";

import { useState } from "react";
import { useTrainingData } from "@/lib/useTrainingData";
import { useAthleteSettings, ALL_WEEKDAYS, SPORT_GOAL_OPTIONS } from "@/lib/athleteSettings";
import WorkDaysEditor from "@/components/WorkDaysEditor";
import GroupEditor from "@/components/GroupEditor";
import RaceEditor from "@/components/RaceEditor";

export default function ProfielPage() {
  const { stravaConnected, athleteName } = useTrainingData();
  const [settings] = useAthleteSettings();
  const [editorOpen, setEditorOpen] = useState(false);
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [raceEditorOpen, setRaceEditorOpen] = useState(false);

  const horecaLabel =
    settings.horecaDays.length > 0
      ? settings.horecaDays.map((d) => ALL_WEEKDAYS.find((w) => w.key === d)?.label.slice(0, 2)).join(", ")
      : "Geen ingesteld";

  const hockeyLabel =
    settings.hockeyTrainingDays.length > 0
      ? `${settings.hockeyTrainingDays.map((d) => ALL_WEEKDAYS.find((w) => w.key === d)?.label.slice(0, 2)).join(", ")} training · Zo wedstrijd`
      : "Zo wedstrijd";

  const goalOption = SPORT_GOAL_OPTIONS.find((o) => o.key === settings.sportGoal);
  const race = settings.race;

  return (
    <main className="px-5 pt-6">
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-display font-bold text-lg"
          style={{ background: "linear-gradient(135deg, var(--volt), var(--mint))", color: "var(--night)" }}
        >
          {athleteName ? athleteName.slice(0, 2).toUpperCase() : "MB"}
        </div>
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>
            {athleteName || "Jouw profiel"}
          </h1>
          <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>
            {goalOption?.label ?? "Triathlon"} · {goalOption?.emoji ?? "⚡"}
          </p>
        </div>
      </div>

      {/* Race card */}
      <div className="mt-6">
        <button
          onClick={() => setRaceEditorOpen(true)}
          className="w-full p-5 rounded-2xl text-left"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
              Wedstrijd
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Bewerken →</span>
          </div>
          {race ? (
            <>
              <p className="font-display font-semibold text-[16px]" style={{ color: "var(--text-primary)" }}>
                {race.name}
              </p>
              <p className="font-mono-data text-[13px] mt-1" style={{ color: "var(--volt)" }}>
                {new Date(race.date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div className="flex gap-4 mt-3">
                {race.targetTime && race.targetTime !== "—" && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Doeltijd</div>
                    <div className="font-mono-data text-[14px]" style={{ color: "var(--text-primary)" }}>{race.targetTime}</div>
                  </div>
                )}
                {race.distances.swim && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--swim)" }}>Zwem</div>
                    <div className="font-mono-data text-[14px]" style={{ color: "var(--text-primary)" }}>{race.distances.swim} km</div>
                  </div>
                )}
                {race.distances.bike && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--bike)" }}>Fiets</div>
                    <div className="font-mono-data text-[14px]" style={{ color: "var(--text-primary)" }}>{race.distances.bike} km</div>
                  </div>
                )}
                {race.distances.run && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--run)" }}>Loop</div>
                    <div className="font-mono-data text-[14px]" style={{ color: "var(--text-primary)" }}>{race.distances.run} km</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-[14px] mt-1" style={{ color: "var(--text-muted)" }}>
              Geen wedstrijd ingesteld — tik om toe te voegen
            </p>
          )}
        </button>
      </div>

      {/* Settings */}
      <div className="mt-5 mb-4">
        <h2 className="font-display font-semibold text-[15px] mb-3" style={{ color: "var(--text-primary)" }}>
          Instellingen
        </h2>
        <div className="flex flex-col rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <SettingRow label="Sport-doel" value={`${goalOption?.emoji} ${goalOption?.label}`} onClick={() => setRaceEditorOpen(true)} />
          <SettingRow label="Hockey-dagen" value={hockeyLabel} onClick={() => setEditorOpen(true)} />
          <SettingRow label="Horeca-diensten" value={horecaLabel} onClick={() => setEditorOpen(true)} />
          <SettingRow label="Groep & vergelijken" value={settings.groupCode || "Niet ingesteld"} muted={!settings.groupCode} onClick={() => setGroupEditorOpen(true)} />
          <SettingRow
            label="Strava-koppeling"
            value={stravaConnected ? `Verbonden${athleteName ? ` · ${athleteName}` : ""}` : "Niet verbonden"}
            muted={!stravaConnected}
            last
          />
        </div>
      </div>

      {editorOpen && <WorkDaysEditor onClose={() => setEditorOpen(false)} />}
      {groupEditorOpen && <GroupEditor onClose={() => setGroupEditorOpen(false)} />}
      {raceEditorOpen && <RaceEditor onClose={() => setRaceEditorOpen(false)} />}
    </main>
  );
}

function SettingRow({
  label, value, muted, last, onClick,
}: {
  label: string; value: string; muted?: boolean; last?: boolean; onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5"
      style={{ background: "var(--surface)", borderBottom: last ? "none" : "1px solid var(--border)" }}
    >
      <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>{label}</span>
      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: muted ? "var(--text-muted)" : "var(--mint)" }}>
        {value}
        {onClick && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </Tag>
  );
}
