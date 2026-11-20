import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRetailer, getRetailerCustomers, getRetailerDashboard, getRetailers } from "../api";
import type { RetailerCustomersQuery, RetailerListQuery, RetailerPeriod } from "../types";

// Paginated retailers for a status filter; keeps the previous page visible while the next one loads. `enabled` holds the fetch back (hidden tab).
export const useGetRetailers = (query: RetailerListQuery, enabled = true) =>
  useQuery({
    queryFn: () => getRetailers(query),
    queryKey: ["get-retailers", query],
    placeholderData: keepPreviousData,
    enabled,
  });

// One retailer for the detail page header.
export const useGetRetailer = (id: string) =>
  useQuery({
    queryFn: () => getRetailer(id),
    queryKey: ["get-retailer", id],
  });

// Paginated customers one retailer holds; keeps the previous page visible while the next one loads.
export const useGetRetailerCustomers = (query: RetailerCustomersQuery) =>
  useQuery({
    queryFn: () => getRetailerCustomers(query),
    queryKey: ["get-retailer-customers", query],
    placeholderData: keepPreviousData,
  });

// Overview numbers for a period; `enabled` holds the fetch back while another tab is showing.
export const useGetRetailerDashboard = (period: RetailerPeriod, enabled = true) =>
  useQuery({
    queryFn: () => getRetailerDashboard(period),
    queryKey: ["get-retailer-dashboard", period],
    placeholderData: keepPreviousData,
    enabled,
  });
