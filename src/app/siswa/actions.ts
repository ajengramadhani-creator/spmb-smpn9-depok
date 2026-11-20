"use server";

import { InvoiceStatus, Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { createPrivateFileUrl } from "@/lib/storage";
import { gradeParticipant } from "@/server/services/assessment";
import {
  gradesDataSchema,
  guardianDataSchema,
  personalDataSchema,
  registrationStageSchemas,
  schoolDataSchema,
  trackDataSchema,
} from "@/lib/validators/registration";
import { midtransProvider } from "@/server/services/payment-providers";

const profileSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(9).max(24),
  address: z.string().trim().min(8).max(500),
});
const testAnswerSchema = z.object({
  participantId: z.string().min(1).max(128),
  questionId: z.string().min(1).max(128),
  optionId: z.string().min(1).max(128).optional(),
  flagged: z.boolean().optional(),
});

async function studentRegistration(userId: string) {
  return prisma.registration.findFirst({
    where: { student: { userId } },
    select: { id: true, submittedAt: true },
  });
}

export async function saveRegistrationStage(stage: number, values: unknown) {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  if (!Number.isInteger(stage) || stage < 0 || stage >= registrationStageSchemas.length) {
    return { ok: false, message: "Tahap pendaftaran tidak valid." };
  }
  const existing = await studentRegistration(user.id);
  if (existing?.submittedAt) return { ok: false, message: "Formulir yang sudah dikirim tidak dapat diubah." };

  const parsed = registrationStageSchemas[stage].safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Periksa kembali data Anda." };
  }
  const previous = await prisma.registrationDraft.findUnique({ where: { userId: user.id } });
  const previousData = previous?.data && typeof previous.data === "object" && !Array.isArray(previous.data)
    ? previous.data
    : {};
  const draftData = { ...previousData, [String(stage)]: parsed.data } satisfies Prisma.InputJsonObject;
  const savedSections = new Set(previous?.savedSections ?? []);
  savedSections.add(String(stage));
  await prisma.registrationDraft.upsert({
    where: { userId: user.id },
    create: { userId: user.id, data: draftData, savedSections: [...savedSections] },
    update: { data: draftData, savedSections: [...savedSections] },
  });
  revalidatePath("/siswa");
  return { ok: true, message: "Draf bagian ini berhasil disimpan." };
}

export async function submitRegistration() {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  const existing = await studentRegistration(user.id);
  if (existing?.submittedAt) return { ok: false, message: "Formulir sudah dikirim." };
  const draft = await prisma.registrationDraft.findUnique({ where: { userId: user.id } });
  if (!draft || registrationStageSchemas.some((_, index) => !draft.savedSections.includes(String(index)))) {
    return { ok: false, message: "Simpan seluruh lima bagian sebelum mengirim formulir." };
  }
  const values = draft.data && typeof draft.data === "object" && !Array.isArray(draft.data) ? draft.data : {};
  const personalResult = personalDataSchema.safeParse(values["0"]);
  const guardianResult = guardianDataSchema.safeParse(values["1"]);
  const schoolResult = schoolDataSchema.safeParse(values["2"]);
  const gradesResult = gradesDataSchema.safeParse(values["3"]);
  const trackResult = trackDataSchema.safeParse(values["4"]);
  const invalid = [personalResult, guardianResult, schoolResult, gradesResult, trackResult].find((result) => !result.success);
  if (invalid && !invalid.success) return { ok: false, message: invalid.error.issues[0]?.message ?? "Periksa kembali formulir." };
  if (!personalResult.success || !guardianResult.success || !schoolResult.success || !gradesResult.success || !trackResult.success) {
    return { ok: false, message: "Periksa kembali data pada formulir." };
  }
  const personal = personalResult.data;
  const guardian = guardianResult.data;
  const school = schoolResult.data;
  const gradeData = gradesResult.data;
  const track = trackResult.data;

  const selectedTrack = await prisma.track.findFirst({
    where: { id: track.trackId, isActive: true, academicPeriod: { isActive: true } },
    include: { academicPeriod: { include: { paymentSetting: true } } },
  });
  if (!selectedTrack) return { ok: false, message: "Jalur pendaftaran tidak tersedia pada periode aktif." };

  const result = await prisma.$transaction(async (transaction) => {
    const counter = await transaction.registrationSequence.upsert({
      where: { year: 2027 },
      create: { year: 2027, value: 1 },
      update: { value: { increment: 1 } },
    });
    const student = await transaction.student.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName: personal.fullName,
        nisn: personal.nisn,
        nationalId: personal.nationalId,
        birthPlace: personal.birthPlace,
        birthDate: new Date(personal.birthDate),
        gender: personal.gender,
        phone: personal.phone,
        address: personal.address,
      },
      update: {
        fullName: personal.fullName,
        nisn: personal.nisn,
        nationalId: personal.nationalId,
        birthPlace: personal.birthPlace,
        birthDate: new Date(personal.birthDate),
        gender: personal.gender,
        phone: personal.phone,
        address: personal.address,
      },
    });
    await transaction.parentGuardian.deleteMany({ where: { studentId: student.id } });
    await transaction.parentGuardian.create({
      data: {
        studentId: student.id,
        name: guardian.name,
        relationship: guardian.relationship,
        phone: guardian.phone,
        email: guardian.email || null,
        occupation: guardian.occupation,
        isPrimary: true,
      },
    });
    await transaction.schoolOrigin.upsert({
      where: { studentId: student.id },
      create: { studentId: student.id, ...school },
      update: school,
    });
    await transaction.reportGrade.deleteMany({ where: { studentId: student.id } });
    await transaction.reportGrade.createMany({
      data: gradeData.grades.map((grade) => ({ studentId: student.id, ...grade })),
    });
    const registration = await transaction.registration.create({
      data: {
        registrationNo: `SPMB27-${String(counter.value).padStart(5, "0")}`,
        studentId: student.id,
        academicPeriodId: selectedTrack.academicPeriodId,
        trackId: selectedTrack.id,
        status: "MENUNGGU_VERIFIKASI",
        submittedAt: new Date(),
      },
    });
    const setting = selectedTrack.academicPeriod.paymentSetting;
    if (setting?.isEnabled) {
      await transaction.invoice.create({
        data: {
          registrationId: registration.id,
          invoiceNo: `INV/2027/${String(counter.value).padStart(5, "0")}`,
          amount: setting.amount,
          dueAt: selectedTrack.academicPeriod.endsAt,
        },
      });
    }
    return registration;
  });
  await prisma.registrationDraft.delete({ where: { userId: user.id } });
  await prisma.notification.create({
    data: { userId: user.id, title: "Formulir berhasil dikirim", body: `Pendaftaran ${result.registrationNo} telah dikirim dan menunggu verifikasi panitia.`, status: "TERKIRIM", sentAt: new Date() },
  });
  revalidatePath("/siswa");
  return { ok: true, message: "Formulir pendaftaran berhasil dikirim." };
}

export async function updateStudentProfile(values: { fullName: string; phone: string; address: string }) {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Nama, nomor telepon, atau alamat belum valid." };
  }
  const profile = parsed.data;
  await prisma.student.updateMany({
    where: { userId: user.id },
    data: profile,
  });
  await prisma.user.update({ where: { id: user.id }, data: { name: profile.fullName } });
  revalidatePath("/siswa");
  return { ok: true, message: "Profil berhasil diperbarui." };
}

export async function updateStudentPassword(currentPassword: string, newPassword: string) {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 200) {
    return { ok: false, message: "Kata sandi baru harus terdiri dari 12–200 karakter." };
  }
  const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await bcrypt.compare(currentPassword, account.passwordHash))) {
    return { ok: false, message: "Kata sandi saat ini tidak sesuai." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  return { ok: true, message: "Kata sandi berhasil diganti." };
}

export async function markAnnouncementRead(announcementId: string) {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  if (typeof announcementId !== "string" || announcementId.length > 128) return { ok: false, message: "Pengumuman tidak ditemukan." };
  const visible = await prisma.announcement.findFirst({
    where: { id: announcementId, publishedAt: { lte: new Date() } },
    select: { id: true },
  });
  if (!visible) return { ok: false, message: "Pengumuman tidak ditemukan." };
  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId: user.id } },
    create: { announcementId, userId: user.id },
    update: {},
  });
  return { ok: true };
}

export async function markNotificationsRead(notificationId?: string) {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  if (notificationId !== undefined && (typeof notificationId !== "string" || notificationId.length > 128)) {
    return { ok: false, message: "Notifikasi tidak ditemukan." };
  }
  await prisma.notification.updateMany({
    where: { userId: user.id, status: "MENUNGGU", ...(notificationId ? { id: notificationId } : {}) },
    data: { status: "TERKIRIM", sentAt: new Date() },
  });
  revalidatePath("/siswa");
  return { ok: true };
}

export async function refreshInvoiceStatus(invoiceId: string) {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  if (typeof invoiceId !== "string" || invoiceId.length > 128) return { ok: false, message: "Tagihan tidak ditemukan." };
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, registration: { student: { userId: user.id } } },
    include: { payments: { where: { status: "MENUNGGU" }, orderBy: { createdAt: "desc" }, take: 1 }, registration: { include: { student: true } } },
  });
  if (!invoice) return { ok: false, message: "Tagihan tidak ditemukan." };
  const payment = invoice.payments[0];
  if (payment?.provider === "MIDTRANS_SANDBOX" && payment.providerRef) {
    let status: "BERHASIL" | "MENUNGGU" | "GAGAL";
    try {
      status = await midtransProvider.checkStatus(payment.providerRef);
    } catch {
      return { ok: false, message: "Status dari penyedia pembayaran belum dapat diperiksa. Coba lagi nanti." };
    }
    if (status !== "MENUNGGU") {
      await prisma.$transaction(async (transaction) => {
        const updated = await transaction.payment.updateMany({
          where: { id: payment.id, status: "MENUNGGU" },
          data: { status, paidAt: status === "BERHASIL" ? new Date() : null },
        });
        if (!updated.count) return;
        if (status === "BERHASIL") {
          await transaction.invoice.update({ where: { id: invoice.id }, data: { status: "LUNAS" } });
          if (invoice.registration.student.userId) {
            await transaction.notification.create({
              data: { userId: invoice.registration.student.userId, title: "Pembayaran berhasil", body: `Pembayaran tagihan ${invoice.invoiceNo} telah dikonfirmasi.`, status: "MENUNGGU" },
            });
          }
        } else {
          await transaction.invoice.update({ where: { id: invoice.id }, data: { status: "BELUM_DIBAYAR" } });
        }
      });
    }
  }
  const current = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { status: true } });
  revalidatePath("/siswa/pembayaran");
  return { ok: true, status: current.status as InvoiceStatus };
}

export async function saveTestAnswer(input: { participantId: string; questionId: string; optionId?: string; flagged?: boolean }) {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  const parsed = testAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Jawaban tidak valid." };
  input = parsed.data;
  const participant = await prisma.testParticipant.findFirst({
    where: {
      id: input.participantId,
      submittedAt: null,
      registration: { student: { userId: user.id }, status: { in: ["TERVERIFIKASI", "MENGIKUTI_SELEKSI"] } },
      session: { status: "BERLANGSUNG", startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
    },
    select: { id: true, startedAt: true, session: { select: { packageId: true, endsAt: true, testPackage: { select: { durationMin: true } } } } },
  });
  if (!participant?.startedAt) return { ok: false, message: "Sesi ujian tidak aktif atau Anda tidak memenuhi syarat." };
  const deadline = Math.min(participant.startedAt.getTime() + participant.session.testPackage.durationMin * 60_000, participant.session.endsAt.getTime());
  if (Date.now() > deadline) return { ok: false, message: "Waktu ujian telah berakhir." };
  const question = await prisma.testPackageQuestion.findFirst({
    where: { packageId: participant.session.packageId, questionId: input.questionId },
    select: { question: { select: { options: { select: { id: true } } } } },
  });
  if (!question || (input.optionId && !question.question.options.some((option) => option.id === input.optionId))) {
    return { ok: false, message: "Jawaban tidak valid." };
  }
  await prisma.testAnswer.upsert({
    where: { participantId_questionId: { participantId: participant.id, questionId: input.questionId } },
    create: { participantId: participant.id, questionId: input.questionId, optionId: input.optionId, isFlagged: input.flagged ?? false },
    update: { optionId: input.optionId, isFlagged: input.flagged },
  });
  return { ok: true };
}

export async function submitTest(participantId: string) {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  if (typeof participantId !== "string" || participantId.length > 128) return { ok: false, message: "Ujian tidak dapat diselesaikan." };
  const now = new Date();
  const participant = await prisma.testParticipant.findFirst({
    where: {
      id: participantId,
      submittedAt: null,
      registration: { student: { userId: user.id }, status: { in: ["TERVERIFIKASI", "MENGIKUTI_SELEKSI"] } },
      session: { status: { in: ["BERLANGSUNG", "SELESAI"] }, startsAt: { lte: now } },
    },
    select: { startedAt: true, registrationId: true },
  });
  if (!participant?.startedAt) return { ok: false, message: "Ujian tidak dapat diselesaikan." };
  const result = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.testParticipant.updateMany({
      where: {
        id: participantId,
        submittedAt: null,
        registration: { student: { userId: user.id }, status: { in: ["TERVERIFIKASI", "MENGIKUTI_SELEKSI"] } },
      },
      data: { submittedAt: now },
    });
    if (!updated.count) return false;

    await gradeParticipant(transaction, participantId, now);
    const registration = await transaction.registration.findUnique({
      where: { id: participant.registrationId },
      select: { registrationNo: true, student: { select: { userId: true } } },
    });
    if (registration?.student.userId) {
      await transaction.notification.create({
        data: {
          userId: registration.student.userId,
          title: "Ujian TKA selesai",
          body: `Jawaban ujian ${registration.registrationNo} telah tersimpan dan dinilai.`,
          status: "MENUNGGU",
        },
      });
    }
    return true;
  });
  if (!result) return { ok: false, message: "Ujian tidak dapat diselesaikan." };
  revalidatePath("/siswa/ujian");
  return { ok: true, message: "Jawaban ujian berhasil dikirim." };
}

export async function getStudentProfilePhoto() {
  const user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { image: true } });
  if (!account.image?.startsWith(`profil/${user.id}/`)) return null;
  return createPrivateFileUrl(account.image);
}
