import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BatchOptions } from "@/features/batches/types";

// Agencies a batch can be assigned to, for the Assign dialog. Admin and Manager (the Team options endpoint is Admin only).
export const GET = async () => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;
  const agencies = await prisma.agency.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ agencies } satisfies BatchOptions);
};
