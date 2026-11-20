import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/authorization";

export async function publishSelection(selectionVersionId: string) {
  await requireRole([Role.ADMIN]);
  return prisma.$transaction(async (transaction) => {
    const version = await transaction.selectionVersion.findUniqueOrThrow({
      where: { id: selectionVersionId },
      include: { results: true },
    });
    if (version.status !== "DRAF") throw new Error("Hanya hasil seleksi berstatus draf yang dapat diterbitkan.");
    const published = await transaction.selectionVersion.update({
      where: { id: selectionVersionId },
      data: { status: "TERBIT", publishedAt: new Date() },
    });
    for (const result of version.results) {
      await transaction.registration.update({
        where: { id: result.registrationId },
        data: { status: result.status === "CADANGAN" ? "CADANGAN" : result.status },
      });
    }
    return published;
  });
}