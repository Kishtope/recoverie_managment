import { useQuery } from "@tanstack/react-query";
import { getReceipt } from "../api";

// One payment's receipt; only fetched while the receipt dialog is open for that payment.
export const useGetReceipt = (paymentId: string | null) =>
  useQuery({
    queryFn: () => getReceipt(paymentId as string),
    queryKey: ["get-receipt", paymentId],
    enabled: !!paymentId,
    staleTime: 5 * 60_000,
  });
