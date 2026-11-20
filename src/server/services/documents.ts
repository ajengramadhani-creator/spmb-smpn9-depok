import { Role, type ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import { requireRole } from "@/lib/auth/authorization";

export async function reviewDocument({ documentId, status, note }: { documentId: string; status: ReviewStatus; note?: string }) {
  const reviewer = await requireRole([Role.ADMIN]);
  const review = await prisma.documentReview.create({
    data: { documentId, reviewerId: reviewer.id, status, note },
    include: { document: { include: { registration: { include: { student: true } } } } },
  });
  const studentUserId = review.document.registration.student.userId;
  if ((status === "DITOLAK" || status === "PERLU_PERBAIKAN") && studentUserId) {
    await prisma.notification.create({
      data: {
        userId: studentUserId,
        title: "Berkas perlu diperbaiki",
        body: note?.trim() || "Panitia meminta Anda memeriksa dan mengunggah ulang salah satu berkas persyaratan.",
        status: "MENUNGGU",
      },
    });
  }
  await writeAuditLog({ actorId: reviewer.id, action: "DOKUMEN_DITINJAU", entity: "Document", entityId: documentId, metadata: { status, note } });
  return review;
}