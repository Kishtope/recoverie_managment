import { mockSmsProvider } from "./mock-provider";
import { realSmsProvider } from "./real-provider";
import type { SmsProvider } from "./types";

// The provider chosen by env SMS_PROVIDER ("mock" is the default, "real" once a vendor is connected). Any other value is a clear error.
export const getSmsProvider = (): SmsProvider => {
  const name = (process.env.SMS_PROVIDER || "mock").toLowerCase();
  if (name === "mock") return mockSmsProvider;
  if (name === "real") return realSmsProvider;
  throw new Error(`Unknown SMS_PROVIDER "${name}" (use "mock" or "real")`);
};

// True only for the mock provider outside production: the only case where the code may be shown in the API response for testing.
export const devSmsCodeVisible = () => process.env.NODE_ENV !== "production" && (process.env.SMS_PROVIDER || "mock").toLowerCase() === "mock";
