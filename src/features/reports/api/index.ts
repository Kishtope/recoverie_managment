import { api } from "@/lib/axios";
import type { TeamFilters } from "@/features/dashboard/types";

// Downloads the Daily MIS workbook for the dashboard's current filters; returns the file and the name the server suggested.
export const downloadDailyMis = async (filters: TeamFilters) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== "all"));
  const res = await api.get<Blob>("/reports/daily-mis", { params, responseType: "blob" });
  const name = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? "daily-mis.xlsx";
  return { blob: res.data, name };
};
