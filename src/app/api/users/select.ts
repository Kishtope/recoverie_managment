import type { Prisma } from "@/generated/prisma/client";

// Fields the Team list needs; never includes the password hash. (Not in route.ts: route files may only export handlers.)
export const userSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  status: true,
  lastLoginAt: true,
  agency: { select: { id: true, name: true } },
  reportsTo: { select: { id: true, name: true } },
  access: { select: { company: true, branch: true } },
} satisfies Prisma.UserSelect;
