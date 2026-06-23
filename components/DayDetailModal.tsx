"use client";

import { Session } from "@/types/schema";
import SessionCard from "@/components/SessionCard";
import { formatDateLong } from "@/lib/format";

export default function DayDetailModal({ session, onClose }: { session: Session; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(10,10,10,0.75)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl flex flex-col"
        style={{
          background: "var(--night)",
          border: "1px solid var(--border)",
          borderBottom: "none",
          maxHeight: "85vh",
          minHeight: "50vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned header: handle, date, close button — always reachable */}
        <div className="shrink-0 px-5 pt-3.5 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
              {formatDateLong(session.date)}
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8" style={{ WebkitOverflowScrolling: "touch" }}>
          <SessionCard session={session} expanded showActivityDetail />
        </div>
      </div>
    </div>
  );
}
