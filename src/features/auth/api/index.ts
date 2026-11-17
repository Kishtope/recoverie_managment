import { api } from "@/lib/axios";
import type { AuthResponse } from "../types";
import type { SignInInput } from "../schemas";

// Signs a user in; the server sets the httpOnly session cookie.
export const signIn = async (input: SignInInput) => {
  const { data } = await api.post<AuthResponse>("/auth/sign-in", input);
  return data;
};


// Fetches the currently signed-in user.
export const getMe = async () => {
  const { data } = await api.get<AuthResponse>("/auth/me");
  return data.user;
};

// Ends the session; the server clears the cookie.
export const signOut = async () => {
  await api.post("/auth/sign-out");
};
