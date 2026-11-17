import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { todayIst } from "@/lib/dates";
import { BRANCHES, COMPANIES } from "@/lib/constants";
import { DPD_BUCKETS } from "@/lib/dpd-bucket";
import { fyMonths, getFy, recentFys } from "@/lib/fy";
import type { TeamFilters } from "../types";

// The financial year everyone starts on; never written to the URL.
const CURRENT_FY = getFy(todayIst());

// Team dashboard / Recovery filters kept in the URL (?fy=&month=&company=&branch=&agency=&agent=&bucket=&sort=&page=); defaults are never written.
// `agency` and `agent` take any id, so they declare no value list. A month that does not belong to the FY is rejected by the API.
const TEAM_FILTERS: FilterConfig = {
  fy: { default: CURRENT_FY, values: [...new Set([CURRENT_FY, ...recentFys()])] },
  month: { default: "all", values: ["all", ...recentFys().flatMap(fyMonths)] },
  company: { default: "all", values: ["all", ...COMPANIES] },
  branch: { default: "all", values: ["all", ...BRANCHES] },
  agency: { default: "all" },
  agent: { default: "all" },
  bucket: { default: "all", values: ["all", ...DPD_BUCKETS] },
  sort: { default: "collected", values: ["collected", "allocated", "dueAmount", "pendingAmount", "collectionPct", "paid", "ptp", "pending"] },
};

// Filters, sort and page for the team dashboard and the Recovery page, plus `filters` already shaped for the API hooks.
// Use `setFilters({ fy, month: "all" })` when the FY changes: a month only makes sense inside its own FY.
export const useTeamParams = () => {
  const params = useUrlListParams(TEAM_FILTERS);
  const f = params.filters;
  const query: TeamFilters = { fy: f.fy, month: f.month, company: f.company, branch: f.branch, agencyId: f.agency, agentId: f.agent, bucket: f.bucket };
  return { ...params, query, sort: f.sort };
};
