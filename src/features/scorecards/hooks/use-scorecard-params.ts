import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { todayIst } from "@/lib/dates";
import { fyMonths, recentFys } from "@/lib/fy";

// Months a scorecard can be opened for: the recent financial years' months up to and including the current one, newest first.
const CURRENT_MONTH = todayIst().slice(0, 7);
export const SCORECARD_MONTHS = recentFys()
  .flatMap(fyMonths)
  .filter((m) => m <= CURRENT_MONTH)
  .sort()
  .reverse();

// Scorecard month kept in the URL (?month=yyyy-MM); the current month is the default and is never written.
const SCORECARD_FILTERS: FilterConfig = { month: { default: CURRENT_MONTH, values: SCORECARD_MONTHS } };

export const useScorecardParams = () => useUrlListParams(SCORECARD_FILTERS);
