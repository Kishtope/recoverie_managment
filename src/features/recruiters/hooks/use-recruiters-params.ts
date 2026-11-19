import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { RECRUITER_PERIODS, RECRUITER_STAGES, RECRUITER_TABS } from "../types";

// Recruiters filters kept in the URL (?tab=&stage=&recruiter=&period=&q=&page=); defaults (Cases, With recruiter, all recruiters, this month) are never written.
// `recruiter` accepts any id, so it declares no list of values.
const RECRUITERS_FILTERS: FilterConfig = {
  tab: { default: "cases", values: RECRUITER_TABS },
  stage: { default: "with-recruiter", values: RECRUITER_STAGES },
  recruiter: { default: "all" },
  period: { default: "this-month", values: RECRUITER_PERIODS },
};

// Tab, stage, recruiter, period, search and page for the Recruiters page. Changing any filter goes back to page 1.
export const useRecruitersParams = () => useUrlListParams(RECRUITERS_FILTERS);

// What the page hands to each tab.
export type RecruitersParams = ReturnType<typeof useRecruitersParams>;
