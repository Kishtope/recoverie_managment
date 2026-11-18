import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { createBatch, deleteBatch, updateBatch } from "../api";
import type { BatchActionInput } from "../schemas";

// Creates a Draft batch, then refreshes the lists (and their stage counts).
export const useCreateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBatch,
    mutationKey: ["create-batch"],
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ["get-batches"] });
      toast.add({ title: "Draft batch created", description: `${batch.name} holds ${batch.followups.total} cases.`, type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't create batch", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};

// What the toast says after each step; keyed by the action sent to the API.
const DONE_TITLES: Record<BatchActionInput["action"], string> = { open: "Batch opened", start: "Batch started", close: "Batch closed" };

// Moves a batch one step forward (open / start / close), then refreshes the lists and that batch's sheet.
// `batchName` rides along in the variables only to name the batch in the toast.
export const useUpdateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, agencyId }: BatchActionInput & { id: string; batchName: string }) => updateBatch({ id, action, agencyId }),
    mutationKey: ["update-batch"],
    onSuccess: (_batch, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-batches"] });
      queryClient.invalidateQueries({ queryKey: ["get-batch", vars.id] });
      toast.add({ title: DONE_TITLES[vars.action], description: vars.batchName, type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't update batch", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};

// Deletes a Draft batch, then refreshes the lists. `batchName` rides along only for the toast.
export const useDeleteBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; batchName: string }) => deleteBatch(id),
    mutationKey: ["delete-batch"],
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-batches"] });
      queryClient.removeQueries({ queryKey: ["get-batch", vars.id] });
      toast.add({ title: "Draft deleted", description: vars.batchName, type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't delete batch", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
