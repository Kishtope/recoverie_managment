import { api } from "@/lib/axios";
import type { AgentDashboard } from "../types";

// Fetches the signed-in agent's dashboard numbers.
export const getAgentDashboard = async () => {
  const { data } = await api.get<AgentDashboard>("/dashboard/agent");
  return data;
};
