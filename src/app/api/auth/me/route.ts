import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

// Returns the signed-in user (role, access and agency come from the DB) for the sidebar and role checks.
export const GET = async () => {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ user: auth.user });
};
