import { api } from "@/lib/axios";
import type { RecordPaymentInput } from "../schemas";
import type { PaymentItem, Receipt } from "../types";

// Records a payment received on a case; `loanId` is the path, the rest is the body.
export const recordPayment = async ({ loanId, ...body }: RecordPaymentInput & { loanId: string }) => {
  const { data } = await api.post<{ payment: PaymentItem }>(`/loans/${loanId}/payments`, body);
  return data.payment;
};

// Fetches the digital receipt for one payment.
export const getReceipt = async (paymentId: string) => {
  const { data } = await api.get<{ receipt: Receipt }>(`/payments/${paymentId}/receipt`);
  return data.receipt;
};
