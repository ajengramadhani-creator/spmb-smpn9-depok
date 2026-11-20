import { Role } from "@prisma/client";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { privateFileRedirect } from "@/lib/storage";
import { prisma } from "@/lib/db/prisma";

function getEvidenceKey(rawResponse: unknown) {
  if (!rawResponse || typeof rawResponse !== "object" || Array.isArray(rawResponse)) return null;
  const key = "evidenceKey" in rawResponse ? rawResponse.evidenceKey : null;
  return typeof key === "string" && key.length > 0 ? key : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireRole([Role.ADMIN], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  if (user.role !== Role.ADMIN) return Response.json({ pesan: "Anda tidak memiliki izin." }, { status: 403 });

  const { id } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id, provider: "MANUAL_TRANSFER" },
    select: { rawResponse: true },
  });
  const evidenceKey = payment ? getEvidenceKey(payment.rawResponse) : null;
  if (!evidenceKey) return Response.json({ pesan: "Bukti transfer tidak ditemukan." }, { status: 404 });
  return privateFileRedirect(evidenceKey);
}
