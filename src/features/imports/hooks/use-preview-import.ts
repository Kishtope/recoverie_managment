import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { previewImport } from "../api";

// Checks a Customers file before it is saved (nothing is written, so there is nothing to refresh). The dialog shows the result.
export const usePreviewImport = () =>
  useMutation({
    mutationFn: previewImport,
    mutationKey: ["preview-import"],
    onError: (error) => {
      toast.add({ title: "Couldn't check the file", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
