import type { Role } from "@/generated/prisma/client";

// One row of the Team list as returned by GET /api/users.
export type TeamUser = {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  role: Role;
  status: "ACTIVE" | "DISABLED";
  agency: { id: string; name: string } | null;
  reportsTo: { id: string; name: string } | null;
  access: { company: string; branch: string }[];
  lastLoginAt: string | null;
};

export type TeamListResponse = { items: TeamUser[]; total: number; page: number; pageSize: number };

export type TeamListQuery = { q: string; role: string; branch: string; status: string; page: number; pageSize: number };

// Choices for the create/edit form (Admin only).
export type TeamOptions = {
  agencies: { id: string; name: string }[];
  managers: { id: string; name: string; role: Role }[];
  agents: { id: string; name: string }[];
};
