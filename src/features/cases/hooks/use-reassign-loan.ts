import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { reassignLoan } from "../api";

// Moves a case to another agent, then refreshes the case, the lists and the team numbers that depend on who holds it.
// `agentName` rides along in the variables only to name the agent in the toast.
export const useReassignLoan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { loanId: string; agentId: string; agentName: string }) => reassignLoan({ loanId: vars.loanId, agentId: vars.agentId }),
    mutationKey: ["reassign-loan"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      queryClient.invalidateQueries({ queryKey: ["team-summary"] });
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.add({ title: "Case reassigned", description: `Now allocated to ${vars.agentName}.`, type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't reassign", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
