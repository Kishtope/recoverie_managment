import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getLoans } from "../api";
import type { LoanListQuery } from "../types";

// Paginated cases; keeps the previous page visible while the next one loads. `enabled` holds the fetch back (e.g. until a search is typed).
export const useGetLoans = (query: LoanListQuery, enabled = true) =>
  useQuery({
    queryFn: () => getLoans(query),
    queryKey: ["get-loans", query],
    placeholderData: keepPreviousData,
    enabled,
  });
