import { api } from "@/lib/axios";
import type { DecideSettlementInput, RequestSettlementInput } from "../schemas";

// Asks for a settlement on a case (agent / recruiter who owns it).
export const requestSettlement = async ({ loanId, ...body }: RequestSettlementInput & { loanId: string }) => {
  const { data } = await api.post<{ id: string }>(`/loans/${loanId}/settlements`, body);
  return data;
};

// Approves or rejects a pending settlement (Manager within the Admin's limit, or Admin).
export const decideSettlement = async ({ settlementId, ...body }: DecideSettlementInput & { settlementId: string }) => {
  const { data } = await api.post<{ ok: true }>(`/settlements/${settlementId}/decision`, body);
  return data;
};
