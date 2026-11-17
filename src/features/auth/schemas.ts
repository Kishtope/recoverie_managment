import { z } from "zod";

// Shared field rules for both forms and the API routes.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});


export type SignInInput = z.infer<typeof signInSchema>;
