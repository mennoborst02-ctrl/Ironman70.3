"use client";

import { useState } from "react";
import { useAthleteSettings, SportDiscipline } from "@/lib/athleteSettings";

export default function RaceEditor({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useAthleteSettings();
  const race = settings.race;

  const [name, setName] = useState(race?.name ?? "");
  const [date, setDate] = useState(race?.date ?? "");
  const [targetTime, setTargetTime] = useState(race?.targetTime ?? "");
  const [swimKm, setSwimKm] = useState(String(race?.distances?.swim ?? ""));
  const [bikeKm, setBikeKm] = useState(String(race?.distances?.bike ?? ""));
  const [runKm, setRunKm] = useState(String(race?.distances?.run ?? ""));

  const disciplines = settings.disciplines as SportDiscipline[];

  function save() {
    const newRace = name && date
      ? {
          name,
          date,
          targetTime: targetTime || "—",
          disciplines,
          distances: {
            swim: swimKm ? parseFloat(swimKm) : undefined,
            bike: bikeKm ? parseFloat(bikeKm) : undefined,
            run: runKm ? parseFloat(runKm) : undefined,
          },
        }
      : null;

    setSettings({ ...settings, race: newRace });
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
              Wedstrijd
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 flex flex-col gap-3">
          <Field label="Wedstrijdnaam" placeholder="bijv. Ironman 70.3 Westfriesland" value={name} onChange={setName} />
          <Field label="Datum" type="date" value={date} onChange={setDate} />
          <Field label="Doeltijd" placeholder="bijv. 4:30:00" value={targetTime} onChange={setTargetTime} />

          {disciplines.includes("swim") && (
            <Field label="Zwemafstand (km)" placeholder="bijv. 1.9" value={swimKm} onChange={setSwimKm} type="number" />
          )}
          {disciplines.includes("bike") && (
            <Field label="Fietsafstand (km)" placeholder="bijv. 90" value={bikeKm} onChange={setBikeKm} type="number" />
          )}
          {disciplines.includes("run") && (
            <Field label="Loopafstand (km)" placeholder="bijv. 21.1" value={runKm} onChange={setRunKm} type="number" />
          )}

          {race && (
            <button
              onClick={() => { setSettings({ ...settings, race: null }); onClose(); }}
              className="text-[12px] text-center py-2"
              style={{ color: "var(--pink)" }}
            >
              Wedstrijd verwijderen
            </button>
          )}

          <button
            onClick={save}
            className="w-full py-3 rounded-full text-[13px] font-semibold mt-2"
            style={{ background: "linear-gradient(135deg, var(--volt), var(--mint))", color: "var(--night)" }}
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder = "", value, onChange, type = "text" }: {
  label: string; placeholder?: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wide font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-[14px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
      />
    </div>
  );
}
