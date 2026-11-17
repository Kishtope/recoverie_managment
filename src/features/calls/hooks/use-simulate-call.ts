import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { simulateCall } from "../api";

// Dev only: ends the ringing test call; the polled call state then flips and the case page opens the outcome form.
export const useSimulateCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: simulateCall,
    mutationKey: ["simulate-call"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-call", vars.callId] });
      queryClient.invalidateQueries({ queryKey: ["get-pending-call"] });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't simulate the call", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
