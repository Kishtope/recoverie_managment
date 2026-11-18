import { z } from "zod";

// Body of POST /api/loans/[id]/settlements: what the customer offers to pay to close the overdue amount.
export const requestSettlementSchema = z.object({
  requestedAmount: z.number({ error: "Enter the amount the customer will pay" }).positive("Amount must be more than 0").max(10_000_000, "Amount is too large"),
  remarks: z.string().trim().max(500, "At most 500 characters").optional(),
});
export type RequestSettlementInput = z.infer<typeof requestSettlementSchema>;

// Body of POST /api/settlements/[id]/decision.
export const decideSettlementSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500, "At most 500 characters").optional(),
});
export type DecideSettlementInput = z.infer<typeof decideSettlementSchema>;
