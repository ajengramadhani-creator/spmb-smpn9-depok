"use server";

import { InvoiceStatus, PaymentStatus, Prisma, RegistrationStatus, ReviewStatus, Role } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { reviewDocument } from "@/server/services/documents";

export type AdminActionState = { status: "success" | "error"; message: string } | null;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseJakartaDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute) - 7 * 60 * 60 * 1000);
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    local.getUTCFullYear() !== year ||
    local.getUTCMonth() !== month - 1 ||
    local.getUTCDate() !== day ||
    local.getUTCHours() !== hour ||
    local.getUTCMinutes() !== minute
  ) return null;
  return date;
}

export async function reviewDocumentAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireRole([Role.ADMIN]);
  const parsed = z.object({
    documentId: z.string().min(1),
    status: z.enum([ReviewStatus.DITERIMA, ReviewStatus.PERLU_PERBAIKAN]),
    note: z.string().trim().max(1000).optional(),
  }).safeParse({
    documentId: readText(formData, "documentId"),
    status: readText(formData, "status"),
    note: readText(formData, "note"),
  });
  if (!parsed.success) return { status: "error", message: "Tindakan peninjauan tidak valid." };
  if (parsed.data.status === ReviewStatus.PERLU_PERBAIKAN && !parsed.data.note) {
    return { status: "error", message: "Catatan wajib diisi saat meminta perbaikan berkas." };
  }

  await reviewDocument(parsed.data);
  return { status: "success", message: "Status berkas berhasil diperbarui dan siswa telah diberi notifikasi." };
}

export async function verifyManualPaymentAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const paymentId = readText(formData, "paymentId");
  if (!paymentId) return { status: "error", message: "Pembayaran tidak valid." };

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, provider: "MANUAL_TRANSFER", status: PaymentStatus.MENUNGGU },
    select: {
      id: true,
      invoiceId: true,
      amount: true,
      invoice: { select: { invoiceNo: true, status: true, registration: { select: { student: { select: { userId: true } } } } } },
    },
  });
  if (!payment) return { status: "error", message: "Pembayaran tidak ditemukan atau sudah ditinjau." };
  if (payment.invoice.status !== InvoiceStatus.MENUNGGU) {
    return { status: "error", message: "Tagihan tidak sedang menunggu konfirmasi pembayaran." };
  }

  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.payment.updateMany({
      where: { id: payment.id, provider: "MANUAL_TRANSFER", status: PaymentStatus.MENUNGGU },
      data: { status: PaymentStatus.BERHASIL, paidAt: new Date() },
    });
    if (updated.count !== 1) throw new Error("Pembayaran telah diperbarui oleh petugas lain.");

    const updatedInvoice = await transaction.invoice.updateMany({
      where: { id: payment.invoiceId, status: InvoiceStatus.MENUNGGU },
      data: { status: InvoiceStatus.LUNAS },
    });
    if (updatedInvoice.count !== 1) throw new Error("Tagihan telah diperbarui oleh petugas lain.");
    const userId = payment.invoice.registration.student.userId;
    if (userId) {
      await transaction.notification.create({
        data: {
          userId,
          title: "Pembayaran berhasil",
          body: `Pembayaran tagihan ${payment.invoice.invoiceNo} telah dikonfirmasi.`,
          status: "MENUNGGU",
        },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: admin.id,
        action: "PAYMENT_RECORDED",
        entity: "Payment",
        entityId: payment.id,
        metadata: { invoiceNo: payment.invoice.invoiceNo, amount: payment.amount.toString(), status: PaymentStatus.BERHASIL },
      },
    });
  });
  return { status: "success", message: "Pembayaran dikonfirmasi dan siswa telah diberi notifikasi." };
}

export async function savePaymentSettingsAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = z.object({
    amount: z.coerce.number().finite().min(0).max(1_000_000_000),
    isEnabled: z.boolean(),
    bankAccountId: z.string().optional(),
    bankName: z.string().trim().min(2).max(100),
    accountName: z.string().trim().min(2).max(120),
    accountNumber: z.string().trim().min(4).max(64),
    instructions: z.string().trim().max(1000).optional(),
  }).safeParse({
    amount: readText(formData, "amount"),
    isEnabled: formData.get("isEnabled") === "on",
    bankAccountId: readText(formData, "bankAccountId") || undefined,
    bankName: readText(formData, "bankName"),
    accountName: readText(formData, "accountName"),
    accountNumber: readText(formData, "accountNumber"),
    instructions: readText(formData, "instructions") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Lengkapi biaya dan informasi rekening dengan benar." };

  const period = await prisma.academicPeriod.findFirst({
    where: { isActive: true },
    orderBy: { startsAt: "desc" },
    select: { id: true },
  });
  if (!period) return { status: "error", message: "Periode aktif belum tersedia." };
  const { amount, bankAccountId, ...settings } = parsed.data;

  await prisma.$transaction(async (transaction) => {
    await transaction.paymentSetting.upsert({
      where: { academicPeriodId: period.id },
      create: { academicPeriodId: period.id, amount: new Prisma.Decimal(amount), isEnabled: settings.isEnabled },
      update: { amount: new Prisma.Decimal(amount), isEnabled: settings.isEnabled },
    });

    const bankData = {
      bankName: settings.bankName,
      accountName: settings.accountName,
      accountNumber: settings.accountNumber,
      instructions: settings.instructions || null,
      isActive: true,
    };
    if (bankAccountId) {
      const updated = await transaction.bankAccount.updateMany({ where: { id: bankAccountId }, data: bankData });
      if (updated.count !== 1) throw new Error("Rekening tujuan tidak ditemukan.");
    } else {
      await transaction.bankAccount.create({ data: bankData });
    }
    await transaction.auditLog.create({
      data: {
        actorId: admin.id,
        action: "PAYMENT_SETTINGS_UPDATED",
        entity: "PaymentSetting",
        entityId: period.id,
        metadata: { amount: String(amount), isEnabled: settings.isEnabled },
      },
    });
  });
  return { status: "success", message: "Pengaturan biaya dan rekening berhasil disimpan." };
}

export async function createManualRegistrationAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = z.object({
    fullName: z.string().trim().min(3).max(150),
    nationalId: z.string().regex(/^\d{16}$/),
    nisn: z.string().regex(/^\d{10}$/),
    phone: z.string().trim().min(9).max(32),
    trackId: z.string().min(1),
  }).safeParse({
    fullName: readText(formData, "fullName"),
    nationalId: readText(formData, "nationalId"),
    nisn: readText(formData, "nisn"),
    phone: readText(formData, "phone"),
    trackId: readText(formData, "trackId"),
  });
  if (!parsed.success) return { status: "error", message: "Periksa kembali nama, NIK, NISN, nomor telepon, dan jalur." };

  const period = await prisma.academicPeriod.findFirst({
    where: { isActive: true },
    orderBy: { startsAt: "desc" },
    select: { id: true, startsAt: true },
  });
  if (!period) return { status: "error", message: "Periode aktif belum tersedia." };
  const track = await prisma.track.findFirst({ where: { id: parsed.data.trackId, academicPeriodId: period.id, isActive: true }, select: { id: true } });
  if (!track) return { status: "error", message: "Jalur pendaftaran tidak tersedia pada periode aktif." };

  const duplicate = await prisma.student.findFirst({
    where: { OR: [{ nationalId: parsed.data.nationalId }, { nisn: parsed.data.nisn }] },
    select: { id: true },
  });
  if (duplicate) return { status: "error", message: "NIK atau NISN sudah terdaftar." };

  try {
    await prisma.$transaction(async (transaction) => {
      const year = period.startsAt.getUTCFullYear();
      const sequence = await transaction.registrationSequence.upsert({
        where: { year },
        create: { year, value: 1 },
        update: { value: { increment: 1 } },
      });
      const student = await transaction.student.create({
        data: {
          fullName: parsed.data.fullName,
          nationalId: parsed.data.nationalId,
          nisn: parsed.data.nisn,
          phone: parsed.data.phone,
        },
      });
      const registration = await transaction.registration.create({
        data: {
          registrationNo: `SPMB${String(year).slice(-2)}-${String(sequence.value).padStart(5, "0")}`,
          studentId: student.id,
          academicPeriodId: period.id,
          trackId: track.id,
          status: RegistrationStatus.DRAF,
        },
      });
      await transaction.auditLog.create({
        data: { actorId: admin.id, action: "REGISTRATION_CREATED_MANUALLY", entity: "Registration", entityId: registration.id },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "NIK, NISN, atau nomor pendaftaran sudah digunakan." };
    }
    throw error;
  }
  return { status: "success", message: "Pendaftaran manual berhasil ditambahkan." };
}

export async function saveAnnouncementAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = z.object({
    id: z.string().optional(),
    title: z.string().trim().min(3).max(180),
    body: z.string().trim().min(3).max(10000),
    type: z.enum(["UMUM", "JADWAL", "HASIL", "PEMBAYARAN"]),
    academicPeriodId: z.string().optional(),
    publishAt: z.string().optional(),
  }).safeParse({
    id: readText(formData, "id") || undefined,
    title: readText(formData, "title"),
    body: readText(formData, "body"),
    type: readText(formData, "type"),
    academicPeriodId: readText(formData, "academicPeriodId") || undefined,
    publishAt: readText(formData, "publishAt") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Lengkapi judul, isi, jenis, dan waktu tayang dengan benar." };

  const publishedAt = parsed.data.publishAt ? parseJakartaDateTime(parsed.data.publishAt) : null;
  if (parsed.data.publishAt && !publishedAt) return { status: "error", message: "Waktu tayang tidak valid." };
  if (parsed.data.academicPeriodId) {
    const period = await prisma.academicPeriod.findUnique({ where: { id: parsed.data.academicPeriodId }, select: { id: true } });
    if (!period) return { status: "error", message: "Periode pengumuman tidak ditemukan." };
  }

  await prisma.$transaction(async (transaction) => {
    const previous = parsed.data.id
      ? await transaction.announcement.findUnique({ where: { id: parsed.data.id }, select: { publishedAt: true } })
      : null;
    if (parsed.data.id && !previous) throw new Error("Pengumuman tidak ditemukan.");
    const announcement = parsed.data.id
      ? await transaction.announcement.update({
          where: { id: parsed.data.id },
          data: {
            title: parsed.data.title,
            body: parsed.data.body,
            type: parsed.data.type,
            academicPeriodId: parsed.data.academicPeriodId ?? null,
            publishedAt,
          },
        })
      : await transaction.announcement.create({
          data: {
            title: parsed.data.title,
            body: parsed.data.body,
            type: parsed.data.type,
            academicPeriodId: parsed.data.academicPeriodId ?? null,
            publishedAt,
          },
        });

    const isNewPublication = publishedAt !== null && publishedAt <= new Date() && (!previous?.publishedAt || previous.publishedAt > new Date());
    if (isNewPublication) {
      const registrations = await transaction.registration.findMany({
        where: {
          ...(parsed.data.academicPeriodId ? { academicPeriodId: parsed.data.academicPeriodId } : {}),
          student: { userId: { not: null } },
        },
        select: { student: { select: { userId: true } } },
      });
      const userIds = [...new Set(registrations.flatMap(({ student }) => student.userId ? [student.userId] : []))];
      if (userIds.length) {
        await transaction.notification.createMany({
          data: userIds.map((userId) => ({
            userId,
            title: `Pengumuman: ${announcement.title}`,
            body: announcement.body.slice(0, 500),
            status: "MENUNGGU",
          })),
        });
      }
    }

    await transaction.auditLog.create({
      data: {
        actorId: admin.id,
        action: "ANNOUNCEMENT_SAVED",
        entity: "Announcement",
        entityId: announcement.id,
        metadata: { type: announcement.type, publishedAt: announcement.publishedAt?.toISOString() ?? null },
      },
    });
  });
  return { status: "success", message: publishedAt ? "Pengumuman berhasil dijadwalkan atau diterbitkan." : "Draf pengumuman berhasil disimpan." };
}
