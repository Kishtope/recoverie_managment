import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { recordPayment } from "../api";

// Records a payment, then refreshes the case (payments list, promise status) and the lists / dashboards that count money.
export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordPayment,
    mutationKey: ["record-payment"],
    onSuccess: (payment, vars) => {
      queryClient.invalidateQueries({ queryKey: ["get-loan", vars.loanId] });
      queryClient.invalidateQueries({ queryKey: ["get-loans"] });
      queryClient.invalidateQueries({ queryKey: ["team-summary"] });
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
      toast.add({ title: "Payment recorded", description: payment.receiptNo ? `Receipt ${payment.receiptNo}` : undefined, type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't record the payment", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
