import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadScorecard } from "../api";

// Downloads the month's scorecard Excel file: fetches it, then saves it through a temporary link. The toast lives here, not in the component.
export const useExportScorecard = () =>
  useMutation({
    mutationFn: downloadScorecard,
    mutationKey: ["export-scorecard"],
    onSuccess: ({ blob, name }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      toast.add({ title: "Scorecard downloaded", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't export", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
