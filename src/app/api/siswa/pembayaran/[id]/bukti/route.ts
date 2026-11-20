import { Role } from "@prisma/client";
import { privateFileRedirect } from "@/lib/storage";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const { id } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id, invoice: { registration: { student: { userId: user.id } } } },
    select: { rawResponse: true },
  });
  const evidenceKey = payment?.rawResponse && typeof payment.rawResponse === "object" && "evidenceKey" in payment.rawResponse
    ? payment.rawResponse.evidenceKey
    : null;
  if (typeof evidenceKey !== "string") return Response.json({ pesan: "Bukti pembayaran tidak ditemukan." }, { status: 404 });
  return privateFileRedirect(evidenceKey);
}
