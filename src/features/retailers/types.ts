// Shapes shared by the retailers API and screens.

export const RETAILER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type RetailerStatusValue = (typeof RETAILER_STATUSES)[number];
export const RETAILER_STATUS_LABELS: Record<RetailerStatusValue, string> = { ACTIVE: "Active", INACTIVE: "Inactive" };

// Status filter of the Retailers list: everything, or one status (kebab-case because it lives in the URL).
export const RETAILER_FILTERS = ["all", "active", "inactive"] as const;
export type RetailerFilter = (typeof RETAILER_FILTERS)[number];

// The two tabs of the Retailers page.
export const RETAILER_TABS = ["overview", "retailers"] as const;
export type RetailerTab = (typeof RETAILER_TABS)[number];
export const RETAILER_TAB_LABELS: Record<RetailerTab, string> = { overview: "Overview", retailers: "Retailers" };

// Period filter of the Overview tab's "collected" numbers.
export const RETAILER_PERIODS = ["this-month", "last-month", "all-time"] as const;
export type RetailerPeriod = (typeof RETAILER_PERIODS)[number];
export const RETAILER_PERIOD_LABELS: Record<RetailerPeriod, string> = { "this-month": "This month", "last-month": "Last month", "all-time": "All time" };

// One retailer as the list and the edit form see it.
export type RetailerItem = {
  id: string;
  code: string;
  name: string;
  ownerName: string;
  mobile: string;
  email: string | null;
  address: string | null;
  city: string | null;
  status: RetailerStatusValue;
  customerCount: number;
  createdAt: string;
};

// `counts` fills the status toggle (all / active / inactive).
export type RetailerListResponse = { items: RetailerItem[]; total: number; page: number; pageSize: number; counts: Record<RetailerFilter, number> };
export type RetailerListQuery = { status: string; q: string; page: number; pageSize: number };

// One customer a retailer holds. A customer can have several loans: money and DPD are summed / maxed over the active ones.
export type RetailerCustomerItem = {
  id: string;
  name: string;
  mobile: string | null; // masked
  agreementNo: string; // the first loan's agreement no.
  loanCount: number;
  outstanding: number; // sum of the active loans' overdue amount
  maxDpd: number | null;
  status: "ACTIVE" | "CLOSED"; // ACTIVE when at least one loan is still active
  callers: string[]; // names of the callers who hold the active loans
  assignedOn: string | null;
};

export type RetailerCustomersResponse = { items: RetailerCustomerItem[]; total: number; page: number; pageSize: number };
export type RetailerCustomersQuery = { retailerId: string; q: string; page: number; pageSize: number };

// One row of the Overview performance table.
export type RetailerPerformanceItem = {
  retailerId: string;
  code: string;
  name: string;
  status: RetailerStatusValue;
  customers: number;
  outstanding: number; // overdue amount on the customers' active loans
  collected: number; // payments on those customers' loans in the chosen period
};

export type RetailerDashboardResponse = {
  totals: { retailers: number; active: number; inactive: number; customers: number; unassignedCustomers: number; outstanding: number; collected: number };
  items: RetailerPerformanceItem[];
  from: string | null;
  to: string;
};

// How one Loans file was split: rows given to Callers, rows given to Retailers, and per retailer how many it took (never more than 20) and how many
// of its rows were turned away (over the cap, or the retailer is inactive).
export type RetailerImportSummary = {
  caller: number;
  retailer: number;
  perRetailer: { retailerId: string; code: string; name: string; customers: number; rejected: number }[];
};
