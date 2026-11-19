import { NextResponse } from "next/server";
import { userScopeWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import type { RecruiterOptions } from "@/features/recruiters/types";

// Recruiters the caller may see (for the recruiter filter) plus the escalation rules in force. /api/settings is Admin-only, so Managers
// read the two recruiter rules here instead. Admin and Manager.
export const GET = async () => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const [recruiters, settings] = await Promise.all([
    prisma.user.findMany({
      where: { AND: [{ role: "RECRUITER", status: "ACTIVE" }, userScopeWhere(auth.user)] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getAllSettings(),
  ]);
  const body: RecruiterOptions = {
    recruiters,
    rules: { escalationDays: settings["recruiter.escalationDays"], reminderDays: settings["recruiter.reminderDays"] },
  };
  return NextResponse.json(body);
};
