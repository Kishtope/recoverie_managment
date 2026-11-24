import { api } from "@/lib/axios";
import { fetchFile } from "@/lib/download-file";
import type { TeamChartsResponse, TeamFilters, TeamSummaryResponse, TeamUsersResponse } from "../types";

// Filters as a query string: empty and "all" values are left out so the server uses its defaults.
const toParams = (filters: Record<string, string | number>) => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== "all"));

// Top cards for the caller's scope and filters.
export const getTeamSummary = async (filters: TeamFilters) => {
  const { data } = await api.get<TeamSummaryResponse>("/dashboard/summary", { params: toParams(filters) });
  return data;
};

// One page of the user-wise table.
export const getTeamUsers = async (filters: TeamFilters & { sort: string; page: number; pageSize: number }) => {
  const { data } = await api.get<TeamUsersResponse>("/dashboard/users", { params: toParams(filters) });
  return data;
};

// Data for the three charts.
export const getTeamCharts = async (filters: TeamFilters) => {
  const { data } = await api.get<TeamChartsResponse>("/dashboard/charts", { params: toParams(filters) });
  return data;
};

// Downloads the whole user-wise recovery table (all agents, current filters and sort) as an Excel file.
export const downloadTeamUsers = (filters: TeamFilters & { sort: string }) => fetchFile("/dashboard/users/export", filters, "recovery.xlsx");
