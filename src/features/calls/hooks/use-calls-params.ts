import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { CALL_DIRECTION_FILTERS, CALL_STATUS_FILTERS } from "../schemas";

// Calls filters kept in the URL (?q=&status=&direction=&date=&agent=&unmatched=&page=); defaults are never written.
// `agent` takes any user id and `date` any "yyyy-MM-dd" (the API ignores a bad one), so they declare no value list.
const CALLS_FILTERS: FilterConfig = {
  status: { default: "all", values: CALL_STATUS_FILTERS },
  direction: { default: "all", values: CALL_DIRECTION_FILTERS },
  date: { default: "" },
  agent: { default: "all" },
  unmatched: { default: "all", values: ["all", "1"] },
};

// Search, status / direction / day / agent / unmatched filters and page for the Calls list.
export const useCallsParams = () => useUrlListParams(CALLS_FILTERS);
