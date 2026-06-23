"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Vandaag", icon: SunIcon },
  { href: "/schema", label: "Schema", icon: CalendarIcon },
  { href: "/coach", label: "Coach", icon: CoachIcon },
  { href: "/strava", label: "Strava", icon: ActivityIcon },
  { href: "/profiel", label: "Profiel", icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around"
      style={{
        background: "rgba(13,19,32,0.92)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
      }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-4"
          >
            <Icon active={active} />
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ color: active ? "var(--volt)" : "var(--text-muted)" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function SunIcon({ active }: { active: boolean }) {
  const c = active ? "var(--volt)" : "var(--text-muted)";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? c : "none"}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const c = active ? "var(--volt)" : "var(--text-muted)";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={c} strokeWidth="1.8" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={c} strokeWidth="1.8" />
      <line x1="8" y1="2.5" x2="8" y2="6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="2.5" x2="16" y2="6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  const c = active ? "var(--volt)" : "var(--text-muted)";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12h4l2.5-7L13 19l2.5-7H21"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  const c = active ? "var(--volt)" : "var(--text-muted)";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.8" />
      <path d="M4.5 20c1.5-4 4.2-6 7.5-6s6 2 7.5 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CoachIcon({ active }: { active: boolean }) {
  const c = active ? "var(--volt)" : "var(--text-muted)";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" stroke={c} strokeWidth="1.8" />
      <path d="M12 8v4l3 3" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
