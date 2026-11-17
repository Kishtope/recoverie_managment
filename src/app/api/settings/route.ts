import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings-defaults";
import { updateSettingsSchema } from "@/features/settings/schemas";

// Current value of every setting (stored value or default). Admin only.
export const GET = async () => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getAllSettings());
};

// Saves the settings present in the body (Admin only). Each change is written to the audit log with its old and new value.
export const PUT = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = updateSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });

  const before = await getAllSettings();
  for (const key of SETTING_KEYS) {
    const value = parsed.data[key];
    if (value === undefined) continue;
    // A null JSON value is stored as the JSON null, not as "no row", so the Admin can clear the target on purpose.
    const json = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: json, updatedById: auth.user.id },
      update: { value: json, updatedById: auth.user.id },
    });
    await logAudit(auth.user.id, "setting.update", "AppSetting", key, { from: before[key] ?? null, to: value });
  }
  return NextResponse.json(await getAllSettings());
};
