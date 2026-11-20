import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/authorization";

export async function publishSelection(selectionVersionId: string) {
  const admin = await requireRole([Role.ADMIN]);
  return prisma.$transaction(async (transaction) => {
    const version = await transaction.selectionVersion.findUnique({
      where: { id: selectionVersionId },
      include: {
        results: { include: { registration: { select: { id: true, registrationNo: true, student: { select: { userId: true } } } } } },
        academicPeriod: { select: { name: true } },
      },
    });
    if (!version) throw new Error("Versi seleksi tidak ditemukan.");
    if (version.status !== "DRAF") throw new Error("Hanya hasil seleksi berstatus draf yang dapat diterbitkan.");
    if (!version.results.length) throw new Error("Versi seleksi tidak memiliki hasil untuk diterbitkan.");

    await transaction.selectionVersion.updateMany({
      where: { academicPeriodId: version.academicPeriodId, status: "TERBIT", id: { not: version.id } },
      data: { status: "DIBATALKAN" },
    });
    const publishedAt = new Date();
    const published = await transaction.selectionVersion.updateMany({
      where: { id: version.id, status: "DRAF" },
      data: { status: "TERBIT", publishedAt },
    });
    if (published.count !== 1) throw new Error("Versi seleksi telah diperbarui oleh petugas lain.");

    for (const result of version.results) {
      await transaction.registration.update({
        where: { id: result.registrationId },
        data: { status: result.status },
      });
      const userId = result.registration.student.userId;
      if (userId) {
        const resultLabel = result.status === "DITERIMA" ? "diterima" : result.status === "CADANGAN" ? "menjadi peserta cadangan" : "belum lulus";
        await transaction.notification.create({
          data: {
            userId,
            title: "Hasil seleksi SPMB diterbitkan",
            body: `Hasil seleksi ${version.academicPeriod.name} untuk ${result.registration.registrationNo}: ${resultLabel}.`,
            status: "MENUNGGU",
          },
        });
      }
    }
    await transaction.auditLog.create({
      data: {
        actorId: admin.id,
        action: "SELECTION_PUBLISHED",
        entity: "SelectionVersion",
        entityId: version.id,
        metadata: { version: version.version, resultCount: version.results.length },
      },
    });
    return transaction.selectionVersion.findUniqueOrThrow({ where: { id: version.id } });
  });
}