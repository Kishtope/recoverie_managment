import { z } from "zod";

export const CUTOVER_FILTERS = ["all", "not-ready"] as const;

// Query string of GET /api/cutover/readiness; unknown values fall back to the defaults. `format=csv` downloads the whole filtered list.
export const cutoverQuerySchema = z.object({
  filter: z.enum(CUTOVER_FILTERS).catch("all"),
  format: z.literal("csv").optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});
