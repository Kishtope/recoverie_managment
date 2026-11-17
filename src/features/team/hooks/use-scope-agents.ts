import { useQuery } from "@tanstack/react-query";
import { getScopeAgents } from "../api";

// Agents inside the caller's scope (Admin, Manager and Agency owner only); `enabled` keeps agents from calling the route.
export const useScopeAgents = (enabled: boolean) =>
  useQuery({
    queryFn: getScopeAgents,
    queryKey: ["get-scope-agents"],
    enabled,
    staleTime: 60_000,
  });
