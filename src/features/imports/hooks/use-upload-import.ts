import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { uploadImport } from "../api";

// Uploads a file, then refreshes the runs list, the unmatched hub users and the cases list (allocations/loans just changed).
export const useUploadImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadImport,
    mutationKey: ["upload-import"],
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ["get-imports"] });
      queryClient.invalidateQueries({ queryKey: ["get-unmatched-hub-users"] });
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      toast.add({
        title: "Import finished",
        description: `${run.created} new, ${run.updated} updated, ${run.unchanged} unchanged, ${run.failed} with errors.`,
        type: run.failed ? "warning" : "success",
      });
    },
    onError: (error) => {
      toast.add({ title: "Import failed", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
