import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { ROLES } from "@/lib/constants";

// Team filters kept in the URL (?q=&role=&status=&page=); defaults are never written. Declared once so the hook sees a stable object.
const TEAM_FILTERS: FilterConfig = {
  role: { default: "all", values: ["all", ...ROLES] },
  status: { default: "all", values: ["all", "ACTIVE", "DISABLED"] },
};

// Search, role/status filters and page for the Team list.
export const useTeamParams = () => useUrlListParams(TEAM_FILTERS);
