"use client";

import { useLeaderboard } from "@/lib/useLeaderboard";
import { LeaderboardEntry } from "@/lib/supabaseClient";

const DISCIPLINE_COLORS = {
  swim: "var(--swim)",
  bike: "var(--bike)",
  run: "var(--run)",
  other: "var(--text-muted)",
};

const DISCIPLINE_EMOJI = { swim: "🏊", bike: "🚴", run: "🏃", other: "⚡" };

function totalHours(entry: LeaderboardEntry): number {
  if (!entry.stats) return 0;
  const s = entry.stats;
  return s.total_hours_swim + s.total_hours_bike + s.total_hours_run + s.total_hours_other;
}

function fmt(h: number): string {
  if (h === 0) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}u${mins}` : `${hours}u`;
}

export default function Leaderboard({ groupCode, currentAthleteId }: { groupCode: string; currentAthleteId?: number }) {
  const { loading, entries, weekStart, error, refetch } = useLeaderboard(groupCode);

  if (loading) {
    return (
      <div className="px-5 mt-6">
        <SectionHeader groupCode={groupCode} onRefresh={refetch} />
        <div className="text-[12px] mt-3" style={{ color: "var(--text-muted)" }}>Laden...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 mt-6">
        <SectionHeader groupCode={groupCode} onRefresh={refetch} />
        <div className="text-[12px] mt-3 px-3 py-2 rounded-xl" style={{ background: "rgba(255,51,102,0.1)", color: "var(--pink)" }}>
          {error}
        </div>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="px-5 mt-6">
        <SectionHeader groupCode={groupCode} onRefresh={refetch} />
        <p className="text-[12px] mt-3" style={{ color: "var(--text-muted)" }}>
          Nog niemand in groep <span style={{ color: "var(--volt)" }}>{groupCode}</span>. Deel de code met vrienden!
        </p>
      </div>
    );
  }

  const maxHours = Math.max(...entries.map(totalHours), 0.1);

  return (
    <div className="px-5 mt-6">
      <SectionHeader groupCode={groupCode} onRefresh={refetch} weekStart={weekStart} />

      <div className="flex flex-col gap-2.5 mt-3">
        {entries.map((entry, i) => {
          const isMe = entry.user.strava_athlete_id === currentAthleteId;
          const total = totalHours(entry);
          const pct = (total / maxHours) * 100;
          const s = entry.stats;

          return (
            <div
              key={entry.user.id}
              className="rounded-2xl p-3.5"
              style={{
                background: isMe ? "rgba(204,255,0,0.06)" : "var(--surface)",
                border: `1px solid ${isMe ? "var(--volt)" : "var(--border)"}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono-data text-[13px] font-semibold w-5 shrink-0" style={{ color: i === 0 ? "var(--volt)" : "var(--text-muted)" }}>
                  {i + 1}
                </span>

                {entry.user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.user.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-display font-bold text-[12px]"
                    style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
                    {entry.user.name.slice(0, 1)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold truncate" style={{ color: isMe ? "var(--volt)" : "var(--text-primary)" }}>
                      {entry.user.name}
                    </span>
                    {isMe && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--volt)", color: "var(--night)" }}>jij</span>}
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {entry.user.sport_goal}
                  </span>
                </div>

                <span className="font-mono-data text-[16px] font-semibold shrink-0" style={{ color: i === 0 ? "var(--volt)" : "var(--text-primary)" }}>
                  {fmt(total)}
                </span>
              </div>

              {/* Volume bar */}
              {total > 0 && (
                <div className="mt-2.5">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: isMe
                          ? "linear-gradient(90deg, var(--volt), var(--mint))"
                          : "var(--border-bright)",
                      }}
                    />
                  </div>

                  {/* Per-discipline breakdown */}
                  {s && (
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {(["swim", "bike", "run"] as const).map((d) => {
                        const h = s[`total_hours_${d}` as keyof typeof s] as number;
                        if (h <= 0) return null;
                        return (
                          <span key={d} className="font-mono-data text-[10px]" style={{ color: DISCIPLINE_COLORS[d] }}>
                            {DISCIPLINE_EMOJI[d]} {fmt(h)}
                          </span>
                        );
                      })}
                      {s.kudos_received > 0 && (
                        <span className="font-mono-data text-[10px]" style={{ color: "var(--text-muted)" }}>
                          👏 {s.kudos_received}
                        </span>
                      )}
                      {s.longest_activity_min > 0 && (
                        <span className="font-mono-data text-[10px]" style={{ color: "var(--text-muted)" }}>
                          🏆 {Math.round(s.longest_activity_min / 60 * 10) / 10}u longest
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!s && (
                <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  Nog geen trainingen deze week
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ groupCode, onRefresh, weekStart }: { groupCode: string; onRefresh: () => void; weekStart?: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
          Groep · <span style={{ color: "var(--volt)" }}>{groupCode}</span>
        </span>
        {weekStart && (
          <span className="text-[10px] ml-2 font-mono-data" style={{ color: "var(--text-muted)" }}>
            week van {new Date(weekStart).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
      <button onClick={onRefresh} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
        ↻ Ververs
      </button>
    </div>
  );
}
