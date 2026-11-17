import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getTeamCharts, getTeamSummary, getTeamUsers } from "../api/team";
import type { TeamFilters } from "../types";

// Top cards for the team dashboard; refreshed every minute and kept on screen while a new filter loads.
export const useGetTeamSummary = (filters: TeamFilters) =>
  useQuery({
    queryFn: () => getTeamSummary(filters),
    queryKey: ["team-summary", filters],
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

// One page of the user-wise table (dashboard and the Recovery page share it).
export const useGetTeamUsers = (filters: TeamFilters & { sort: string; page: number; pageSize: number }) =>
  useQuery({
    queryFn: () => getTeamUsers(filters),
    queryKey: ["team-users", filters],
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

// Chart data for the team dashboard.
export const useGetTeamCharts = (filters: TeamFilters) =>
  useQuery({
    queryFn: () => getTeamCharts(filters),
    queryKey: ["team-charts", filters],
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
