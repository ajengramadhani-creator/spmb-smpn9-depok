"use server";

import { Prisma, Role, SelectionStatus, TestSessionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { getRegistrationEligibility, gradeParticipant } from "@/server/services/assessment";
import { publishSelection } from "@/server/services/selection";

export type AssessmentActionState = { status: "success" | "error"; message: string } | null;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readJakartaDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    local.getUTCFullYear() !== year ||
    local.getUTCMonth() !== month - 1 ||
    local.getUTCDate() !== day ||
    local.getUTCHours() !== hour ||
    local.getUTCMinutes() !== minute
  ) return null;
  return new Date(local.getTime() - 7 * 60 * 60 * 1000);
}

export async function saveQuestionCategoryAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const name = readText(formData, "name");
  if (name.length < 2 || name.length > 80) return { status: "error", message: "Nama kategori harus terdiri dari 2–80 karakter." };
  const category = await prisma.questionCategory.upsert({
    where: { name },
    create: { name },
    update: {},
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "QUESTION_CATEGORY_SAVED", entity: "QuestionCategory", entityId: category.id } });
  revalidatePath("/admin/bank-soal");
  return { status: "success", message: "Kategori soal tersimpan." };
}

export async function saveQuestionAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = z.object({
    id: z.string().optional(),
    categoryId: z.string().min(1),
    prompt: z.string().trim().min(5).max(5000),
    optionA: z.string().trim().min(1).max(2000),
    optionB: z.string().trim().min(1).max(2000),
    optionC: z.string().trim().min(1).max(2000),
    optionD: z.string().trim().min(1).max(2000),
    answer: z.enum(["A", "B", "C", "D"]),
    points: z.coerce.number().finite().min(0.01).max(100),
    isActive: z.boolean(),
  }).safeParse({
    id: readText(formData, "id") || undefined,
    categoryId: readText(formData, "categoryId"),
    prompt: readText(formData, "prompt"),
    optionA: readText(formData, "optionA"),
    optionB: readText(formData, "optionB"),
    optionC: readText(formData, "optionC"),
    optionD: readText(formData, "optionD"),
    answer: readText(formData, "answer"),
    points: readText(formData, "points"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { status: "error", message: "Lengkapi kategori, soal, empat pilihan, kunci, dan bobot nilai." };
  const category = await prisma.questionCategory.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } });
  if (!category) return { status: "error", message: "Kategori soal tidak ditemukan." };

  await prisma.$transaction(async (transaction) => {
    if (parsed.data.id) {
      const activeSession = await transaction.testPackageQuestion.findFirst({
        where: {
          questionId: parsed.data.id,
          testPackage: { sessions: { some: { status: { in: [TestSessionStatus.TERJADWAL, TestSessionStatus.BERLANGSUNG] } } } },
        },
        select: { questionId: true },
      });
      if (activeSession) throw new Error("Soal pada sesi terjadwal/berlangsung tidak dapat diubah.");
    }

    const question = parsed.data.id
      ? await transaction.question.update({
          where: { id: parsed.data.id },
          data: {
            categoryId: parsed.data.categoryId,
            prompt: parsed.data.prompt,
            points: new Prisma.Decimal(parsed.data.points),
            isActive: parsed.data.isActive,
          },
        })
      : await transaction.question.create({
          data: {
            categoryId: parsed.data.categoryId,
            prompt: parsed.data.prompt,
            points: new Prisma.Decimal(parsed.data.points),
            isActive: parsed.data.isActive,
          },
        });
    const options = [
      ["A", parsed.data.optionA],
      ["B", parsed.data.optionB],
      ["C", parsed.data.optionC],
      ["D", parsed.data.optionD],
    ] as const;
    for (const [label, content] of options) {
      await transaction.questionOption.upsert({
        where: { questionId_label: { questionId: question.id, label } },
        create: { questionId: question.id, label, content, isCorrect: parsed.data.answer === label },
        update: { content, isCorrect: parsed.data.answer === label },
      });
    }
    await transaction.auditLog.create({
      data: { actorId: admin.id, action: parsed.data.id ? "QUESTION_UPDATED" : "QUESTION_CREATED", entity: "Question", entityId: question.id },
    });
  });
  revalidatePath("/admin/bank-soal");
  return { status: "success", message: "Soal berhasil disimpan." };
}

export async function createTestPackageAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const durationMin = Number(readText(formData, "durationMin"));
  const questionIds = [...new Set(formData.getAll("questionId").filter((value): value is string => typeof value === "string" && value.length > 0))];
  if (name.length < 2 || name.length > 120 || description.length > 1000 || !Number.isInteger(durationMin) || durationMin < 5 || durationMin > 240 || questionIds.length === 0 || questionIds.length > 100) {
    return { status: "error", message: "Isi nama, durasi 5–240 menit, dan pilih minimal satu soal." };
  }
  const questions = await prisma.question.findMany({ where: { id: { in: questionIds }, isActive: true }, select: { id: true, type: true } });
  if (questions.length !== questionIds.length || questions.some((question) => question.type !== "PILIHAN_GANDA")) {
    return { status: "error", message: "Paket hanya dapat memuat soal pilihan ganda yang aktif." };
  }
  const testPackage = await prisma.$transaction(async (transaction) => {
    const created = await transaction.testPackage.create({ data: { name, description: description || null, durationMin } });
    await transaction.testPackageQuestion.createMany({
      data: questionIds.map((questionId, index) => ({ packageId: created.id, questionId, order: index + 1 })),
    });
    await transaction.auditLog.create({ data: { actorId: admin.id, action: "TEST_PACKAGE_CREATED", entity: "TestPackage", entityId: created.id } });
    return created;
  });
  revalidatePath("/admin/tes");
  return { status: "success", message: `Paket ${testPackage.name} berhasil dibuat.` };
}

export async function createTestSessionAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = z.object({
    title: z.string().trim().min(3).max(180),
    packageId: z.string().min(1),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
  }).safeParse({
    title: readText(formData, "title"),
    packageId: readText(formData, "packageId"),
    startsAt: readText(formData, "startsAt"),
    endsAt: readText(formData, "endsAt"),
  });
  if (!parsed.success) return { status: "error", message: "Lengkapi nama paket dan jadwal sesi." };
  const startsAt = readJakartaDateTime(parsed.data.startsAt);
  const endsAt = readJakartaDateTime(parsed.data.endsAt);
  if (!startsAt || !endsAt || startsAt >= endsAt) return { status: "error", message: "Rentang jadwal ujian tidak valid." };
  const [period, testPackage] = await Promise.all([
    prisma.academicPeriod.findFirst({ where: { isActive: true }, orderBy: { startsAt: "desc" }, select: { id: true } }),
    prisma.testPackage.findFirst({
      where: { id: parsed.data.packageId, isActive: true },
      include: { questions: { select: { questionId: true }, take: 1 } },
    }),
  ]);
  if (!period) return { status: "error", message: "Periode aktif belum tersedia." };
  if (!testPackage?.questions.length) return { status: "error", message: "Paket soal belum tersedia atau tidak aktif." };
  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  const packageDetails = await prisma.testPackage.findUniqueOrThrow({ where: { id: testPackage.id }, select: { durationMin: true } });
  if (minutes < packageDetails.durationMin) return { status: "error", message: "Rentang sesi harus setidaknya sepanjang durasi paket." };

  const session = await prisma.testSession.create({
    data: {
      academicPeriodId: period.id,
      packageId: testPackage.id,
      title: parsed.data.title,
      startsAt,
      endsAt,
      status: TestSessionStatus.TERJADWAL,
    },
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "TEST_SESSION_CREATED", entity: "TestSession", entityId: session.id } });
  revalidatePath("/admin/tes");
  return { status: "success", message: "Sesi ujian berhasil dijadwalkan." };
}

export async function changeTestSessionStatusAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const sessionId = readText(formData, "sessionId");
  const status = readText(formData, "status") as TestSessionStatus;
  if (!sessionId || !Object.values(TestSessionStatus).includes(status)) return { status: "error", message: "Status sesi tidak valid." };
  const session = await prisma.testSession.findUnique({ where: { id: sessionId }, select: { id: true, status: true, startsAt: true, endsAt: true } });
  if (!session) return { status: "error", message: "Sesi ujian tidak ditemukan." };
  const allowedTransitions: Record<TestSessionStatus, TestSessionStatus[]> = {
    DRAF: [TestSessionStatus.TERJADWAL, TestSessionStatus.DIBATALKAN],
    TERJADWAL: [TestSessionStatus.TERJADWAL, TestSessionStatus.BERLANGSUNG, TestSessionStatus.DIBATALKAN, TestSessionStatus.SELESAI],
    BERLANGSUNG: [TestSessionStatus.SELESAI],
    SELESAI: [],
    DIBATALKAN: [],
  };
  if (!allowedTransitions[session.status].includes(status)) {
    return { status: "error", message: "Perubahan status sesi tidak diizinkan." };
  }
  const now = new Date();
  if (status === TestSessionStatus.BERLANGSUNG && (now < session.startsAt || now >= session.endsAt)) {
    return { status: "error", message: "Sesi hanya dapat dimulai dalam rentang jadwal." };
  }
  if (status === TestSessionStatus.SELESAI && now < session.startsAt) {
    return { status: "error", message: "Sesi belum dimulai dan belum dapat diakhiri." };
  }
  await prisma.$transaction(async (transaction) => {
    await transaction.testSession.update({ where: { id: session.id }, data: { status } });
    if (status === TestSessionStatus.SELESAI) {
      const participants = await transaction.testParticipant.findMany({
        where: { sessionId: session.id, startedAt: { not: null }, submittedAt: null },
        select: { id: true, registration: { select: { student: { select: { userId: true } } } } },
      });
      for (const participant of participants) {
        await transaction.testParticipant.updateMany({
          where: { id: participant.id, submittedAt: null },
          data: { submittedAt: now },
        });
        await gradeParticipant(transaction, participant.id, now);
        const userId = participant.registration.student.userId;
        if (userId) {
          await transaction.notification.create({
            data: { userId, title: "Ujian TKA selesai", body: "Waktu ujian berakhir dan jawaban Anda telah dinilai.", status: "MENUNGGU" },
          });
        }
      }
    }
    await transaction.auditLog.create({
      data: { actorId: admin.id, action: "TEST_SESSION_STATUS_CHANGED", entity: "TestSession", entityId: session.id, metadata: { status } },
    });
  });
  revalidatePath("/admin/tes");
  revalidatePath("/siswa/ujian");
  return { status: "success", message: `Status sesi diperbarui menjadi ${status.replaceAll("_", " ").toLowerCase()}.` };
}

export async function assignEligibleParticipantsAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const sessionId = readText(formData, "sessionId");
  const session = await prisma.testSession.findUnique({ where: { id: sessionId }, select: { id: true, academicPeriodId: true, status: true } });
  if (!session) return { status: "error", message: "Sesi ujian tidak ditemukan." };
  if (session.status !== TestSessionStatus.TERJADWAL && session.status !== TestSessionStatus.DRAF) {
    return { status: "error", message: "Peserta hanya dapat ditambahkan sebelum ujian dimulai." };
  }
  const eligibility = await getRegistrationEligibility(session.academicPeriodId);
  const eligibleIds = eligibility.filter((registration) => registration.isEligible).map((registration) => registration.id);
  if (!eligibleIds.length) return { status: "error", message: "Belum ada pendaftar yang memenuhi syarat." };
  const created = await prisma.testParticipant.createMany({
    data: eligibleIds.map((registrationId) => ({ sessionId: session.id, registrationId })),
    skipDuplicates: true,
  });
  await prisma.auditLog.create({
    data: { actorId: admin.id, action: "TEST_PARTICIPANTS_ASSIGNED", entity: "TestSession", entityId: session.id, metadata: { eligible: eligibleIds.length, added: created.count } },
  });
  revalidatePath("/admin/tes");
  return { status: "success", message: `${created.count} peserta memenuhi syarat telah ditempatkan.` };
}

export async function createSelectionDraftAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const periodId = readText(formData, "academicPeriodId");
  const period = periodId
    ? await prisma.academicPeriod.findUnique({ where: { id: periodId }, select: { id: true } })
    : await prisma.academicPeriod.findFirst({ where: { isActive: true }, orderBy: { startsAt: "desc" }, select: { id: true } });
  if (!period) return { status: "error", message: "Periode seleksi tidak ditemukan." };

  const candidates = await getRegistrationEligibility(period.id);
  const scored: {
    registrationId: string;
    trackId: string;
    status: SelectionStatus;
    score: number | null;
    rank: number | null;
    note: string;
  }[] = candidates.map((candidate) => {
    const testResult = candidate.completedTest?.result;
    const eligible = candidate.isEligible && Boolean(testResult) && candidate.reportAverage !== null;
    if (!eligible || !testResult || candidate.reportAverage === null) {
      return {
        registrationId: candidate.id,
        trackId: candidate.track.id,
        status: SelectionStatus.DITOLAK,
        score: null as number | null,
        rank: null as number | null,
        note: [...candidate.reasons, ...(!testResult ? ["Hasil ujian belum tersedia"] : []), ...(candidate.reportAverage === null ? ["Nilai rapor belum tersedia"] : [])].join("; "),
      };
    }
    const testScore = Number(testResult.maxScore) > 0 ? (Number(testResult.score) / Number(testResult.maxScore)) * 100 : 0;
    const achievementScore = candidate.achievementScore;
    return {
      registrationId: candidate.id,
      trackId: candidate.track.id,
      status: SelectionStatus.DITOLAK,
      score: Math.round((testScore * 0.6 + candidate.reportAverage * 0.3 + achievementScore * 0.1) * 100) / 100,
      rank: null as number | null,
      note: `TKA ${testScore.toFixed(2)} × 60% · rapor ${candidate.reportAverage.toFixed(2)} × 30% · prestasi ${achievementScore} × 10%.`,
    };
  });
  const tracks = new Map(candidates.map((candidate) => [candidate.track.id, candidate.track]));
  for (const track of tracks.values()) {
    const ranked = scored.filter((result) => result.trackId === track.id && result.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const reserveCount = track.quota > 0 ? Math.max(1, Math.ceil(track.quota * 0.1)) : 0;
    ranked.forEach((result, index) => {
      result.rank = index + 1;
      result.status = index < track.quota
        ? SelectionStatus.DITERIMA
        : index < track.quota + reserveCount
          ? SelectionStatus.CADANGAN
          : SelectionStatus.DITOLAK;
    });
  }

  const version = await prisma.$transaction(async (transaction) => {
    const latest = await transaction.selectionVersion.findFirst({
      where: { academicPeriodId: period.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const created = await transaction.selectionVersion.create({
      data: {
        academicPeriodId: period.id,
        version: (latest?.version ?? 0) + 1,
        status: "DRAF",
        createdById: admin.id,
        notes: "Skor = TKA 60% + rata-rata rapor 30% + bukti prestasi terverifikasi (100/0) 10%. Cadangan: hingga 10% kuota per jalur.",
      },
    });
    await transaction.selectionResult.createMany({
      data: scored.map((result) => ({
        selectionVersionId: created.id,
        registrationId: result.registrationId,
        status: result.status,
        score: result.score === null ? null : new Prisma.Decimal(result.score),
        rank: result.rank,
        note: result.note || null,
      })),
    });
    await transaction.auditLog.create({
      data: { actorId: admin.id, action: "SELECTION_DRAFT_CREATED", entity: "SelectionVersion", entityId: created.id, metadata: { periodId: period.id, resultCount: scored.length } },
    });
    return created;
  });
  revalidatePath("/admin/seleksi");
  return { status: "success", message: `Draf versi ${version.version} dibuat dengan ${scored.length} pendaftar.` };
}

export async function publishSelectionAction(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const selectionVersionId = readText(formData, "selectionVersionId");
  if (!selectionVersionId) return { status: "error", message: "Versi seleksi tidak valid." };
  await publishSelection(selectionVersionId);
  revalidatePath("/admin/seleksi");
  revalidatePath("/siswa/hasil");
  revalidatePath("/kepsek/hasil-seleksi");
  return { status: "success", message: "Hasil seleksi berhasil diterbitkan dan siswa telah diberi notifikasi." };
}
