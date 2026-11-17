import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getImport, getImports, getUnmatchedHubUsers } from "../api";
import type { ImportListQuery } from "../types";

// Paginated import runs; keeps the previous page visible while the next one loads.
export const useGetImports = (query: ImportListQuery) =>
  useQuery({
    queryFn: () => getImports(query),
    queryKey: ["get-imports", query],
    placeholderData: keepPreviousData,
  });

// One run with its errors; only fetched once a run is chosen.
export const useGetImport = (id: string | undefined) =>
  useQuery({
    queryFn: () => getImport(id!),
    queryKey: ["get-import", id],
    enabled: !!id,
  });

// Hub users that blocked allocation rows and still have no app account.
export const useGetUnmatchedHubUsers = () =>
  useQuery({
    queryFn: getUnmatchedHubUsers,
    queryKey: ["get-unmatched-hub-users"],
  });
