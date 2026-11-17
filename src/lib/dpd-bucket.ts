export const DPD_BUCKETS = ["0-30", "31-60", "61-90", "90+", "none"] as const;
export type DpdBucket = (typeof DPD_BUCKETS)[number];

// Display labels for the buckets ("none" = the loan has no DPD value).
export const DPD_BUCKET_LABELS: Record<DpdBucket, string> = { "0-30": "0–30", "31-60": "31–60", "61-90": "61–90", "90+": "90+", none: "No DPD" };

// Which days-past-due bucket a loan falls in; a missing DPD is its own bucket so totals still add up.
export const dpdBucket = (dpd: number | null | undefined): DpdBucket => {
  if (dpd === null || dpd === undefined) return "none";
  if (dpd <= 30) return "0-30";
  if (dpd <= 60) return "31-60";
  if (dpd <= 90) return "61-90";
  return "90+";
};

// Prisma `where` on Loan.dpd for a bucket filter; unknown / "all" adds no condition.
export const dpdBucketWhere = (bucket: string | null | undefined) => {
  switch (bucket) {
    case "0-30":
      return { dpd: { gte: 0, lte: 30 } };
    case "31-60":
      return { dpd: { gte: 31, lte: 60 } };
    case "61-90":
      return { dpd: { gte: 61, lte: 90 } };
    case "90+":
      return { dpd: { gte: 91 } };
    case "none":
      return { dpd: null };
    default:
      return {};
  }
};
