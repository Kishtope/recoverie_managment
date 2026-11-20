import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRetailerSchema } from "@/features/retailers/schemas";
import { retailerSelect, toRetailerItem } from "../item";

// One retailer with its customer count. Admin only.
export const GET = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const retailer = await prisma.retailer.findUnique({ where: { id }, select: retailerSelect });
  if (!retailer) return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
  return NextResponse.json({ retailer: toRetailerItem(retailer) });
};

// Edits a retailer's details or switches it Active / Inactive. An Inactive retailer gets no new customers but keeps the ones it has. The code
// cannot be changed. Admin only.
export const PATCH = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = updateRetailerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const current = await prisma.retailer.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!current) return NextResponse.json({ error: "Retailer not found" }, { status: 404 });

  const retailer = await prisma.retailer.update({ where: { id }, data: parsed.data, select: retailerSelect });
  const statusChanged = parsed.data.status !== undefined && parsed.data.status !== current.status;
  await logAudit(auth.user.id, statusChanged ? "retailer.status" : "retailer.update", "Retailer", id, statusChanged ? { from: current.status, to: parsed.data.status } : { fields: Object.keys(parsed.data) });
  return NextResponse.json({ retailer: toRetailerItem(retailer) });
};
