import { api } from "@/lib/axios";
import type { UpdateRetailerInput } from "../schemas";
import type {
  RetailerCustomersQuery,
  RetailerCustomersResponse,
  RetailerDashboardResponse,
  RetailerItem,
  RetailerListQuery,
  RetailerListResponse,
  RetailerPeriod,
} from "../types";

// Fetches one page of retailers for a status filter; "all" and empty filters are left out of the query.
export const getRetailers = async (query: RetailerListQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== "all"));
  const { data } = await api.get<RetailerListResponse>("/retailers", { params });
  return data;
};

// Fetches one retailer with its customer count.
export const getRetailer = async (id: string) => {
  const { data } = await api.get<{ retailer: RetailerItem }>(`/retailers/${id}`);
  return data.retailer;
};

// Fetches one page of the customers a retailer holds; `retailerId` is the path, the rest is the query.
export const getRetailerCustomers = async ({ retailerId, ...query }: RetailerCustomersQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== ""));
  const { data } = await api.get<RetailerCustomersResponse>(`/retailers/${retailerId}/customers`, { params });
  return data;
};

// Fetches the Overview numbers (totals and per-retailer table) for a period.
export const getRetailerDashboard = async (period: RetailerPeriod) => {
  const { data } = await api.get<RetailerDashboardResponse>("/retailers/dashboard", { params: { period } });
  return data;
};

// Edits a retailer or switches it Active / Inactive; `id` is the path, the rest is the body.
export const updateRetailer = async ({ id, ...body }: UpdateRetailerInput & { id: string }) => {
  const { data } = await api.patch<{ retailer: RetailerItem }>(`/retailers/${id}`, body);
  return data.retailer;
};
