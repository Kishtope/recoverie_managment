import { z } from "zod";
import { DISPUTE_CATEGORIES, OUTCOMES, OUTCOME_DETAILS } from "@/lib/constants";
import { todayIst } from "@/lib/dates";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");
const amount = z.number({ error: "Enter an amount" }).positive("Amount must be more than 0").max(99_999_999);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a valid time");

// One customer answer sent with an outcome. Only the question id and the answer travel: the server copies the question text itself.
export const responseSchema = z.object({
  questionId: z.string().min(1),
  response: z.string().trim().min(1, "Write the customer's answer").max(1000, "Keep each answer under 1000 characters"),
  remarks: z.string().trim().max(500, "Keep remarks under 500 characters").optional(),
});
export type ResponseInput = z.infer<typeof responseSchema>;

// Validates an outcome form / POST body. Which fields are required depends on the outcome; fields that don't apply are dropped.
// `today` is injectable so tests can pin the date; past follow-up dates and future payment dates are rejected.
export const buildDispositionSchema = (today: string = todayIst()) =>
  z
    .object({
      outcome: z.enum(OUTCOMES, { error: "Choose an outcome" }),
      outcomeDetail: z.enum(OUTCOME_DETAILS).optional(),
      ptpDate: day.optional(),
      ptpAmount: amount.optional(),
      paidAmount: amount.optional(),
      paymentDate: day.optional(),
      transactionRef: z.string().trim().max(100, "Keep the reference under 100 characters").optional(),
      callbackTime: time.optional(),
      nextFollowUpOn: day.optional(),
      reason: z.string().trim().max(500, "Keep this under 500 characters").optional(),
      category: z.enum(DISPUTE_CATEGORIES).optional(),
      remarks: z.string().trim().max(1000, "Keep remarks under 1000 characters").optional(),
      responses: z.array(responseSchema).max(50).optional(),
    })
    .superRefine((v, ctx) => {
      const need = (field: keyof typeof v, message: string) => {
        const value = v[field];
        if (value === undefined || value === "") ctx.addIssue({ code: "custom", path: [field], message });
      };
      const detail = v.outcomeDetail;
      if (detail && (detail === "NO_ANSWER" || detail === "BUSY" ? v.outcome !== "NOT_REACHABLE" : v.outcome !== "REFUSED_DISPUTE")) {
        ctx.addIssue({ code: "custom", path: ["outcomeDetail"], message: "This detail doesn't match the outcome" });
      }
      if (v.outcome === "PTP") {
        need("ptpDate", "Enter the promised date");
        need("ptpAmount", "Enter the promised amount");
      }
      if (v.outcome === "PAID" || v.outcome === "PART_PAID") {
        need("paidAmount", "Enter the amount paid");
        need("paymentDate", "Enter the payment date");
      }
      if (v.outcome === "PART_PAID") need("nextFollowUpOn", "Pick the next follow-up date");
      if (v.outcome === "CALLBACK") {
        need("nextFollowUpOn", "Pick the callback date");
        need("callbackTime", "Pick the callback time");
      }
      if (v.outcome === "REFUSED_DISPUTE") {
        if (detail === "REFUSED") need("reason", "Enter the reason for refusing");
        else if (detail === "DISPUTE") {
          need("category", "Choose a dispute category");
          need("reason", "Describe the dispute");
        }
      }
      // Remarks are required for every outcome: they say what was actually discussed.
      need("remarks", "Remarks are required");
      for (const field of ["ptpDate", "nextFollowUpOn"] as const) {
        const value = v[field];
        if (value && value < today) ctx.addIssue({ code: "custom", path: [field], message: "Date can't be in the past" });
      }
      if (v.paymentDate && v.paymentDate > today) ctx.addIssue({ code: "custom", path: ["paymentDate"], message: "Payment date can't be in the future" });
      const ids = (v.responses ?? []).map((r) => r.questionId);
      if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["responses"], message: "A question was answered twice" });
    })
    .transform((v) => {
      const paid = v.outcome === "PAID" || v.outcome === "PART_PAID";
      const refusedOrDispute = v.outcome === "REFUSED_DISPUTE";
      return {
        outcome: v.outcome,
        outcomeDetail: v.outcomeDetail,
        ptpDate: v.outcome === "PTP" ? v.ptpDate : undefined,
        ptpAmount: v.outcome === "PTP" ? v.ptpAmount : undefined,
        paidAmount: paid ? v.paidAmount : undefined,
        paymentDate: paid ? v.paymentDate : undefined,
        transactionRef: v.outcome === "PAID" ? v.transactionRef || undefined : undefined,
        callbackTime: v.outcome === "CALLBACK" ? v.callbackTime : undefined,
        nextFollowUpOn: v.outcome === "PART_PAID" || v.outcome === "CALLBACK" || v.outcome === "NOT_REACHABLE" || v.outcome === "OTHER" ? v.nextFollowUpOn : undefined,
        reason: v.outcome === "CALLBACK" || refusedOrDispute || v.outcome === "NOT_INTERESTED" ? v.reason || undefined : undefined,
        category: v.outcomeDetail === "DISPUTE" ? v.category : undefined,
        remarks: v.remarks || undefined,
        responses: v.responses?.map((r) => ({ ...r, remarks: r.remarks || undefined })) ?? [],
      };
    });

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
