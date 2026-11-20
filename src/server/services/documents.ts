import { Role, type ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/authorization";

export async function reviewDocument({ documentId, status, note }: { documentId: string; status: ReviewStatus; note?: string }) {
  const reviewer = await requireRole([Role.ADMIN]);
  return prisma.$transaction(async (transaction) => {
    const document = await transaction.document.findUnique({
      where: { id: documentId },
      select: {
        type: true,
        registration: { select: { student: { select: { userId: true } } } },
      },
    });
    if (!document) throw new Error("Berkas tidak ditemukan.");

    const review = await transaction.documentReview.create({
      data: { documentId, reviewerId: reviewer.id, status, note: note?.trim() || null },
    });
    const studentUserId = document.registration.student.userId;
    if (studentUserId) {
      const approved = status === "DITERIMA";
      await transaction.notification.create({
        data: {
          userId: studentUserId,
          title: approved ? "Berkas disetujui" : "Berkas perlu diperbaiki",
          body: approved
            ? `Berkas ${document.type.replaceAll("_", " ").toLowerCase()} Anda telah disetujui.`
            : note?.trim() || "Panitia meminta Anda memeriksa dan mengunggah ulang salah satu berkas persyaratan.",
          status: "MENUNGGU",
        },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: reviewer.id,
        action: "DOCUMENT_REVIEWED",
        entity: "Document",
        entityId: documentId,
        metadata: { status, note: note?.trim() || null },
      },
    });
    return review;
  });
}