import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { decideSettlement } from "../api";

// Approves or rejects a settlement, then refreshes the case and the "settlement waiting" list.
// `loanId` rides along in the variables only so the right case is refreshed.
export const useDecideSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: Parameters<typeof decideSettlement>[0] & { loanId: string }) => decideSettlement({ settlementId: vars.settlementId, decision: vars.decision, note: vars.note }),
    mutationKey: ["decide-settlement"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      toast.add({ title: vars.decision === "APPROVED" ? "Settlement approved" : "Settlement rejected", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't save the decision", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
