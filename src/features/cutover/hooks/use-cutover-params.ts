import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { CUTOVER_FILTERS } from "../schemas";

// Cut-over filter kept in the URL (?filter=&page=); the default ("all") is never written.
const CUTOVER_FILTER_CONFIG: FilterConfig = { filter: { default: "all", values: CUTOVER_FILTERS } };

// The Not ready filter and page for the readiness table.
export const useCutoverParams = () => useUrlListParams(CUTOVER_FILTER_CONFIG);
