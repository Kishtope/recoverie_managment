import type { Role } from "@/generated/prisma/client";

// Agencies, managers and agents an Admin can filter the lists and dashboards by (GET /api/users/options).
export type TeamOptions = {
  agencies: { id: string; name: string }[];
  managers: { id: string; name: string; role: Role }[];
  agents: { id: string; name: string }[];
};
