import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { columnLabel, mapColumns } from "@/lib/imports/columns";
import { ImportFileError, MAX_FILE_BYTES, parseSheet } from "@/lib/imports/parse";
import { executeImport, hasRunningImport, toRunItem } from "@/lib/imports/run";
import { importTypeSchema } from "@/features/imports/schemas";

// Lists past import runs (without their error lists), newest first, with type/status filters and paging. Admin only.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const type = sp.get("type");
  const status = sp.get("status");
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const where: Prisma.ImportRunWhereInput = {
    ...(type === "LOANS" || type === "ALLOCATIONS" || type === "PAYMENTS" ? { type } : {}),
    ...(status === "RUNNING" || status === "DONE" || status === "FAILED" ? { status } : {}),
  };
  const [runs, total] = await Promise.all([
    prisma.importRun.findMany({ where, omit: { errors: true }, orderBy: [{ startedAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.importRun.count({ where }),
  ]);
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(runs.map((r) => r.createdById))] } }, select: { id: true, name: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const items = runs.map((r) => toRunItem({ ...r, errors: null }, byId.get(r.createdById) ?? null));
  return NextResponse.json({ items, total, page, pageSize });
};

// Imports an uploaded .xlsx/.csv (multipart: `type` + `file`). Returns the run summary; bad rows are in the run's errors, not a failure.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Send the file as multipart form data" }, { status: 400 });
  const type = importTypeSchema.safeParse(form.get("type"));
  if (!type.success) return NextResponse.json({ error: type.error.issues[0].message }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 400 });

  let rows;
  try {
    const sheet = await parseSheet(Buffer.from(await file.arrayBuffer()), file.name);
    const mapped = mapColumns(type.data, sheet.headers, sheet.rows);
    if (mapped.missing.length) {
      const names = mapped.missing.map((f) => columnLabel(f)).join(", ");
      return NextResponse.json({ error: `Missing required column(s): ${names}` }, { status: 400 });
    }
    rows = mapped.rows;
  } catch (e) {
    if (e instanceof ImportFileError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  if (await hasRunningImport()) return NextResponse.json({ error: "Another import is still running. Try again in a minute." }, { status: 409 });

  const run = await executeImport({ type: type.data, fileName: file.name, userId: auth.user.id, rows });
  return NextResponse.json({ run: toRunItem(run, { id: auth.user.id, name: auth.user.name }) }, { status: 201 });
};
