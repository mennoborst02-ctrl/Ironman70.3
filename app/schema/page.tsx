"use client";

import { useState } from "react";
import { adaptationRules } from "@/lib/mockData";
import { useTrainingData, TODAY } from "@/lib/useTrainingData";
import { generateScheduleProposals, ScheduleProposal } from "@/lib/scheduleProposals";
import SessionCard from "@/components/SessionCard";
import { formatDateShort } from "@/lib/format";
import { Phase } from "@/types/schema";

export default function SchemaPage() {
  const { weeks, phases, stravaConnected, loadAssessment } = useTrainingData();
  const currentWeek = weeks.find((w) => TODAY >= w.dateStart && TODAY <= w.dateEnd);
  const [activePhase, setActivePhase] = useState<Phase>(currentWeek?.phase ?? 1);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(currentWeek?.weekNumber ?? null);
  const [dismissedProposals, setDismissedProposals] = useState<Set<string>>(new Set());
  const [rulesOpen, setRulesOpen] = useState(false);

  const proposals = stravaConnected ? generateScheduleProposals(weeks, loadAssessment) : [];
  const visibleProposals = proposals.filter((p) => !dismissedProposals.has(p.id));

  const weeksInPhase = weeks.filter((w) => w.phase === activePhase);
  const phaseInfo = phases.find((p) => p.phase === activePhase)!;

  return (
    <main className="px-5 pt-6">
      <h1 className="font-display font-bold text-2xl" style={{ color: "var(--text-primary)" }}>
        Schema
      </h1>
      <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
        42 weken naar Westfriesland, 13 juni 2027
        {stravaConnected && <span style={{ color: "var(--run)" }}> · live gekoppeld aan Strava</span>}
      </p>

      {visibleProposals.length > 0 && (
        <div className="mt-5 flex flex-col gap-2.5">
          {visibleProposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} onDismiss={() => setDismissedProposals((s) => new Set(s).add(p.id))} />
          ))}
        </div>
      )}

      {/* Phase tabs */}
      <div className="flex gap-1.5 mt-5 overflow-x-auto pb-1">
        {phases.map((p) => (
          <button
            key={p.phase}
            onClick={() => setActivePhase(p.phase)}
            className="px-3.5 py-2 rounded-full text-[12.5px] font-medium whitespace-nowrap shrink-0"
            style={{
              background: activePhase === p.phase ? "linear-gradient(90deg, var(--volt), var(--mint))" : "var(--surface)",
              color: activePhase === p.phase ? "var(--night)" : "var(--text-muted)",
              border: `1px solid ${activePhase === p.phase ? "transparent" : "var(--border)"}`,
            }}
          >
            {p.shortName}
          </button>
        ))}
      </div>

      {/* Phase info card */}
      <div
        className="mt-4 p-4 rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-[15px]" style={{ color: "var(--text-primary)" }}>
            {phaseInfo.name}
          </h2>
          <span className="text-[11px] font-mono-data" style={{ color: "var(--text-muted)" }}>
            {phaseInfo.weeklyHoursTarget[0]}-{phaseInfo.weeklyHoursTarget[1]}u/week
          </span>
        </div>
        <p className="text-[12.5px] leading-relaxed mt-2" style={{ color: "var(--text-muted)" }}>
          {phaseInfo.focus}
        </p>
        <p className="text-[11px] mt-2 font-mono-data" style={{ color: "var(--mint)" }}>
          {formatDateShort(phaseInfo.dateStart)} → {formatDateShort(phaseInfo.dateEnd)}
        </p>
      </div>

      {/* Weeks in phase */}
      <div className="mt-5 flex flex-col gap-2.5">
        {weeksInPhase.map((week) => {
          const isExpanded = expandedWeek === week.weekNumber;
          const isCurrent = week.weekNumber === currentWeek?.weekNumber;
          return (
            <div key={week.weekNumber}>
              <button
                onClick={() => setExpandedWeek(isExpanded ? null : week.weekNumber)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{
                  background: isCurrent ? "rgba(255,140,66,0.08)" : "var(--surface)",
                  border: `1px solid ${isCurrent ? "var(--mint)" : "var(--border)"}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono-data text-[12px] font-semibold px-2 py-1 rounded-md"
                    style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
                  >
                    W{week.weekNumber}
                  </span>
                  <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                    {formatDateShort(week.dateStart)}
                  </span>
                  {isCurrent && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--mint)", color: "var(--night)" }}
                    >
                      Nu
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono-data" style={{ color: "var(--text-muted)" }}>
                    {week.totalPlannedHours}u
                  </span>
                  <Chevron open={isExpanded} />
                </div>
              </button>

              {isExpanded && (
                <div className="mt-2 flex flex-col gap-2 pl-1">
                  {week.sessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Adaptation rules */}
      <div className="mt-8 mb-4">
        <button
          onClick={() => setRulesOpen((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="font-display font-semibold text-[15px]" style={{ color: "var(--text-primary)" }}>
            Hoe het schema zich aanpast
          </h2>
          <Chevron open={rulesOpen} />
        </button>

        {rulesOpen && (
          <>
            <p className="text-[12px] mt-2 mb-3" style={{ color: "var(--text-muted)" }}>
              {stravaConnected
                ? "Werkdag- en wedstrijd-regels zijn altijd actief. Tempo/hartslag-regels gebruiken je Strava-data."
                : "Werkdag- en wedstrijd-regels zijn al actief. Koppel Strava voor de tempo- en hartslag-regels."}
            </p>
            <div className="flex flex-col gap-2">
              {adaptationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-xl"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <p className="text-[12.5px]" style={{ color: "var(--text-primary)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Als: </span>
                    {rule.trigger}
                  </p>
                  <p className="text-[12.5px] mt-1.5" style={{ color: "var(--mint)" }}>
                    → {rule.action}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </main>
  );
}

function ProposalCard({ proposal, onDismiss }: { proposal: ScheduleProposal; onDismiss: () => void }) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{ background: "rgba(255,51,102,0.06)", border: "1px solid rgba(255,51,102,0.3)" }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 14 }}>🔔</span>
        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ background: "#ff3366", color: "var(--night)" }}>
          Vraagt overleg
        </span>
      </div>
      <h3 className="font-display font-semibold text-[14px] mt-2" style={{ color: "var(--text-primary)" }}>
        {proposal.title}
      </h3>
      <p className="text-[12.5px] leading-relaxed mt-1.5" style={{ color: "var(--text-muted)" }}>
        {proposal.reasoning}
      </p>
      <p className="text-[12.5px] leading-relaxed mt-2" style={{ color: "#ff8fa8" }}>
        {proposal.action}
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onDismiss}
          className="flex-1 py-2 rounded-full text-[12px] font-semibold"
          style={{ background: "#ff3366", color: "var(--night)" }}
        >
          Doorvoeren
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-2 rounded-full text-[12px] font-medium"
          style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
        >
          Negeren
        </button>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
    >
      <path d="M6 9l6 6 6-6" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
