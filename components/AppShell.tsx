"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAthleteSettings } from "@/lib/athleteSettings";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [settings] = useAthleteSettings();
  const [checked, setChecked] = useState(false);
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (!settings.onboardingDone && !isOnboarding) {
      router.replace("/onboarding");
    }
    // Use a microtask to avoid sync setState in effect
    Promise.resolve().then(() => setChecked(true));
  }, [settings.onboardingDone, isOnboarding, router]);

  if (!checked) {
    return <div style={{ background: "var(--night)", minHeight: "100vh" }} />;
  }

  if (isOnboarding) {
    return <div className="min-h-full max-w-md mx-auto w-full">{children}</div>;
  }

  return (
    <>
      <div className="flex-1 pb-28 max-w-md mx-auto w-full">{children}</div>
      <BottomNav />
    </>
  );
}
