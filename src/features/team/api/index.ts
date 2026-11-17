import { api } from "@/lib/axios";
import type { CreateUserInput, UpdateUserInput } from "../schemas";
import type { TeamListQuery, TeamListResponse, TeamOptions, TeamUser } from "../types";

// Fetches one page of users the caller may see; "all" filters are left out of the query.
export const getUsers = async (query: TeamListQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== "all"));
  const { data } = await api.get<TeamListResponse>("/users", { params });
  return data;
};

// Fetches agencies and "reports to" candidates for the form.
export const getTeamOptions = async () => {
  const { data } = await api.get<TeamOptions>("/users/options");
  return data;
};

// Creates a user (Admin only).
export const createUser = async (input: CreateUserInput) => {
  const { data } = await api.post<{ user: TeamUser }>("/users", input);
  return data.user;
};

// Updates a user, including enabling/disabling (Admin only).
export const updateUser = async ({ id, ...input }: UpdateUserInput & { id: string }) => {
  const { data } = await api.patch<{ user: TeamUser }>(`/users/${id}`, input);
  return data.user;
};
