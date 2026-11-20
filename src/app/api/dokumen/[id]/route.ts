import { Role } from "@prisma/client";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { privateFileRedirect } from "@/lib/storage";
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
  if (document.storageKey.startsWith("http://") || document.storageKey.startsWith("https://")) {
    return Response.json({ pesan: "Berkas lama perlu diunggah ulang ke penyimpanan privat." }, { status: 410 });
  }
  return privateFileRedirect(document.storageKey);
}