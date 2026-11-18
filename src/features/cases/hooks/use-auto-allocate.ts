import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { autoAllocate } from "../api";

// Runs the allocation engine. A dry run (preview) only returns the plan, so it shows no toast and refreshes nothing;
// a real run refreshes the lists and team numbers and confirms how many cases were allocated.
export const useAutoAllocate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: autoAllocate,
    mutationKey: ["auto-allocate"],
    onSuccess: (result) => {
      if (result.dryRun) return;
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      queryClient.invalidateQueries({ queryKey: ["team-summary"] });
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.add({
        title: `${result.assigned} ${result.assigned === 1 ? "case" : "cases"} allocated`,
        description: result.unassigned ? `${result.unassigned} still unassigned.` : "Every unassigned case now has an owner.",
        type: "success",
      });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't allocate cases", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
