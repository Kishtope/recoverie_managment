import type { ReadinessSummary, StaffMatch } from "@/lib/cutover";

export type { ReadinessSummary, StaffMatch };

// One user in the readiness table; the mobile is masked on the server.
export type CutoverUser = {
  id: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "AGENCY_OWNER" | "AGENT";
  email: string | null;
  mobile: string | null;
  hubUserId: string | null;
  activeCases: number;
  lastLoginAt: string | null;
  ready: boolean;
  problems: string[];
};

export type CutoverResponse = { summary: ReadinessSummary; items: CutoverUser[]; total: number; page: number; pageSize: number };

export type CutoverQuery = { filter: string; page: number; pageSize: number };

// Result of checking an uploaded old staff list against the users in the app.
export type StaffCheckResponse = {
  summary: { total: number; matched: number; noAccount: number; disabled: number; ambiguous: number };
  items: StaffMatch[];
};
