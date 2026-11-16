import { isAxiosError } from "axios";

// Picks the most useful error text: backend message first, then the error's own message, then the fallback.
export const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error ?? error.response?.data?.message;
    if (typeof message === "string" && message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
