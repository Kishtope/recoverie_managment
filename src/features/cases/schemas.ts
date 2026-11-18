import { z } from "zod";
import { OUTCOMES } from "@/lib/constants";
import { todayIst } from "@/lib/dates";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");
const amount = z.number({ error: "Enter an amount" }).positive("Amount must be more than 0").max(99_999_999);

// Validates an outcome form / POST body. Which fields are required depends on the outcome; fields that don't apply are dropped.
// `today` is injectable so tests can pin the date; past dates are rejected.
export const buildDispositionSchema = (today: string = todayIst()) =>
  z
    .object({
      outcome: z.enum(OUTCOMES, { error: "Choose an outcome" }),
      ptpDate: day.optional(),
      ptpAmount: amount.optional(),
      paidAmount: amount.optional(),
      nextFollowUpOn: day.optional(),
      remarks: z.string().trim().max(1000, "Keep remarks under 1000 characters").optional(),
    })
    .superRefine((v, ctx) => {
      const need = (field: keyof typeof v, message: string) => {
        if (v[field] === undefined || v[field] === "") ctx.addIssue({ code: "custom", path: [field], message });
      };
      if (v.outcome === "PTP") {
        need("ptpDate", "Enter the promised date");
        need("ptpAmount", "Enter the promised amount");
      }
      if (v.outcome === "PAID" || v.outcome === "PART_PAID") need("paidAmount", "Enter the amount paid");
      if (v.outcome === "PART_PAID" || v.outcome === "CALLBACK") need("nextFollowUpOn", "Pick the next follow-up date");
      if (v.outcome === "REFUSED_DISPUTE" || v.outcome === "WRONG_NUMBER") need("remarks", "Remarks are required for this outcome");
      for (const field of ["ptpDate", "nextFollowUpOn"] as const) {
        const value = v[field];
        if (value && value < today) ctx.addIssue({ code: "custom", path: [field], message: "Date can't be in the past" });
      }
    })
    .transform((v) => ({
      outcome: v.outcome,
      ptpDate: v.outcome === "PTP" ? v.ptpDate : undefined,
      ptpAmount: v.outcome === "PTP" ? v.ptpAmount : undefined,
      paidAmount: v.outcome === "PAID" || v.outcome === "PART_PAID" ? v.paidAmount : undefined,
      nextFollowUpOn: v.outcome === "PART_PAID" || v.outcome === "CALLBACK" || v.outcome === "NOT_REACHABLE" ? v.nextFollowUpOn : undefined,
      remarks: v.remarks || undefined,
    }));

export type DispositionFormInput = z.input<ReturnType<typeof buildDispositionSchema>>;
export type DispositionValues = z.output<ReturnType<typeof buildDispositionSchema>>;

// Body of POST /api/loans/[id]/reassign: the agent the case moves to.
export const reassignSchema = z.object({ agentId: z.string().min(1, "Choose an agent") });
export type ReassignInput = z.infer<typeof reassignSchema>;

// Body of POST /api/loans/[id]/compliance: a manager lifts a dispute pause or sets / clears the customer's do-not-call flag.
export const complianceSchema = z.object({ action: z.enum(["RESOLVE_DISPUTE", "SET_DO_NOT_CALL", "CLEAR_DO_NOT_CALL"]) });
export type ComplianceInput = z.infer<typeof complianceSchema>;

// Body of POST /api/loans/bulk-reassign: up to 200 selected cases move to one agent.
export const bulkReassignSchema = z.object({
  loanIds: z.array(z.string().min(1)).min(1, "Select at least one case").max(200, "Select at most 200 cases at a time"),
  agentId: z.string().min(1, "Choose an agent"),
});
export type BulkReassignInput = z.infer<typeof bulkReassignSchema>;

// Body of POST /api/allocation/auto: split the unassigned cases between the chosen people by a rule; dryRun only previews.
export const autoAllocateSchema = z.object({
  rule: z.enum(["EQUAL", "BUCKET", "BRANCH", "AMOUNT"]),
  agentIds: z.array(z.string().min(1)).min(1, "Choose at least one person").max(100, "Choose at most 100 people"),
  dryRun: z.boolean().default(false),
});
export type AutoAllocateInput = z.input<typeof autoAllocateSchema>;
