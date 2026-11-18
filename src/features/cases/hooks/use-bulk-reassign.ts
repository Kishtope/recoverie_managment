import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { bulkReassignLoans } from "../api";

// Moves the selected cases to one agent, then refreshes the lists and team numbers that depend on who holds them.
// `agentName` rides along in the variables only to name the agent in the toast.
export const useBulkReassign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { loanIds: string[]; agentId: string; agentName: string }) => bulkReassignLoans({ loanIds: vars.loanIds, agentId: vars.agentId }),
    mutationKey: ["bulk-reassign-loans"],
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      queryClient.invalidateQueries({ queryKey: ["get-loan"] });
      queryClient.invalidateQueries({ queryKey: ["team-summary"] });
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      const skipped = result.skipped.length;
      toast.add({
        title: `${result.moved} ${result.moved === 1 ? "case" : "cases"} reassigned`,
        description: skipped ? `${skipped} skipped (${result.skipped[0].reason.toLowerCase()}${skipped > 1 ? ", …" : ""}). Now allocated to ${vars.agentName}.` : `Now allocated to ${vars.agentName}.`,
        type: result.moved ? "success" : "warning",
      });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't reassign", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
