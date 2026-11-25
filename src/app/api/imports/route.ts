import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { columnLabel, mapColumns, type RawRow } from "@/lib/imports/columns";
import { ImportFileError, MAX_FILE_BYTES, parseSheet } from "@/lib/imports/parse";
import { executeImport, hasRunningImport, previewLoans, toRunItem } from "@/lib/imports/run";
import { runAutoAllocation } from "@/lib/allocation-run";
import { importAutoAllocateSchema, importCompanySchema, importTypeSchema } from "@/features/imports/schemas";
import type { ImportUploadResult } from "@/features/imports/types";

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

// Imports an uploaded .xlsx/.csv (multipart: `type` + `file`, and for Customers files an optional `autoAllocate` JSON {rule, agentIds}). Returns the run
// summary; bad rows are in the run's errors, not a failure. With `autoAllocate`, the cases from this file that nobody holds yet are then split
// between the chosen people; if that step fails the import still stands and the reason comes back as `allocationError`. A Loans file carries an
// Assignment Type per row (Caller / Retailer) and a Retailer Code for Retailer rows; the split is on the run. With `preview=true` (Loans only)
// nothing is saved and the counts, retailer-wise split and first errors come back as `{ preview }` for the Admin to confirm.
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

  // Optional auto-allocation choice (JSON in a form field), checked before anything is written.
  const rawAlloc = form.get("autoAllocate");
  let autoAllocate;
  if (typeof rawAlloc === "string" && rawAlloc) {
    let json: unknown;
    try {
      json = JSON.parse(rawAlloc);
    } catch {
      return NextResponse.json({ error: "Invalid auto-allocation choice" }, { status: 400 });
    }
    const parsedAlloc = importAutoAllocateSchema.safeParse(json);
    if (!parsedAlloc.success) return NextResponse.json({ error: parsedAlloc.error.issues[0]?.message ?? "Invalid auto-allocation choice" }, { status: 400 });
    autoAllocate = parsedAlloc.data;
  }

  let rows: RawRow[];
  try {
    const sheet = await parseSheet(Buffer.from(await file.arrayBuffer()), file.name);
    const mapped = mapColumns(type.data, sheet.headers, sheet.rows);
    // Real-time check when a file is chosen: only the missing required columns come back, nothing is validated or saved.
    if (form.get("columns") === "true") return NextResponse.json({ check: { missing: mapped.missing.map((f) => columnLabel(f)), rows: sheet.rows.length } });
    if (mapped.missing.length) {
      const names = mapped.missing.map((f) => columnLabel(f)).join(", ");
      return NextResponse.json({ error: `Your file is missing: ${names}. Add the column(s) and upload again.` }, { status: 400 });
    }
    rows = mapped.rows;
    // A Customers file may leave out Company and Assignment Type: the company then comes from the upload form and every row is a Retailer row.
    if (type.data === "LOANS") {
      const hasColumn = (field: string) => rows.some((r) => field in r.values);
      if (!hasColumn("company")) {
        const company = importCompanySchema.safeParse(form.get("company"));
        if (!company.success) return NextResponse.json({ error: "Choose the company for this file" }, { status: 400 });
        rows = rows.map((r) => ({ ...r, values: { ...r.values, company: company.data } }));
      }
      if (!hasColumn("assignmentType")) rows = rows.map((r) => ({ ...r, values: { ...r.values, assignmentType: "Retailer" } }));
    }
  } catch (e) {
    if (e instanceof ImportFileError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  if (form.get("preview") === "true") {
    if (type.data !== "LOANS") return NextResponse.json({ error: "Only a Customers file can be checked before uploading" }, { status: 400 });
    return NextResponse.json({ preview: await previewLoans(rows) });
  }

  if (await hasRunningImport()) return NextResponse.json({ error: "Another import is still running. Try again in a minute." }, { status: 409 });

  const run = await executeImport({ type: type.data, fileName: file.name, userId: auth.user.id, rows });
  let allocation: ImportUploadResult["allocation"] = null;
  let allocationError: string | null = null;
  if (autoAllocate && type.data === "LOANS" && run.status === "DONE") {
    try {
      const outcome = await runAutoAllocation({ user: auth.user, ...autoAllocate, dryRun: false, agreementNos: rows.filter((r) => r.values.assignmentType?.trim().toLowerCase() === "caller").map((r) => r.values.agreementNo?.trim()).filter((n): n is string => !!n) });
      if (outcome.ok) allocation = outcome.result;
      else allocationError = outcome.error;
    } catch {
      allocationError = "Cases were imported but could not be allocated. Use Auto-allocate on the Cases page.";
    }
  }

  const body: ImportUploadResult = { run: toRunItem(run, { id: auth.user.id, name: auth.user.name }), allocation, allocationError };
  return NextResponse.json(body, { status: 201 });
};
