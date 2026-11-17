// What the app needs from an SMS vendor. Swap the implementation (mock -> a real provider) without touching the rest of the app.
export type SmsProvider = {
  name: "MOCK" | "REAL";
  // Sends one text message to a 10-digit Indian mobile number.
  send: (args: { to: string; text: string }) => Promise<void>;
};
