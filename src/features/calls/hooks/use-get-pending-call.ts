import { useQuery } from "@tanstack/react-query";
import { getPendingCall } from "../api";

// The agent's call that still needs an outcome (null when none); refreshed every 30s. Pass enabled=false for non-agents (the route is agent only).
export const useGetPendingCall = (enabled = true) =>
  useQuery({
    queryFn: getPendingCall,
    queryKey: ["get-pending-call"],
    enabled,
    refetchInterval: 30_000,
  });
