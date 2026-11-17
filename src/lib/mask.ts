// Hides the middle of a mobile number for display ("9812345621" -> "98XXXXXX21"); the full number never leaves the server.
export const maskMobile = (mobile: string | null | undefined) => {
  if (!mobile) return null;
  if (mobile.length <= 4) return "X".repeat(mobile.length);
  return `${mobile.slice(0, 2)}${"X".repeat(mobile.length - 4)}${mobile.slice(-2)}`;
};
