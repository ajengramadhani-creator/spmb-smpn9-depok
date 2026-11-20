import { Role } from "@prisma/client";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { buildRegistrationWorkbook } from "@/server/services/reports";

export async function GET() {
  try {
    await requireRole([Role.ADMIN], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const period = await prisma.academicPeriod.findFirst({
    where: { isActive: true },
    orderBy: { startsAt: "desc" },
    select: { id: true, name: true },
  });
  if (!period) return Response.json({ pesan: "Periode aktif belum tersedia." }, { status: 404 });

  const workbook = await buildRegistrationWorkbook(period.id);
  const body = new Uint8Array(workbook);
  const fileName = `pendaftaran-${period.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
