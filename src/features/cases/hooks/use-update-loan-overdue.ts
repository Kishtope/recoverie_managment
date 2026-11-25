import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { updateLoanOverdue } from "../api";

// Saves a corrected overdue amount, then refreshes the case, the lists and the dashboard numbers built from it.
export const useUpdateLoanOverdue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLoanOverdue,
    mutationKey: ["update-loan-overdue"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      queryClient.invalidateQueries({ queryKey: ["team-summary"] });
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.add({ title: "Overdue amount updated", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't update overdue amount", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
