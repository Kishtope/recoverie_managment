import { api } from "@/lib/axios";
import type { PerformanceResponse } from "../types";

// Team performance for a financial year / month and an optional agent; empty and "all" values are left out.
export const getPerformance = async (filters: { fy: string; month: string; agentId: string }) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== "all"));
  const { data } = await api.get<PerformanceResponse>("/performance", { params });
  return data;
};
