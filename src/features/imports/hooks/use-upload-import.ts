import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { uploadImport } from "../api";

// Uploads the customers file, then refreshes the customers list and the team numbers (cases may also have been allocated).
export const useUploadImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadImport,
    mutationKey: ["upload-import"],
    onSuccess: ({ run, allocation, allocationError }) => {
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      queryClient.invalidateQueries({ queryKey: ["team-summary"] });
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      const imported = `${run.created} new, ${run.updated} updated, ${run.unchanged} unchanged, ${run.failed} with errors.`;
      const allocated = allocation
        ? ` ${allocation.assigned} ${allocation.assigned === 1 ? "case" : "cases"} allocated${allocation.unassigned ? `, ${allocation.unassigned} left unassigned` : ""}.`
        : "";
      toast.add({
        title: "Import finished",
        description: imported + allocated,
        type: run.failed || allocationError ? "warning" : "success",
      });
      if (allocationError) toast.add({ title: "Cases were not allocated", description: allocationError, type: "error" });
    },
    onError: (error) => {
      toast.add({ title: "Import failed", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
