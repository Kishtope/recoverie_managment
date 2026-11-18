import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { FOLLOW_UP_TABS } from "../types";

// The active tab and search kept in the URL (?tab=&q=&page=); "new" is the default and never written.
const FOLLOW_UP_FILTERS: FilterConfig = {
  tab: { default: "new", values: FOLLOW_UP_TABS },
};

// Tab, search and page for the agent's Follow-ups list.
export const useFollowUpsParams = () => useUrlListParams(FOLLOW_UP_FILTERS);
