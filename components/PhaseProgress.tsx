"use client";

import { useState } from "react";
import { PhaseInfo, Phase } from "@/types/schema";

export default function PhaseProgress({
  phases,
  currentPhase,
  currentDate,
}: {
  phases: PhaseInfo[];
  currentPhase: Phase;
  currentDate: string;
}) {
  const [showFocus, setShowFocus] = useState(false);

  return (
    <div className="px-5 py-4">
      <button onClick={() => setShowFocus((v) => !v)} className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
            {phases.find((p) => p.phase === currentPhase)?.name}
          </span>
          <span className="text-[11px]" style={{ color: "var(--mint)" }}>
            Fase {currentPhase} van {phases.length}
          </span>
        </div>

        <div className="flex gap-1.5">
          {phases.map((p) => {
            const isCurrent = p.phase === currentPhase;
            const isPast = p.phase < currentPhase;
            let fillPct = 0;
            if (isPast) fillPct = 100;
            if (isCurrent) {
              const start = new Date(p.dateStart).getTime();
              const end = new Date(p.dateEnd).getTime();
              const now = new Date(currentDate).getTime();
              fillPct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
            }
            return (
              <div key={p.phase} className="flex-1">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${fillPct}%`,
                      background: "linear-gradient(90deg, var(--volt), var(--mint))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </button>

      {showFocus && (
        <p className="text-[12.5px] leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>
          {phases.find((p) => p.phase === currentPhase)?.focus}
        </p>
      )}
    </div>
  );
}
