import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Records who did what (create, role change, disable, export...) for later review.
export const logAudit = (userId: string, action: string, entity: string, entityId?: string, meta?: Prisma.InputJsonValue) =>
  prisma.auditLog.create({ data: { userId, action, entity, entityId, meta } });
