import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { RETAILER_FILTERS, RETAILER_PERIODS, RETAILER_TABS } from "../types";

// Retailers page state kept in the URL (?tab=&status=&period=&q=&page=); defaults (Overview, All, This month) are never written.
const RETAILERS_FILTERS: FilterConfig = {
  tab: { default: "overview", values: RETAILER_TABS },
  status: { default: "all", values: RETAILER_FILTERS },
  period: { default: "this-month", values: RETAILER_PERIODS },
};

// Tab, status, period, search and page of the Retailers page. Changing any filter goes back to page 1.
export const useRetailersParams = () => useUrlListParams(RETAILERS_FILTERS);

// A retailer's customers list only has search and page (no filters).
export const useRetailerCustomersParams = () => useUrlListParams({});
