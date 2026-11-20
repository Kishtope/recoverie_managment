import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { BRANCHES, COMPANIES, OUTCOMES } from "@/lib/constants";
import { FLAGS } from "../types";

// Cases filters kept in the URL (?q=&agent=&company=&branch=&followUp=&outcome=&flag=&retailer=&page=); defaults are never written.
// `agent` takes any user id (or "none" = unassigned) and `retailer` any retailer id (or "none"), so they declare no value list.
const CASES_FILTERS: FilterConfig = {
  agent: { default: "all" },
  company: { default: "all", values: ["all", ...COMPANIES] },
  branch: { default: "all", values: ["all", ...BRANCHES] },
  followUp: { default: "all", values: ["all", "today", "overdue", "upcoming"] },
  outcome: { default: "all", values: ["all", ...OUTCOMES] },
  flag: { default: "all", values: FLAGS },
  retailer: { default: "all" },
};

// Search, follow-up / outcome / flag / agent / company / branch filters and page for the Cases list.
export const useCasesParams = () => useUrlListParams(CASES_FILTERS);
