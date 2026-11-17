import { api } from "@/lib/axios";
import type { SettingValues } from "@/lib/settings-defaults";
import type { UpdateSettingsInput } from "../schemas";

// Fetches every setting (Admin only).
export const getSettings = async () => {
  const { data } = await api.get<SettingValues>("/settings");
  return data;
};

// Saves the settings present in the body and returns all of them.
export const updateSettings = async (input: UpdateSettingsInput) => {
  const { data } = await api.put<SettingValues>("/settings", input);
  return data;
};
