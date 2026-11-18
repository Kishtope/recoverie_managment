// One payment on a case as the case page shows it.
export type PaymentItem = {
  id: string;
  amount: number;
  paidOn: string; // "yyyy-MM-dd"
  mode: string | null;
  receiptNo: string | null;
  source: "IMPORT" | "MANUAL";
};

// A digital receipt for one payment (GET /api/payments/[id]/receipt).
export type Receipt = {
  receiptNo: string | null;
  amount: number;
  paidOn: string;
  mode: string | null;
  source: "IMPORT" | "MANUAL";
  customerName: string;
  agreementNo: string;
  company: string;
  branch: string;
  collectedBy: string | null;
};
