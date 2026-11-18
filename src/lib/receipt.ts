// Receipt number for a payment recorded in the app: RCP-yyyymmdd-XXXXXX. Random part from the crypto source; no look-alike characters.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const makeReceiptNo = (day: string, random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))) =>
  `RCP-${day.replaceAll("-", "")}-${[...random(6)].map((b) => CHARS[b % CHARS.length]).join("")}`;
