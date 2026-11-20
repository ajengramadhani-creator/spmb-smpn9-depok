import { Role } from "@prisma/client";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { downloadPrivateFile } from "@/lib/blob/storage";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireRole([Role.SISWA, Role.ADMIN, Role.KEPSEK], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: { registration: { include: { student: true } } },
  });
  if (!document) return Response.json({ pesan: "Dokumen tidak ditemukan." }, { status: 404 });
  const isOwner = document.registration.student.userId === user.id;
  if (!isOwner && user.role !== Role.ADMIN) return Response.json({ pesan: "Anda tidak memiliki izin." }, { status: 403 });

  const file = await downloadPrivateFile({ url: document.fileUrl, encryptionIv: document.encryptionIv, encryptionTag: document.encryptionTag });
  const safeFileName = document.fileName.replace(/[\r\n"\\]/g, "_");
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${safeFileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}