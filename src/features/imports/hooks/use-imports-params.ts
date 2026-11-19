import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";

// The Customers page keeps only the search and the page in the URL (?q=&page=); declared once so the hook sees a stable object.
const IMPORTS_FILTERS: FilterConfig = {};

// Search text and page for the uploaded customers list.
export const useImportsParams = () => useUrlListParams(IMPORTS_FILTERS);
