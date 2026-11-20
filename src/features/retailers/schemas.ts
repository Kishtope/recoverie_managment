import { z } from "zod";
import { RETAILER_STATUSES } from "./types";

// An optional text field: surrounding spaces are trimmed and an empty string counts as "not given".
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : undefined));

// The editable details of a retailer. There is no code field: the Retailer Code is loaded with the retailer and never changes.
const retailerFieldsSchema = z.object({
  name: z.string().trim().min(2, "Enter the retailer or shop name").max(80, "Keep the name under 80 characters"),
  ownerName: z.string().trim().min(2, "Enter the owner name").max(80, "Keep the name under 80 characters"),
  mobile: z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit mobile number"),
  email: z
    .string()
    .trim()
    .max(120, "Keep the email under 120 characters")
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || z.email().safeParse(v).success, "Enter a valid email"),
  address: optionalText(300, "Keep the address under 300 characters"),
  city: optionalText(60, "Keep the city under 60 characters"),
});

// An optional text field on an edit: left out = unchanged, empty = clear it (stored as null).
const clearableText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v));

// Body of PATCH /api/retailers/[id]: any of the fields above (the code never changes) plus the status. Nothing to change is an error.
// An empty email / address / city here clears the stored value.
export const updateRetailerSchema = retailerFieldsSchema
  .pick({ name: true, ownerName: true, mobile: true })
  .partial()
  .extend({
    email: clearableText(120, "Keep the email under 120 characters").refine((v) => v === undefined || v === null || z.email().safeParse(v).success, "Enter a valid email"),
    address: clearableText(300, "Keep the address under 300 characters"),
    city: clearableText(60, "Keep the city under 60 characters"),
    status: z.enum(RETAILER_STATUSES, { error: "Unknown status" }).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type UpdateRetailerInput = z.input<typeof updateRetailerSchema>;
