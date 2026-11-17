import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { mapStaffSheet, matchStaff } from "@/lib/cutover";
import { ImportFileError, MAX_FILE_BYTES, parseSheet } from "@/lib/imports/parse";
import { prisma } from "@/lib/prisma";
import type { StaffCheckResponse } from "@/features/cutover/types";

// Checks an uploaded list of the old site's staff (.xlsx / .csv with a Name column, optional Mobile and Role) against the users in the app.
// Read-only: nothing is written and the file is not kept. Each row is matched by mobile, else by a name only one user has. Admin only.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 400 });

  let sheet;
  try {
    sheet = await parseSheet(Buffer.from(await file.arrayBuffer()), file.name);
  } catch (e) {
    if (e instanceof ImportFileError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const staff = mapStaffSheet(sheet.headers, sheet.rows);
  if (staff.missing) return NextResponse.json({ error: "Missing required column: Name" }, { status: 400 });

  const users = await prisma.user.findMany({ select: { id: true, name: true, mobile: true, status: true } });
  const items = matchStaff(staff.rows, users);
  const count = (status: string) => items.filter((i) => i.status === status).length;
  const body: StaffCheckResponse = {
    summary: { total: items.length, matched: count("matched"), noAccount: count("no-account"), disabled: count("disabled"), ambiguous: count("ambiguous") },
    items,
  };
  return NextResponse.json(body);
};
