import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPerformance } from "../api";

// Team performance rows; kept on screen while a new filter loads and refreshed every minute.
export const useGetPerformance = (filters: { fy: string; month: string; agentId: string }) =>
  useQuery({
    queryFn: () => getPerformance(filters),
    queryKey: ["get-performance", filters],
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
