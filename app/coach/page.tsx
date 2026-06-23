"use client";

import { useTrainingData } from "@/lib/useTrainingData";
import { useAthleteSettings } from "@/lib/athleteSettings";
import { InsightSeverity, CoachInsight } from "@/lib/coachAnalysis";

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

const SEVERITY_BORDER: Record<InsightSeverity, string> = {
  good: "rgba(0,229,160,0.25)",
  neutral: "rgba(132,132,143,0.2)",
  warning: "rgba(255,214,10,0.25)",
  critical: "rgba(255,51,102,0.25)",
};

const SEVERITY_ICON: Record<InsightSeverity, string> = {
  good: "✓",
  neutral: "·",
  warning: "▲",
  critical: "!",
};

const TREND_DATA = {
  improving: { emoji: "📈", label: "Progressie", color: "var(--run)" },
  steady: { emoji: "➡️", label: "Stabiel", color: "var(--text-muted)" },
  declining: { emoji: "📉", label: "Let op", color: "var(--pink)" },
};

export default function CoachPage() {
  const { coachAdvice, stravaConnected, loading } = useTrainingData();
  const [settings] = useAthleteSettings();

  if (!settings.race) {
    return (
      <main className="px-5 pt-6">
        <h1 className="font-display font-bold text-2xl" style={{ color: "var(--text-primary)" }}>
          Coach
        </h1>
        <div className="mt-8 text-center">
          <div className="text-4xl mb-4">🏁</div>
          <p className="text-[14px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Stel eerst een wedstrijd in
          </p>
          <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
            De coach vergelijkt je trainingen met je doel. Voeg een race toe om te beginnen.
          </p>
          <a
            href="/profiel"
            className="inline-block px-6 py-3 rounded-full text-[13px] font-semibold"
            style={{ background: "linear-gradient(135deg, var(--volt), var(--mint))", color: "var(--night)" }}
          >
            Wedstrijd instellen →
          </a>
        </div>
      </main>
    );
  }

  if (!stravaConnected) {
    return (
      <main className="px-5 pt-6">
        <h1 className="font-display font-bold text-2xl" style={{ color: "var(--text-primary)" }}>
          Coach
        </h1>
        <div className="mt-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-[14px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Koppel Strava voor je analyse
          </p>
          <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
            De coach heeft je trainingsdata nodig om te analyseren of je op schema ligt.
          </p>
          <a
            href="/strava"
            className="inline-block px-6 py-3 rounded-full text-[13px] font-semibold"
            style={{ background: "#FC5200", color: "#fff" }}
          >
            Verbind met Strava →
          </a>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="px-5 pt-6">
        <h1 className="font-display font-bold text-2xl" style={{ color: "var(--text-primary)" }}>Coach</h1>
        <p className="text-[13px] mt-4" style={{ color: "var(--text-muted)" }}>Analyse laden...</p>
      </main>
    );
  }

  if (!coachAdvice) {
    return (
      <main className="px-5 pt-6">
        <h1 className="font-display font-bold text-2xl" style={{ color: "var(--text-primary)" }}>Coach</h1>
        <p className="text-[13px] mt-4" style={{ color: "var(--text-muted)" }}>
          Nog niet genoeg trainingsdata — kom terug na een paar gesynchroniseerde Strava-activiteiten.
        </p>
      </main>
    );
  }

  const race = settings.race!;
  const trendData = TREND_DATA[coachAdvice.trend];
  const daysLeft = Math.ceil((new Date(race.date).getTime() - new Date().getTime()) / 86400000);

  return (
    <main className="px-5 pt-6 pb-6">
      <h1 className="font-display font-bold text-2xl" style={{ color: "var(--text-primary)" }}>
        Coach
      </h1>
      <p className="text-[13px] mt-1 mb-5" style={{ color: "var(--text-muted)" }}>
        {race.name} · {daysLeft} dagen te gaan
      </p>

      {/* Readiness + trend */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="Race-gereedheid"
          value={`${coachAdvice.raceReadiness}%`}
          sub={coachAdvice.raceReadinessLabel}
          color={coachAdvice.raceReadiness >= 70 ? "var(--run)" : coachAdvice.raceReadiness >= 45 ? "var(--hockey)" : "var(--pink)"}
        />
        <StatCard
          label="Trend"
          value={trendData.emoji}
          sub={trendData.label}
          color={trendData.color}
        />
        {coachAdvice.projectedFinish && (
          <StatCard
            label="Prognose eindtijd"
            value={coachAdvice.projectedFinish}
            sub={race.targetTime !== "—" ? `Doel: ${race.targetTime}` : ""}
            color="var(--text-primary)"
            mono
          />
        )}
        {race.targetTime && race.targetTime !== "—" && coachAdvice.projectedFinish && (
          <StatCard
            label="t.o.v. doeltijd"
            value={timeDelta(coachAdvice.projectedFinish, race.targetTime)}
            sub={isUnderTarget(coachAdvice.projectedFinish, race.targetTime) ? "voor doel ✓" : "na doel"}
            color={isUnderTarget(coachAdvice.projectedFinish, race.targetTime) ? "var(--run)" : "var(--hockey)"}
            mono
          />
        )}
      </div>

      {/* Week advice */}
      <div
        className="p-4 rounded-2xl mb-5"
        style={{ background: "rgba(204,255,0,0.06)", border: "1px solid rgba(204,255,0,0.2)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--volt)" }}>
            Advies voor deze week
          </span>
        </div>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {coachAdvice.weekAdvice}
        </p>
        <p className="text-[12px] mt-2" style={{ color: "var(--text-muted)" }}>
          {coachAdvice.trendReason}
        </p>
      </div>

      {/* All insights */}
      <h2 className="font-display font-semibold text-[15px] mb-3" style={{ color: "var(--text-primary)" }}>
        Signalen ({coachAdvice.insights.length})
      </h2>

      {coachAdvice.insights.length === 0 ? (
        <div className="p-4 rounded-2xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Alles ziet er goed uit — geen bijzondere signalen deze week.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {coachAdvice.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="mt-8 p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 className="font-display font-semibold text-[13px] mb-2" style={{ color: "var(--text-muted)" }}>
          Hoe werkt de analyse?
        </h3>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          De coach kijkt naar je laatste 28 dagen Strava-data en vergelijkt dat met je ingestelde doel en wedstrijddatum.
          Hij analyseert: of je genoeg volume traint, of je alle disciplines bijhoudt, of je tempo verbetert of daalt,
          en hoe consistent je traint. Op basis daarvan geeft hij een wekelijks focuspunt en een inschatting van je
          race-gereedheid. Geen externe AI — alles wordt lokaal berekend.
        </p>
      </div>
    </main>
  );
}

function InsightCard({ insight }: { insight: CoachInsight }) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{ background: SEVERITY_BG[insight.severity], border: `1px solid ${SEVERITY_BORDER[insight.severity]}` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="font-mono-data text-[13px] font-bold shrink-0 w-5 text-center"
          style={{ color: SEVERITY_COLORS[insight.severity] }}
        >
          {SEVERITY_ICON[insight.severity]}
        </span>
        <div>
          <p className="font-semibold text-[13px]" style={{ color: SEVERITY_COLORS[insight.severity] }}>
            {insight.title}
          </p>
          <p className="text-[12.5px] leading-relaxed mt-1" style={{ color: "var(--text-primary)" }}>
            {insight.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, mono }: {
  label: string; value: string; sub?: string; color: string; mono?: boolean;
}) {
  return (
    <div className="p-3.5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div
        className={`text-[22px] font-semibold leading-tight ${mono ? "font-mono-data" : "font-display"}`}
        style={{ color }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

function timeToSec(t: string): number {
  const parts = t.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return 0;
}

function secToTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function timeDelta(projected: string, target: string): string {
  const diff = Math.abs(timeToSec(projected) - timeToSec(target));
  return secToTime(diff);
}

function isUnderTarget(projected: string, target: string): boolean {
  return timeToSec(projected) < timeToSec(target);
}
