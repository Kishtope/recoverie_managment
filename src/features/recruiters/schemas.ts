import { z } from "zod";
import { BRANCHES, COMPANIES } from "@/lib/constants";

// Most cases one "Assign cases" run hands to a recruiter.
export const MAX_ASSIGN = 200;

// Body of POST /api/recruiters/assign and the Assign cases form: which recruiter, how many cases, and optional filters for which ones
// (company, branch, days past due). Only cases nobody holds yet are taken, the most overdue first.
export const assignCasesSchema = z.object({
  recruiterId: z.string().trim().min(1, "Choose a recruiter"),
  count: z.number({ error: "Enter how many cases" }).int("Whole numbers only").min(1, "At least 1").max(MAX_ASSIGN, `At most ${MAX_ASSIGN} at a time`),
  company: z.enum(COMPANIES).optional(),
  branch: z.enum(BRANCHES).optional(),
  minDpd: z.number({ error: "Enter a number" }).int("Whole days only").min(0, "0 or more").max(5000, "At most 5000").optional(),
});

export type AssignCasesInput = z.input<typeof assignCasesSchema>;
