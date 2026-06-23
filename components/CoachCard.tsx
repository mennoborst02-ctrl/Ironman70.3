"use client";

import { CoachAdvice, InsightSeverity } from "@/lib/coachAnalysis";

const SEVERITY_COLORS: Record<InsightSeverity, string> = {
  good: "var(--run)",
  neutral: "var(--text-muted)",
  warning: "var(--hockey)",
  critical: "var(--pink)",
};

const SEVERITY_BG: Record<InsightSeverity, string> = {
  good: "rgba(0,229,160,0.08)",
  neutral: "rgba(132,132,143,0.08)",
  warning: "rgba(255,214,10,0.08)",
  critical: "rgba(255,51,102,0.08)",
};

const TREND_EMOJI: Record<CoachAdvice["trend"], string> = {
  improving: "📈",
  steady: "➡️",
  declining: "📉",
};

export default function CoachCard({ advice }: { advice: CoachAdvice }) {
  return (
    <div className="mx-5 mt-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>⚡</span>
          <span className="font-display font-semibold text-[14px]" style={{ color: "var(--volt)" }}>
            Coach
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {TREND_EMOJI[advice.trend]}
          </span>
          <ReadinessBar score={advice.raceReadiness} label={advice.raceReadinessLabel} />
        </div>
      </div>

      {/* Week advice */}
      <div className="px-4 py-3" style={{ background: "var(--night)", borderTop: "1px solid var(--border)" }}>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {advice.weekAdvice}
        </p>
      </div>

      {/* Top insight (most severe) */}
      {advice.insights.length > 0 && (
        <div
          className="px-4 py-3"
          style={{
            background: SEVERITY_BG[advice.insights[0].severity],
            borderTop: "1px solid var(--border)",
          }}
        >
          <div className="flex items-start gap-2">
            <span className="text-[13px] shrink-0 mt-0.5">
              {advice.insights[0].severity === "good" ? "✓" :
               advice.insights[0].severity === "critical" ? "!" : "→"}
            </span>
            <p className="text-[12.5px] leading-relaxed" style={{ color: SEVERITY_COLORS[advice.insights[0].severity] }}>
              {advice.insights[0].body}
            </p>
          </div>
        </div>
      )}

      {/* Projected finish + link to full coach */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--surface-raised)", borderTop: "1px solid var(--border)" }}
      >
        {advice.projectedFinish ? (
          <div>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Prognose eindtijd
            </span>
            <div className="font-mono-data text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {advice.projectedFinish}
            </div>
          </div>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {advice.insights.length} signalen
          </span>
        )}
        <a
          href="/coach"
          className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
          style={{ background: "var(--surface)", color: "var(--volt)", border: "1px solid var(--border)" }}
        >
          Volledig rapport →
        </a>
      </div>
    </div>
  );
}

function ReadinessBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "var(--run)" : score >= 45 ? "var(--hockey)" : "var(--pink)";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
