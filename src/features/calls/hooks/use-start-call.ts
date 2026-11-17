import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { startCall } from "../api";

// Places a call, then refreshes the case (so the call panel appears) and the pending-call banner.
export const useStartCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startCall,
    mutationKey: ["start-call"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
      queryClient.invalidateQueries({ queryKey: ["get-pending-call"] });
      queryClient.invalidateQueries({ queryKey: ["get-calls"] });
      toast.add({ title: "Calling…", description: "Your phone rings first, then the customer's.", type: "success" });
    },
    onError: (error, vars) => {
      // A 409 means a call elsewhere still needs its outcome; the page shows the link, so refresh to show why the button is off.
      if (isAxiosError(error) && error.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
        queryClient.invalidateQueries({ queryKey: ["get-pending-call"] });
      }
      toast.add({ title: "Couldn't place the call", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
