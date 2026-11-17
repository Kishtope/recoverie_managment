import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCalls } from "../api";
import type { CallListQuery } from "../types";

// Paginated calls; keeps the previous page visible while the next one loads.
export const useGetCalls = (query: CallListQuery) =>
  useQuery({
    queryFn: () => getCalls(query),
    queryKey: ["get-calls", query],
    placeholderData: keepPreviousData,
  });
