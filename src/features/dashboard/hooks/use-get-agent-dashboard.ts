import { useQuery } from "@tanstack/react-query";
import { getAgentDashboard } from "../api";

// Agent dashboard numbers; refreshed every minute and after any outcome is saved (that mutation invalidates this key).
export const useGetAgentDashboard = () =>
  useQuery({
    queryFn: getAgentDashboard,
    queryKey: ["agent-dashboard"],
    refetchInterval: 60_000,
  });
