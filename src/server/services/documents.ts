import { Role, type ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import { requireRole } from "@/lib/auth/authorization";

export async function reviewDocument({ documentId, status, note }: { documentId: string; status: ReviewStatus; note?: string }) {
  const reviewer = await requireRole([Role.ADMIN]);
  const review = await prisma.documentReview.create({
    data: { documentId, reviewerId: reviewer.id, status, note },
    include: { document: true },
  });
  await writeAuditLog({ actorId: reviewer.id, action: "DOKUMEN_DITINJAU", entity: "Document", entityId: documentId, metadata: { status, note } });
  return review;
}