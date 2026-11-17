import { z } from "zod";
import { BRANCHES, COMPANIES, ROLES } from "@/lib/constants";

// Shared by the Team form and the /api/users routes.
const access = z.object({ company: z.enum(COMPANIES), branch: z.enum(BRANCHES) });

const base = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  mobile: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Enter a 10-digit mobile number")
    .or(z.literal(""))
    .optional(),
  role: z.enum(ROLES),
  agencyId: z.string().optional(),
  reportsToId: z.string().optional(),
  hubUserId: z.string().trim().max(64).optional(), // hub.kishtope.com user id; blank = not linked
  access: z.array(access).default([]),
});

// Everyone except an Admin must report to someone.
const needsReportsTo = (v: { role: string; reportsToId?: string }) => v.role === "ADMIN" || !!v.reportsToId;
const reportsToIssue = { message: "Reports to is required for this role", path: ["reportsToId"] };

export const createUserSchema = base
  .extend({ password: z.string().min(8, "Password must be at least 8 characters") })
  .refine(needsReportsTo, reportsToIssue);

// Edit: password is optional (blank = keep current); status lets an Admin disable/enable.
export const updateUserSchema = base
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters").or(z.literal("")).optional(),
    status: z.enum(["ACTIVE", "DISABLED"]),
  })
  .refine(needsReportsTo, reportsToIssue);

export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
