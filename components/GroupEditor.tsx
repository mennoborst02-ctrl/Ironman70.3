"use client";

import { useState } from "react";
import { useAthleteSettings } from "@/lib/athleteSettings";

export default function GroupEditor({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useAthleteSettings();
  const [code, setCode] = useState(settings.groupCode);
  const [goal, setGoal] = useState(settings.sportGoal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goals: { key: typeof goal; label: string; emoji: string }[] = [
    { key: "triathlon", label: "Triathlon (70.3)", emoji: "🏊🚴🏃" },
    { key: "run", label: "Hardlopen", emoji: "🏃" },
    { key: "bike", label: "Fietsen", emoji: "🚴" },
    { key: "all", label: "Alles", emoji: "⚡" },
  ];

  async function save() {
    if (!code.trim()) {
      setError("Vul een groepscode in");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/group/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupCode: code.trim(), sportGoal: goal }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
        return;
      }

      // Also trigger a sync for the group so the leaderboard is immediately populated
      fetch("/api/group/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupCode: code.trim() }),
      }).catch(() => {});

      setSettings({ ...settings, groupCode: code.trim().toUpperCase(), sportGoal: goal });
      onClose();
    } catch {
      setError("Netwerkfout — probeer opnieuw");
    } finally {
      setSaving(false);
    }
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
              Groep & doel
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--surface)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8">
          <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
            Deel de groepscode met vrienden zodat jullie elkaars wekelijkse trainingsdata kunnen vergelijken. Iedereen die dezelfde code invult, verschijnt op het leaderboard.
          </p>

          <label className="text-[11px] uppercase tracking-wide font-semibold mb-2 block" style={{ color: "var(--text-muted)" }}>
            Groepscode
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Bijv. VOLT2027"
            maxLength={12}
            className="w-full px-4 py-3 rounded-xl text-[15px] font-mono-data font-semibold uppercase tracking-widest mb-5"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--volt)",
              outline: "none",
            }}
          />

          <label className="text-[11px] uppercase tracking-wide font-semibold mb-2 block" style={{ color: "var(--text-muted)" }}>
            Mijn sport-doel
          </label>
          <div className="flex flex-col gap-2 mb-6">
            {goals.map((g) => (
              <button
                key={g.key}
                onClick={() => setGoal(g.key)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                style={{
                  background: goal === g.key ? "rgba(204,255,0,0.1)" : "var(--surface)",
                  border: `1px solid ${goal === g.key ? "var(--volt)" : "var(--border)"}`,
                }}
              >
                <span style={{ fontSize: 18 }}>{g.emoji}</span>
                <span className="text-[14px] font-medium" style={{ color: goal === g.key ? "var(--volt)" : "var(--text-primary)" }}>
                  {g.label}
                </span>
                {goal === g.key && (
                  <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L19 7" stroke="var(--volt)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-[12px] mb-4 px-3 py-2 rounded-lg" style={{ background: "rgba(255,51,102,0.1)", color: "var(--pink)" }}>
              {error}
            </p>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 rounded-full text-[13px] font-semibold"
            style={{
              background: saving ? "var(--surface)" : "linear-gradient(135deg, var(--volt), var(--mint))",
              color: saving ? "var(--text-muted)" : "var(--night)",
            }}
          >
            {saving ? "Opslaan..." : "Opslaan & sync starten"}
          </button>
        </div>
      </div>
    </div>
  );
}
