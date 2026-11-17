import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";

// Imports filters kept in the URL (?type=&status=&page=); defaults are never written. Declared once so the hook sees a stable object.
const IMPORTS_FILTERS: FilterConfig = {
  type: { default: "all", values: ["all", "LOANS", "ALLOCATIONS", "PAYMENTS"] },
  status: { default: "all", values: ["all", "DONE", "FAILED", "RUNNING"] },
};

// Type/status filters and page for the runs list (the shared hook also tracks `q`, unused here).
export const useImportsParams = () => useUrlListParams(IMPORTS_FILTERS);
