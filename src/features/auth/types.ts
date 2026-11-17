import type { Role } from "@/generated/prisma/client";

// Signed-in user returned by /auth/me (role/access come from the DB on every call; never includes the password hash).
export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  agency: { id: string; name: string } | null;
  access: { company: string; branch: string }[];
};

export type AuthResponse = { user: AuthUser };
