import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { checkImportColumns } from "../api";

// Reads a chosen file's header row and reports the missing required columns; nothing is saved, so nothing is refreshed.
// The dialog shows the missing columns itself; only an unreadable file (wrong type, too big) raises a toast.
export const useCheckImportColumns = () =>
  useMutation({
    mutationFn: checkImportColumns,
    mutationKey: ["check-import-columns"],
    onError: (error) => {
      toast.add({ title: "Couldn't read the file", description: getErrorMessage(error, "Choose an .xlsx or .csv file."), type: "error" });
    },
  });
