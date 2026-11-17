import type { SmsProvider } from "./types";

// Skeleton for the real SMS vendor. Nothing here works until the vendor is chosen; it fails loudly rather than guessing.
export const realSmsProvider: SmsProvider = {
  name: "REAL",
  // TODO(sms): pick the vendor. Need: API base URL + key (env SMS_API_KEY / SMS_BASE_URL), request body, the DLT-registered template id
  // and sender id (required for SMS in India), and how a delivery failure is reported.
  send: async () => {
    throw new Error("SMS provider not configured");
  },
};
