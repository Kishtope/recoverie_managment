import { z } from "zod";
import { todayIst } from "@/lib/dates";

// Query of GET /api/scorecards and its export: one month "yyyy-MM" (default the current month).
export const scorecardQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .default(() => todayIst().slice(0, 7))
    .catch(() => todayIst().slice(0, 7)),
});

// Body of PUT /api/targets: a caller's goals for one month. An empty value clears that goal; both empty removes the target.
export const setTargetSchema = z.object({
  userId: z.string().min(1, "Choose a caller"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a month"),
  collectionAmount: z.number({ error: "Enter a number" }).positive("Must be more than 0").max(1_000_000_000, "Too large").nullable(),
  casesResolved: z.number({ error: "Enter a number" }).int("Whole numbers only").positive("Must be more than 0").max(100_000, "Too large").nullable(),
});
export type SetTargetInput = z.infer<typeof setTargetSchema>;
