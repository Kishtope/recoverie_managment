import { isWorkerRole } from "@/lib/constants";
import { maskMobile } from "@/lib/mask";

// ---- Is each user ready for go-live? ----

export type ReadinessUser = {
  role: "ADMIN" | "MANAGER" | "AGENCY_OWNER" | "AGENT" | "CALLER";
  email: string | null;
  mobile: string | null;
  lastLoginAt: Date | null;
};

// One yes / no per check; null = the check does not apply to this role.
export type ReadinessChecks = { mobile: boolean | null; email: boolean; signedIn: boolean };

export type Readiness = { checks: ReadinessChecks; problems: string[]; ready: boolean };

// What a user needs before go-live. Agents get called on their mobile; everyone signs in with an email, and allocation files match agents by it. Everybody must have signed in once (that is how we know the login really works for them).
export const userReadiness = (user: ReadinessUser): Readiness => {
  const agent = isWorkerRole(user.role);
  const checks: ReadinessChecks = {
    mobile: agent ? !!user.mobile : null,
    email: !!user.email,
    signedIn: user.lastLoginAt !== null,
  };
  const problems = [
    checks.mobile === false && "No mobile number",
    checks.email === false && "No email",
    !checks.signedIn && "Never signed in",
  ].filter((p): p is string => !!p);
  return { checks, problems, ready: problems.length === 0 };
};

export type ReadinessSummary = { total: number; ready: number; notReady: number; noMobile: number; noEmail: number; neverSignedIn: number };

// Counts for the strip above the table, from the same per-user results the table shows.
export const summarizeReadiness = (results: Readiness[]): ReadinessSummary => ({
  total: results.length,
  ready: results.filter((r) => r.ready).length,
  notReady: results.filter((r) => !r.ready).length,
  noMobile: results.filter((r) => r.checks.mobile === false).length,
  noEmail: results.filter((r) => r.checks.email === false).length,
  neverSignedIn: results.filter((r) => !r.checks.signedIn).length,
});

// ---- Does the old staff list match the new users? ----

export type StaffRow = { row: number; name: string; mobile: string; role: string };
export type StaffUser = { id: string; name: string; mobile: string | null; status: "ACTIVE" | "DISABLED" };

export type StaffMatch = {
  row: number;
  name: string;
  mobile: string | null; // masked, never the full number
  role: string;
  status: "matched" | "no-account" | "disabled" | "ambiguous";
  matchedBy: "mobile" | "name" | null;
  user: { id: string; name: string } | null;
};

// Last 10 digits, so "+91 98000 00001", "09800000001" and "9800000001" are the same number.
const digits = (mobile: string) => mobile.replace(/\D/g, "").slice(-10);

// Matches each old staff row to a new user: by mobile first (unique), else by name when exactly one user has that name.
// More than one user with the name is "ambiguous" (a person has to decide); a match that is DISABLED is reported as "disabled".
// Pure: nothing is written anywhere.
export const matchStaff = (rows: StaffRow[], users: StaffUser[]): StaffMatch[] => {
  const byMobile = new Map(users.filter((u) => u.mobile).map((u) => [digits(u.mobile as string), u]));
  const byName = Map.groupBy(users, (u) => u.name.trim().toLowerCase());

  return rows.map<StaffMatch>((r) => {
    const base = { row: r.row, name: r.name, mobile: r.mobile ? maskMobile(digits(r.mobile)) : null, role: r.role };
    const viaMobile = r.mobile ? byMobile.get(digits(r.mobile)) : undefined;
    if (viaMobile) return { ...base, status: viaMobile.status === "DISABLED" ? "disabled" : "matched", matchedBy: "mobile", user: { id: viaMobile.id, name: viaMobile.name } };

    const named = byName.get(r.name.trim().toLowerCase()) ?? [];
    if (named.length > 1) return { ...base, status: "ambiguous", matchedBy: null, user: null };
    if (named.length === 1) return { ...base, status: named[0].status === "DISABLED" ? "disabled" : "matched", matchedBy: "name", user: { id: named[0].id, name: named[0].name } };
    return { ...base, status: "no-account", matchedBy: null, user: null };
  });
};

// Normalises a header for matching ("Staff Name" -> "staffname").
const normalize = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES = {
  name: ["name", "staffname", "employeename", "fullname", "username"],
  mobile: ["mobile", "mobileno", "mobilenumber", "phone", "phoneno", "contact", "contactno"],
  role: ["role", "designation", "type"],
} as const;

// Reads the old staff sheet into rows; `missing` is set when there is no Name column (the only required one).
export const mapStaffSheet = (headers: string[], rows: { row: number; cells: string[] }[]): { rows: StaffRow[]; missing: boolean } => {
  const norm = headers.map(normalize);
  const col = (names: readonly string[]) => norm.findIndex((h) => names.includes(h));
  const [name, mobile, role] = [col(ALIASES.name), col(ALIASES.mobile), col(ALIASES.role)];
  if (name < 0) return { rows: [], missing: true };
  return {
    missing: false,
    rows: rows
      .map((r) => ({ row: r.row, name: (r.cells[name] ?? "").trim(), mobile: mobile >= 0 ? (r.cells[mobile] ?? "").trim() : "", role: role >= 0 ? (r.cells[role] ?? "").trim() : "" }))
      .filter((r) => r.name || r.mobile),
  };
};
