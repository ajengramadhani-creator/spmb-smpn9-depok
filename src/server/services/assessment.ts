import { InvoiceStatus, Prisma, RegistrationStatus, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const requiredDocumentTypes = ["KARTU_KELUARGA", "AKTA_KELAHIRAN", "RAPOR", "PAS_FOTO", "IJAZAH"] as const;
const documentLabels: Record<(typeof requiredDocumentTypes)[number], string> = {
  KARTU_KELUARGA: "Kartu Keluarga",
  AKTA_KELAHIRAN: "Akta kelahiran",
  RAPOR: "Rapor",
  PAS_FOTO: "Pas foto",
  IJAZAH: "Surat Keterangan Lulus",
};
const allowedRegistrationStatuses: RegistrationStatus[] = [
  RegistrationStatus.TERVERIFIKASI,
  RegistrationStatus.MENGIKUTI_SELEKSI,
  RegistrationStatus.DITERIMA,
  RegistrationStatus.DITOLAK,
  RegistrationStatus.CADANGAN,
];

export async function getRegistrationEligibility(academicPeriodId: string) {
  const registrations = await prisma.registration.findMany({
    where: { academicPeriodId },
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        include: {
          reportGrades: { select: { score: true } },
        },
      },
      track: { select: { id: true, name: true, quota: true, type: true } },
      documents: { orderBy: { uploadedAt: "desc" }, include: { reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } } },
      invoices: { select: { status: true } },
      testParticipants: { include: { result: true }, orderBy: { session: { startsAt: "desc" } } },
    },
  });

  return registrations.map((registration) => {
    const latestDocuments = new Map<string, ReviewStatus | undefined>();
    for (const document of registration.documents) {
      if (!latestDocuments.has(document.type)) latestDocuments.set(document.type, document.reviews[0]?.status);
    }
    const missingDocuments = requiredDocumentTypes
      .filter((type) => latestDocuments.get(type) !== ReviewStatus.DITERIMA)
      .map((type) => documentLabels[type]);
    const paid = registration.invoices.some((invoice) => invoice.status === InvoiceStatus.LUNAS);
    const verified = allowedRegistrationStatuses.includes(registration.status);
    const reasons = [
      ...(!verified ? ["Pendaftaran belum terverifikasi"] : []),
      ...(missingDocuments.length ? [`Berkas belum lengkap/disetujui: ${missingDocuments.join(", ")}`] : []),
      ...(!paid ? ["Pembayaran belum lunas"] : []),
    ];
    const completedTest = registration.testParticipants.find((participant) => participant.result !== null);
    const reportAverage = registration.student.reportGrades.length
      ? registration.student.reportGrades.reduce((sum, grade) => sum + Number(grade.score), 0) / registration.student.reportGrades.length
      : null;
    return {
      ...registration,
      isEligible: reasons.length === 0,
      reasons,
      completedTest,
      reportAverage,
      achievementScore: latestDocuments.get("BUKTI_PRESTASI") === ReviewStatus.DITERIMA ? 100 : 0,
    };
  });
}

export async function gradeParticipant(transaction: Prisma.TransactionClient, participantId: string, gradedAt = new Date()) {
  const participant = await transaction.testParticipant.findUnique({
    where: { id: participantId },
    include: {
      session: {
        include: {
          testPackage: {
            include: {
              questions: {
                include: {
                  question: {
                    select: {
                      id: true,
                      points: true,
                      options: { select: { id: true, isCorrect: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      answers: { select: { questionId: true, optionId: true } },
    },
  });
  if (!participant) throw new Error("Peserta ujian tidak ditemukan.");
  let score = 0;
  let maxScore = 0;
  for (const { question } of participant.session.testPackage.questions) {
    const points = Number(question.points);
    maxScore += points;
    const answer = participant.answers.find((item) => item.questionId === question.id);
    const isCorrect = Boolean(answer?.optionId && question.options.find((option) => option.id === answer.optionId)?.isCorrect);
    const earned = isCorrect ? points : 0;
    score += earned;
    if (answer) {
      await transaction.testAnswer.updateMany({
        where: { participantId, questionId: question.id },
        data: { isCorrect, pointsEarned: new Prisma.Decimal(earned) },
      });
    }
  }
  return transaction.testResult.upsert({
    where: { participantId },
    create: { participantId, score: new Prisma.Decimal(score.toFixed(2)), maxScore: new Prisma.Decimal(maxScore.toFixed(2)) },
    update: { score: new Prisma.Decimal(score.toFixed(2)), maxScore: new Prisma.Decimal(maxScore.toFixed(2)), gradedAt },
  });
}
