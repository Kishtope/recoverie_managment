import { z } from "zod";
import { BRANCHES, COMPANIES } from "@/lib/constants";
import { DPD_BUCKETS } from "@/lib/dpd-bucket";
import { getFy, monthRange } from "@/lib/fy";
import { todayIst } from "@/lib/dates";

// Query string of the manager dashboards, the recovery page and the Excel export. Unknown values fall back to "no filter".
// `fy` defaults to the current financial year and `month` to the whole year; a month outside the FY is rejected by `periodOf`.
export const teamQuerySchema = z.object({
  fy: z.string().default(() => getFy(todayIst())).catch(() => getFy(todayIst())),
  month: z.string().default("all").catch("all"),
  company: z.enum(COMPANIES).optional().catch(undefined),
  branch: z.enum(BRANCHES).optional().catch(undefined),
  agencyId: z.string().optional(),
  agentId: z.string().optional(),
  bucket: z.enum(DPD_BUCKETS).optional().catch(undefined),
  sort: z.enum(["collected", "allocated", "dueAmount", "pendingAmount", "collectionPct", "paid", "ptp", "pending"]).default("collected").catch("collected"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});
export type TeamQuery = z.infer<typeof teamQuerySchema>;

// The day range a query means, or null when the month does not belong to the financial year.
export const periodOf = (q: Pick<TeamQuery, "fy" | "month">) => monthRange(q.fy, q.month);
