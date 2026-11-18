import { z } from "zod";
import { BRANCHES, COMPANIES } from "@/lib/constants";
import { BATCH_TYPES } from "./types";

// Body of POST /api/batches and the New batch form. The filters choose which cases go into the draft; all are optional.
export const createBatchSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Keep the name under 80 characters"),
  type: z.enum(BATCH_TYPES, { error: "Choose Call or FR" }),
  company: z.enum(COMPANIES).optional(),
  branch: z.enum(BRANCHES).optional(),
  minDpd: z.number({ error: "Enter a number" }).int("Whole days only").min(0, "0 or more").max(5000, "At most 5000").optional(),
  // FR batches default to cases that were flagged for a field visit (3 not-reachable calls).
  flaggedOnly: z.boolean().optional(),
});

// Body of PATCH /api/batches/[id]: move a batch one step forward. Starting a batch may name the agency that works it (empty = in-house).
export const batchActionSchema = z.object({
  action: z.enum(["open", "start", "close"], { error: "Unknown action" }),
  agencyId: z.string().trim().optional(),
});

export type CreateBatchInput = z.input<typeof createBatchSchema>;
export type BatchActionInput = z.input<typeof batchActionSchema>;
