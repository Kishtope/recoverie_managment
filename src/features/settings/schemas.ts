import { z } from "zod";

// Body of PUT /api/settings: any subset of the settings; every present value is validated. Numbers arrive as numbers (the form converts).
export const updateSettingsSchema = z
  .object({
    "calling.window": z
      .object({
        startHour: z.number({ error: "Enter the opening hour" }).int("Whole hours only").min(0, "0 to 23").max(23, "0 to 23"),
        endHour: z.number({ error: "Enter the closing hour" }).int("Whole hours only").min(1, "1 to 24").max(24, "1 to 24"),
      })
      .refine((w) => w.startHour < w.endHour, { message: "Closing hour must be after the opening hour", path: ["endHour"] }),
    "followUp.notReachableTries": z.number({ error: "Enter a number" }).int("Whole numbers only").min(1, "At least 1").max(10, "At most 10"),
    "ptp.graceDays": z.number({ error: "Enter a number" }).int("Whole numbers only").min(0, "0 or more").max(30, "At most 30"),
    "dashboard.monthlyTargetPct": z.number({ error: "Enter a percentage" }).min(0, "0 to 100").max(100, "0 to 100").nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
