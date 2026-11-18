// One settlement offer on a case as the case page shows it.
export type SettlementItem = {
  id: string;
  requestedAmount: number;
  waiverAmount: number;
  waiverPct: number;
  remarks: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: string | null; // name
  decidedBy: string | null; // name
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  // True when the signed-in user may approve it (an Admin, or a Manager within the Admin's limit).
  canApprove: boolean;
  // True when the signed-in user may reject it (Admin or Manager).
  canReject: boolean;
};
