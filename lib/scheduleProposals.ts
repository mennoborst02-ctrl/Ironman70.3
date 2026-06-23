import { WeekSummary } from "@/types/schema";
import { LoadAssessment } from "@/lib/stravaMatching";

export interface ScheduleProposal {
  id: string;
  severity: "licht" | "zwaar";
  title: string;
  reasoning: string;
  action: string;
}

/**
 * Lichte aanpassingen (status "Aangepast"/"Gemist" op losse sessies, het
 * waarschuwingsbannertje op Vandaag) gebeuren al automatisch via
 * stravaMatching.ts. Deze functie genereert daarnaast voorstellen voor
 * zwaardere ingrepen — dingen die een hele week of fase raken — die altijd
 * eerst aan de gebruiker worden voorgelegd, nooit automatisch doorgevoerd.
 */
export function generateScheduleProposals(weeks: WeekSummary[], loadAssessment: LoadAssessment | null): ScheduleProposal[] {
  const proposals: ScheduleProposal[] = [];

  if (!loadAssessment) return proposals;

  // Zwaar: meerdere weken op rij met >2 gemiste kernsessies duidt op een
  // structureel probleem (blessure, drukte) dat een fase-herplanning vraagt,
  // niet een losse aanpassing.
  const recentWeeks = weeks.filter((w) => w.totalActualHours !== undefined).slice(-3);
  const weeksWithMissedKeySessions = recentWeeks.filter((w) =>
    w.sessions.some((s) => s.isKeySession && s.status === "missed")
  );

  if (weeksWithMissedKeySessions.length >= 2) {
    proposals.push({
      id: "structural-replan",
      severity: "zwaar",
      title: "Kernsessies missen structureel",
      reasoning: `In ${weeksWithMissedKeySessions.length} van de laatste 3 weken is minstens één kernsessie (lange rit, brick) gemist. Dit kan duiden op te veel volume naast hockey en werk, of een opkomende blessure.`,
      action: "Voorstel: volgende fase met 1-2 uur per week minder starten, en de zwaarste brick-sessie verplaatsen naar een dag zonder hockey ervoor.",
    });
  }

  if (loadAssessment.recommendation === "rust_inlassen") {
    proposals.push({
      id: "force-rest-week",
      severity: "zwaar",
      title: "Overweeg een hersteWeek in te lassen",
      reasoning: `${loadAssessment.consecutiveDaysTrained} dagen op rij getraind. Dit verhoogt blessurerisico en kan duiden op opbouwende vermoeidheid die niet in één rustdag oplost.`,
      action: "Voorstel: aankomende week volume met 40% verlagen, alle kwaliteitssessies vervangen door Zone 2.",
    });
  }

  return proposals;
}
