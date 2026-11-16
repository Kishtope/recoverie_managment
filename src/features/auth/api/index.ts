import { api } from "@/lib/axios";
import type { AuthResponse } from "../types";
import type { SignInInput, SignUpInput } from "../schemas";

// Signs a user in; the server sets the httpOnly session cookie.
export const signIn = async (input: SignInInput) => {
  const { data } = await api.post<AuthResponse>("/auth/sign-in", input);
  return data;
};

// Creates an account; the user must sign in afterwards.
export const signUp = async (input: SignUpInput) => {
  const { data } = await api.post<AuthResponse>("/auth/sign-up", input);
  return data;
};
