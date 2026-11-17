import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadDailyMis } from "../api";

// Downloads the Daily MIS Excel file: fetches it, then saves it through a temporary link. The toast lives here, not in the component.
export const useExportMis = () =>
  useMutation({
    mutationFn: downloadDailyMis,
    mutationKey: ["export-daily-mis"],
    onSuccess: ({ blob, name }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      toast.add({ title: "Daily MIS downloaded", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't export", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
