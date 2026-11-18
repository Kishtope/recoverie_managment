import { api } from "@/lib/axios";
import type { SetTargetInput } from "../schemas";
import type { ScorecardsResponse } from "../types";

// Fetches one month's scorecards for the caller's scope.
export const getScorecards = async (month: string) => {
  const { data } = await api.get<ScorecardsResponse>("/scorecards", { params: { month } });
  return data;
};

// Sets or clears a caller's monthly goals.
export const setTarget = async (body: SetTargetInput) => {
  const { data } = await api.put<{ ok: true }>("/targets", body);
  return data;
};

// Downloads the month's scorecard workbook; returns the file and the name the server suggested.
export const downloadScorecard = async (month: string) => {
  const res = await api.get<Blob>("/scorecards/export", { params: { month }, responseType: "blob" });
  const name = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? `caller-scorecard-${month}.xlsx`;
  return { blob: res.data, name };
};
