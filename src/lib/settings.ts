import { prisma } from "@/lib/prisma";
import { SETTING_DEFAULTS, SETTING_KEYS, type SettingKey, type SettingValues } from "./settings-defaults";

// Anything with an `appSetting` delegate: the Prisma client, or a fake in tests.
type SettingsDb = { appSetting: { findUnique: (args: { where: { key: string } }) => Promise<{ value: unknown } | null> } };

// One setting's current value: the stored row, or the default when there is none.
export const getSetting = async <K extends SettingKey>(key: K, db: SettingsDb = prisma as unknown as SettingsDb): Promise<SettingValues[K]> => {
  const row = await db.appSetting.findUnique({ where: { key } });
  return row ? (row.value as SettingValues[K]) : SETTING_DEFAULTS[key];
};

// Every setting at once (for the Settings page and routes that need several).
export const getAllSettings = async (): Promise<SettingValues> => {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, stored.has(key) ? stored.get(key) : SETTING_DEFAULTS[key]])) as SettingValues;
};
