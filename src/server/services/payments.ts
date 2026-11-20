import { Role, type PaymentStatus, type Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

export async function recordPaymentResult({ invoiceId, provider, providerRef, amount, status, rawResponse }: {
  invoiceId: string;
  provider: string;
  providerRef?: string;
  amount: string;
  status: PaymentStatus;
  rawResponse?: Prisma.InputJsonValue;
}) {
  await requireRole([Role.ADMIN]);
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.create({
      data: { invoiceId, provider, providerRef, amount, status, paidAt: status === "BERHASIL" ? new Date() : null, rawResponse },
    });
    if (status === "BERHASIL") await transaction.invoice.update({ where: { id: invoiceId }, data: { status: "LUNAS" } });
    return payment;
  });
}