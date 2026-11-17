import { api } from "@/lib/axios";
import type { MarkReadInput } from "../schemas";
import type { NotificationsResponse } from "../types";

// The caller's latest notifications and the unread count.
export const getNotifications = async () => {
  const { data } = await api.get<NotificationsResponse>("/notifications");
  return data;
};

// Marks the given notifications read, or every unread one when `ids` is left out.
export const markNotificationsRead = async (input: MarkReadInput) => {
  const { data } = await api.post<{ marked: number }>("/notifications/read", input);
  return data;
};
