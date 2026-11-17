// Rupee amount in Indian digit grouping ("₹1,23,456"); "-" when there is no amount.
export const formatInr = (amount: number | null | undefined) => (amount === null || amount === undefined ? "-" : `₹${amount.toLocaleString("en-IN")}`);
