import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { BATCH_STAGES, BATCH_TYPES } from "../types";

// Batches filters kept in the URL (?type=&stage=&q=&page=); defaults (Call, Open) are never written.
const BATCHES_FILTERS: FilterConfig = {
  type: { default: "CALL", values: BATCH_TYPES },
  stage: { default: "open", values: BATCH_STAGES },
};

// Type (Call / FR), stage, search and page for the Batches list. Changing the type goes back to page 1 like any filter.
export const useBatchesParams = () => useUrlListParams(BATCHES_FILTERS);
