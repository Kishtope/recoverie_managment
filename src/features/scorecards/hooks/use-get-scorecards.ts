import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getScorecards } from "../api";

// One month's scorecards; keeps the previous month visible while the next one loads.
export const useGetScorecards = (month: string) =>
  useQuery({
    queryFn: () => getScorecards(month),
    queryKey: ["get-scorecards", month],
    placeholderData: keepPreviousData,
  });
