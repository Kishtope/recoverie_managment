import { z } from "zod";

// Body of POST /api/calls/start: which case, and which of the customer's numbers (the number itself never leaves the server).
export const startCallSchema = z.object({
  loanId: z.string().min(1, "Choose a case"),
  numberSlot: z.enum(["primary", "alt"], { error: "Choose a number" }),
});

// Body of the dev "Simulate" route: how the test call ended.
export const simulateCallSchema = z.object({
  result: z.enum(["CONNECTED", "MISSED", "FAILED"]),
  durationSec: z.number().int().min(1).max(36_000).optional(),
});

// Body of the dev "customer missed-called us" route.
export const simulateInboundSchema = z.object({ loanId: z.string().min(1) });

// Body of POST /api/calls/reconcile.
export const reconcileSchema = z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid day") });

export const CALL_STATUS_FILTERS = ["all", "CONNECTED", "MISSED", "FAILED"] as const;
export const CALL_DIRECTION_FILTERS = ["all", "OUTBOUND", "INBOUND"] as const;

// Query string of GET /api/calls. Unknown values fall back to "no filter" instead of erroring, like the other list routes.
export const callsQuerySchema = z.object({
  status: z.enum(["CONNECTED", "MISSED", "FAILED", "INITIATED"]).optional().catch(undefined),
  direction: z.enum(["OUTBOUND", "INBOUND"]).optional().catch(undefined),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  agentId: z.string().optional(),
  callback: z.literal("pending").optional().catch(undefined),
  unmatched: z.literal("1").optional().catch(undefined),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});
