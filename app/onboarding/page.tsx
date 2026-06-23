"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAthleteSettings, SPORT_GOAL_OPTIONS, SportGoal, SportDiscipline } from "@/lib/athleteSettings";

type Step = "strava" | "goal" | "race" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [settings, setSettings] = useAthleteSettings();
  const [step, setStep] = useState<Step>("strava");
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaChecked, setStravaChecked] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SportGoal>("triathlon");
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [targetTime, setTargetTime] = useState("");
  const [swimKm, setSwimKm] = useState("");
  const [bikeKm, setBikeKm] = useState("");
  const [runKm, setRunKm] = useState("");

  useEffect(() => {
    if (settings.onboardingDone) {
      router.replace("/");
    }
    // Check if Strava already connected
    fetch("/api/strava/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setStravaConnected(true);
          setStep("goal");
        }
        setStravaChecked(true);
      })
      .catch(() => setStravaChecked(true));
  }, [settings.onboardingDone, router]);

  const goalOption = SPORT_GOAL_OPTIONS.find((o) => o.key === selectedGoal)!;
  const disciplines = goalOption?.disciplines ?? ["run"];

  function completeOnboarding() {
    const race = raceName && raceDate
      ? {
          name: raceName,
          date: raceDate,
          targetTime: targetTime || "—",
          disciplines: disciplines as SportDiscipline[],
          distances: {
            swim: swimKm ? parseFloat(swimKm) : undefined,
            bike: bikeKm ? parseFloat(bikeKm) : undefined,
            run: runKm ? parseFloat(runKm) : undefined,
          },
        }
      : null;

    setSettings({
      ...settings,
      onboardingDone: true,
      sportGoal: selectedGoal,
      disciplines: disciplines as SportDiscipline[],
      race,
    });

    router.replace("/");
  }

  // Wacht tot de Strava-check klaar is zodat de juiste stap direct getoond wordt
  if (!stravaChecked) {
    return <div className="min-h-screen" style={{ background: "var(--night)" }} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--night)" }}>
      {/* Progress dots */}
      <div className="flex gap-2 justify-center pt-12 pb-8">
        {(["strava", "goal", "race"] as Step[]).map((s, i) => (
          <div
            key={s}
            className="rounded-full"
            style={{
              width: step === s ? 24 : 8,
              height: 8,
              background: step === s ? "var(--volt)" : stepIndex(step) > i ? "var(--mint)" : "var(--border)",
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>

      <div className="flex-1 px-6 overflow-y-auto pb-8">
        {step === "strava" && <StravaStep connected={stravaConnected} onConnected={() => { setStravaConnected(true); setStep("goal"); }} />}
        {step === "goal" && (
          <GoalStep
            selected={selectedGoal}
            onSelect={setSelectedGoal}
            onNext={() => setStep("race")}
          />
        )}
        {step === "race" && (
          <RaceStep
            disciplines={disciplines as SportDiscipline[]}
            raceName={raceName} setRaceName={setRaceName}
            raceDate={raceDate} setRaceDate={setRaceDate}
            targetTime={targetTime} setTargetTime={setTargetTime}
            swimKm={swimKm} setSwimKm={setSwimKm}
            bikeKm={bikeKm} setBikeKm={setBikeKm}
            runKm={runKm} setRunKm={setRunKm}
            onNext={completeOnboarding}
          />
        )}
      </div>
    </div>
  );
}

function stepIndex(step: Step): number {
  return ["strava", "goal", "race", "done"].indexOf(step);
}

// ---- Step components ----

function StravaStep({ connected, onConnected }: { connected: boolean; onConnected: () => void }) {
  useEffect(() => {
    if (connected) onConnected();
  }, [connected, onConnected]);

  return (
    <div className="flex flex-col items-center text-center max-w-sm mx-auto pt-4">
      <div className="text-6xl mb-6">⚡</div>
      <h1 className="font-display font-bold text-[28px] mb-3" style={{ color: "var(--text-primary)" }}>
        Welkom bij<br /><span style={{ color: "var(--volt)" }}>Sunrise</span>
      </h1>
      <p className="text-[14px] leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
        Koppel je Strava-account om je trainingen te synchroniseren en te vergelijken met vrienden.
      </p>
      <a
        href="/api/strava/connect"
        className="w-full py-4 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2"
        style={{ background: "#FC5200", color: "#fff" }}
      >
        <StravaIcon /> Verbinden met Strava
      </a>
      <p className="text-[11px] mt-4" style={{ color: "var(--text-muted)" }}>
        We lezen alleen je activiteiten — je wachtwoord zien we nooit.
      </p>
    </div>
  );
}

function GoalStep({ selected, onSelect, onNext }: { selected: SportGoal; onSelect: (g: SportGoal) => void; onNext: () => void }) {
  return (
    <div className="max-w-sm mx-auto pt-4">
      <h2 className="font-display font-bold text-[24px] mb-2" style={{ color: "var(--text-primary)" }}>
        Wat is jouw doel?
      </h2>
      <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
        Dit bepaalt welke iconen je ziet en hoe het schema is opgebouwd.
      </p>
      <div className="flex flex-col gap-2.5 mb-8">
        {SPORT_GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left"
            style={{
              background: selected === opt.key ? "rgba(204,255,0,0.08)" : "var(--surface)",
              border: `1.5px solid ${selected === opt.key ? "var(--volt)" : "var(--border)"}`,
            }}
          >
            <span style={{ fontSize: 24 }}>{opt.emoji}</span>
            <div className="flex-1">
              <div className="font-semibold text-[14px]" style={{ color: selected === opt.key ? "var(--volt)" : "var(--text-primary)" }}>
                {opt.label}
              </div>
              <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                {opt.description}
              </div>
            </div>
            {selected === opt.key && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="var(--volt)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        ))}
      </div>
      <button
        onClick={onNext}
        className="w-full py-4 rounded-full text-[14px] font-semibold"
        style={{ background: "linear-gradient(135deg, var(--volt), var(--mint))", color: "var(--night)" }}
      >
        Volgende →
      </button>
    </div>
  );
}

function RaceStep({
  disciplines, raceName, setRaceName, raceDate, setRaceDate,
  targetTime, setTargetTime, swimKm, setSwimKm, bikeKm, setBikeKm,
  runKm, setRunKm, onNext,
}: {
  disciplines: SportDiscipline[];
  raceName: string; setRaceName: (v: string) => void;
  raceDate: string; setRaceDate: (v: string) => void;
  targetTime: string; setTargetTime: (v: string) => void;
  swimKm: string; setSwimKm: (v: string) => void;
  bikeKm: string; setBikeKm: (v: string) => void;
  runKm: string; setRunKm: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="max-w-sm mx-auto pt-4">
      <h2 className="font-display font-bold text-[24px] mb-2" style={{ color: "var(--text-primary)" }}>
        Jouw wedstrijd
      </h2>
      <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
        Optioneel — je kunt dit ook later instellen via Profiel. De app telt af naar deze datum.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <Field label="Wedstrijdnaam" placeholder="bijv. Ironman 70.3 Westfriesland" value={raceName} onChange={setRaceName} />
        <Field label="Datum" type="date" value={raceDate} onChange={setRaceDate} />
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
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-full text-[14px] font-semibold mb-3"
        style={{ background: "linear-gradient(135deg, var(--volt), var(--mint))", color: "var(--night)" }}
      >
        {raceName && raceDate ? "Opslaan & starten →" : "Overslaan & starten →"}
      </button>
    </div>
  );
}

function Field({
  label, placeholder = "", value, onChange, type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
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
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
    </div>
  );
}

function StravaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M10.5 2L4 14h4l2.5-4.5L13 14h4L10.5 2z" fill="#fff" />
      <path d="M13.5 14l-2 4-2-4h-3l5 8 5-8h-3z" fill="#fff" opacity="0.7" />
    </svg>
  );
}
