// Rupee amount in Indian digit grouping ("₹1,23,456"); "-" when there is no amount.
export const formatInr = (amount: number | null | undefined) => (amount === null || amount === undefined ? "-" : `₹${amount.toLocaleString("en-IN")}`);

// Talk time as "45s", "3m 12s" or "1h 05m"; "-" when unknown.
export const formatDuration = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${String(seconds % 60).padStart(2, "0")}s`.replace(" 00s", "");
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};
