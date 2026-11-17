import { mockProvider } from "./mock-provider";
import { sarvProvider } from "./sarv-provider";
import type { TelephonyProvider } from "./types";

// The provider chosen by env TELEPHONY_PROVIDER ("mock" is the default, "sarv" once Sarv is connected). Any other value is a clear error.
export const getTelephonyProvider = (): TelephonyProvider => {
  const name = (process.env.TELEPHONY_PROVIDER || "mock").toLowerCase();
  if (name === "mock") return mockProvider;
  if (name === "sarv") return sarvProvider;
  throw new Error(`Unknown TELEPHONY_PROVIDER "${name}" (use "mock" or "sarv")`);
};

// True only for the mock provider outside production: gates the Simulate panel and the /api/dev routes.
export const devCallToolsEnabled = () =>
  process.env.NODE_ENV !== "production" && (process.env.TELEPHONY_PROVIDER || "mock").toLowerCase() === "mock";
