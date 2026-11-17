import type { TelephonyProvider } from "./types";

// Skeleton for the Sarv telephony vendor. Nothing here works until Sarv's API details are known; every method fails loudly rather than guessing.
// The rest of the app needs no change once these four TODOs are filled in.
const notConfigured = (): never => {
  throw new Error("Sarv provider not configured");
};

export const sarvProvider: TelephonyProvider = {
  name: "SARV",

  // TODO(sarv): click-to-call. Need: base URL + auth header (env SARV_BASE_URL / SARV_API_KEY), endpoint, request body (agent number or
  // extension / agent id, customer number, caller ID / DID), and which response field holds the call id to return as providerCallId.
  startCall: async () => notConfigured(),

  // TODO(sarv): webhook mapping. Need: which events Sarv sends (ringing, answered, completed, missed...), the field names for call id,
  // status, duration, recording URL, direction and numbers, the time format, and a real sample payload. Use mapProviderStatus in status.ts.
  parseWebhook: async () => notConfigured(),

  // TODO(sarv): call report API for the nightly reconciliation. Need: endpoint, how to ask for one day, and paging.
  fetchCallReport: async () => notConfigured(),
};
