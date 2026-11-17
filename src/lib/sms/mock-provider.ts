import type { SmsProvider } from "./types";

// Test provider: nothing is sent. The text goes to the server log so a developer can read the code without a phone.
export const mockSmsProvider: SmsProvider = {
  name: "MOCK",
  send: async ({ to, text }) => {
    console.log(`[sms:mock] to ${to}: ${text}`);
  },
};
