import { Role } from "@prisma/client";
import { privateFileRedirect } from "@/lib/storage";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  let user;
  try {
    user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const { id, attachmentId } = await params;
  const attachment = await prisma.announcementAttachment.findFirst({
    where: {
      id: attachmentId,
      announcementId: id,
      announcement: {
        publishedAt: { lte: new Date() },
        OR: [
          { academicPeriodId: null },
          { academicPeriod: { registrations: { some: { student: { userId: user.id } } } } },
          { academicPeriod: { isActive: true } },
        ],
      },
    },
    select: { storageKey: true },
  });
  if (!attachment) return Response.json({ pesan: "Lampiran tidak ditemukan." }, { status: 404 });
  return privateFileRedirect(attachment.storageKey);
}
