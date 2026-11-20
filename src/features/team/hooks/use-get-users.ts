import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getUsers } from "../api";
import type { TeamListQuery } from "../types";

// Paginated users; keeps the previous page visible while the next one loads.
export const useGetUsers = (query: TeamListQuery) =>
  useQuery({
    queryFn: () => getUsers(query),
    queryKey: ["get-users", query],
    placeholderData: keepPreviousData,
  });
