import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { saveBlob } from "@/lib/download-file";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadLoanOverdue } from "../api/team";

// Downloads the Loan Overdue Excel (hub format) for the dashboard's filters: fetches the file, then saves it. The toast lives here, not in the component.
export const useExportLoanOverdue = () =>
  useMutation({
    mutationFn: downloadLoanOverdue,
    mutationKey: ["export-loan-overdue"],
    onSuccess: ({ blob, name }) => {
      saveBlob(blob, name);
      toast.add({ title: "Loan overdue sheet downloaded", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't download the sheet", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
