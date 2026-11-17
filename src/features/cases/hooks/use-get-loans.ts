import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getLoans } from "../api";
import type { LoanListQuery } from "../types";

// Paginated cases; keeps the previous page visible while the next one loads.
export const useGetLoans = (query: LoanListQuery) =>
  useQuery({
    queryFn: () => getLoans(query),
    queryKey: ["get-loans", query],
    placeholderData: keepPreviousData,
  });
