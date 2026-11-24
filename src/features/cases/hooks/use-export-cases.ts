import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { saveBlob } from "@/lib/download-file";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCases } from "../api";

// Downloads the filtered cases as Excel: fetches the file, then saves it. The toast lives here, not in the component.
export const useExportCases = () =>
  useMutation({
    mutationFn: downloadCases,
    mutationKey: ["export-cases"],
    onSuccess: ({ blob, name }) => {
      saveBlob(blob, name);
      toast.add({ title: "Cases downloaded", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't export cases", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
