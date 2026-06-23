"use client";

import { useState } from "react";
import { ALL_WEEKDAYS, Weekday, AthleteSettings, useAthleteSettings } from "@/lib/athleteSettings";

export default function WorkDaysEditor({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useAthleteSettings();
  const [draft, setDraft] = useState<AthleteSettings>(settings);

  function toggleHorecaDay(day: Weekday) {
    setDraft((d) => ({
      ...d,
      horecaDays: d.horecaDays.includes(day) ? d.horecaDays.filter((x) => x !== day) : [...d.horecaDays, day],
    }));
  }

  function toggleHockeyTrainingDay(day: Weekday) {
    setDraft((d) => ({
      ...d,
      hockeyTrainingDays: d.hockeyTrainingDays.includes(day)
        ? d.hockeyTrainingDays.filter((x) => x !== day)
        : [...d.hockeyTrainingDays, day],
    }));
  }

  function save() {
    setSettings(draft);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(10,10,10,0.75)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl flex flex-col"
        style={{ background: "var(--night)", border: "1px solid var(--border)", borderBottom: "none", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-3.5 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-[16px]" style={{ color: "var(--text-primary)" }}>
              Werkdagen
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

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6" style={{ WebkitOverflowScrolling: "touch" }}>
          <p className="text-[12px] mb-2" style={{ color: "var(--text-muted)" }}>
            Horeca-diensten
          </p>
          <div className="flex gap-1.5 flex-wrap mb-6">
            {ALL_WEEKDAYS.map((d) => (
              <DayPill key={d.key} label={d.label.slice(0, 2)} active={draft.horecaDays.includes(d.key)} onClick={() => toggleHorecaDay(d.key)} color="var(--bike)" />
            ))}
          </div>

          <p className="text-[12px] mb-2" style={{ color: "var(--text-muted)" }}>
            Hockey training
          </p>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {ALL_WEEKDAYS.map((d) => (
              <DayPill
                key={d.key}
                label={d.label.slice(0, 2)}
                active={draft.hockeyTrainingDays.includes(d.key)}
                onClick={() => toggleHockeyTrainingDay(d.key)}
                color="var(--hockey)"
              />
            ))}
          </div>
          <p className="text-[11px] mb-6" style={{ color: "var(--text-muted)" }}>
            Hockeywedstrijd staat vast op zondag en wordt niet automatisch aangepast.
          </p>

          <button
            onClick={save}
            className="w-full py-3 rounded-full text-[13px] font-semibold"
            style={{ background: "linear-gradient(135deg, var(--volt), var(--mint))", color: "var(--night)" }}
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

function DayPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-2 rounded-full text-[12px] font-semibold uppercase"
      style={{
        background: active ? color : "var(--surface-raised)",
        color: active ? "var(--night)" : "var(--text-muted)",
        border: `1px solid ${active ? "transparent" : "var(--border)"}`,
      }}
    >
      {label}
    </button>
  );
}
