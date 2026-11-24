import { isAxiosError } from "axios";
import { api } from "@/lib/axios";

// GETs a file from one of our /api routes (empty and "all" params are left out); returns the blob and the file name the server suggested.
// With responseType "blob" an error body arrives as a blob too, so its { error } message is read here to keep the toast useful.
export const fetchFile = async (path: string, filters: Record<string, string | number | undefined>, fallbackName: string) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== "" && v !== "all"));
  try {
    const res = await api.get<Blob>(path, { params, responseType: "blob" });
    const name = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? fallbackName;
    return { blob: res.data, name };
  } catch (error) {
    if (isAxiosError(error) && error.response?.data instanceof Blob) {
      const message = (JSON.parse(await error.response.data.text().catch(() => "{}")) as { error?: string }).error;
      if (message) throw new Error(message);
    }
    throw error;
  }
};

// Saves a blob to the user's disk through a temporary link. The link is attached to the page (Firefox ignores detached links) and the
// object URL is released only after the browser has started the download; revoking it at once can save an empty file.
export const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
