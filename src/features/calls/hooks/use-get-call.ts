import { useQuery } from "@tanstack/react-query";
import { getCall } from "../api";

// One call's state; polls every 2s while the call is still ringing (INITIATED) and stops once it has a final status.
export const useGetCall = (id: string | undefined) =>
  useQuery({
    queryFn: () => getCall(id as string),
    queryKey: ["get-call", id],
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.call.status === "INITIATED" ? 2000 : false),
  });
