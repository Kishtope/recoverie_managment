import { api } from "@/lib/axios";
import type { TeamOptions } from "../types";

// Fetches agencies, managers and agents for the Admin's filters.
export const getTeamOptions = async () => {
  const { data } = await api.get<TeamOptions>("/users/options");
  return data;
};

// Active agents (and agency owners) the caller may see, for filters and the Reassign dialog.
export const getScopeAgents = async () => {
  const { data } = await api.get<{ agents: { id: string; name: string }[] }>("/users/agents");
  return data.agents;
};
