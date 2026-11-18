import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { setTarget } from "../api";

// Saves a caller's monthly goals, then refreshes the scorecards (and the agent's own dashboard, which shows their target).
export const useSetTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setTarget,
    mutationKey: ["set-target"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-scorecards"] });
      queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] });
      toast.add({ title: vars.collectionAmount === null && vars.casesResolved === null ? "Target cleared" : "Target saved", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't save the target", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
