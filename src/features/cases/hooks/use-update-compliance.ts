import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { updateCompliance } from "../api";

// Toast title per action; the hook owns the toast so components only handle UI follow-up.
const TITLES = { RESOLVE_DISPUTE: "Dispute resolved", SET_DO_NOT_CALL: "Marked do-not-call", CLEAR_DO_NOT_CALL: "Do-not-call cleared" } as const;

// Resolves a dispute or flips do-not-call, then refreshes the case and the lists that show its status.
export const useUpdateCompliance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompliance,
    mutationKey: ["update-compliance"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      toast.add({ title: TITLES[vars.action], type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't update the case", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
