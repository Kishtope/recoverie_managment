import type { ScorecardRow } from "@/lib/scorecard";

// A month's scorecards for the caller's scope (GET /api/scorecards).
export type ScorecardsResponse = {
  month: string; // "yyyy-MM"
  from: string;
  to: string;
  elapsedDays: number;
  days: number;
  collectedSource: "payments" | "agent";
  items: ScorecardRow[];
};
