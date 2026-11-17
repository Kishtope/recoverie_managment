import { z } from "zod";

// Shared field rules for both forms and the API routes.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});


export type SignInInput = z.infer<typeof signInSchema>;

// Agents sign in with their mobile: ask for a code (10 digits), then send it back with the 6-digit code.
const mobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\d{10}$/, "Enter your 10-digit mobile number"));

export const otpRequestSchema = z.object({ mobile });
export const otpVerifySchema = z.object({ mobile, code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") });

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
