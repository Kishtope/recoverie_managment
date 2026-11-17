import { z } from "zod";

// Body of POST /api/notifications/read: the ids to mark read; leave it out to mark every unread notification read.
export const markReadSchema = z.object({ ids: z.array(z.string().min(1)).max(200).optional() });
export type MarkReadInput = z.infer<typeof markReadSchema>;
