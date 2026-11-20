import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type AuditEntry = {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
};

export function writeAuditLog(entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      metadata: entry.metadata,
      ipAddress: entry.ipAddress,
    },
  });
}