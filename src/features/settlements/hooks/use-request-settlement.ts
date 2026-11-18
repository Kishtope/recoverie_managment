import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { requestSettlement } from "../api";

// Sends a settlement request, then refreshes the case so the request shows as waiting.
export const useRequestSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestSettlement,
    mutationKey: ["request-settlement"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      toast.add({ title: "Settlement requested", description: "A manager will review it.", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't request the settlement", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
