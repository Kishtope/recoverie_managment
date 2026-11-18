import { z } from "zod";

// Ways a payment can arrive; imported payments keep whatever text their file used, so this list only governs payments recorded in the app.
export const PAYMENT_MODES = ["CASH", "UPI", "CHEQUE", "BANK_TRANSFER", "OTHER"] as const;
export const PAYMENT_MODE_LABELS: Record<(typeof PAYMENT_MODES)[number], string> = {
  CASH: "Cash",
  UPI: "UPI",
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

// Body of POST /api/loans/[id]/payments (shared by the form and the route). paidOn must not be in the future: the route checks it against
// the Indian day, the schema only checks the shape.
export const recordPaymentSchema = z.object({
  amount: z.number({ error: "Enter the amount received" }).positive("Amount must be more than 0").max(10_000_000, "Amount is too large"),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the day the money was received"),
  mode: z.enum(PAYMENT_MODES, { error: "Choose how it was paid" }),
  reference: z.string().trim().max(64, "At most 64 characters").optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
