import { api } from "@/lib/axios";
import type { AuthResponse } from "../types";
import type { OtpRequestInput, OtpVerifyInput, SignInInput } from "../schemas";

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

// Asks for a login code to be texted to an agent's mobile. In development with the mock SMS provider the answer also carries `devCode`.
export const requestOtp = async (input: OtpRequestInput) => {
  const { data } = await api.post<{ sent: true; resendAfterSec: number; devCode?: string }>("/auth/otp/request", input);
  return data;
};

// Signs an agent in with the code; the server sets the httpOnly session cookie.
export const verifyOtp = async (input: OtpVerifyInput) => {
  const { data } = await api.post<AuthResponse>("/auth/otp/verify", input);
  return data;
};
