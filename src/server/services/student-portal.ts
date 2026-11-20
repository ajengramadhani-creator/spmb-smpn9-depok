import { prisma } from "@/lib/db/prisma";

export async function getStudentPortalData(userId: string) {
  const [user, student, period, draft, notifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.student.findUnique({
      where: { userId },
      include: {
        guardians: { where: { isPrimary: true }, take: 1 },
        schoolOrigin: true,
        reportGrades: { orderBy: [{ semester: "asc" }, { subject: "asc" }] },
        registration: {
          include: {
            track: true,
            academicPeriod: true,
            documents: { include: { reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } }, orderBy: { uploadedAt: "desc" } },
            invoices: { include: { payments: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } },
            testParticipants: {
              include: {
                session: true,
                result: true,
              },
              orderBy: { session: { startsAt: "desc" } },
            },
            selectionResults: {
              where: { selectionVersion: { status: "TERBIT" } },
              include: { selectionVersion: true },
              orderBy: { selectionVersion: { publishedAt: "desc" } },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.academicPeriod.findFirst({
      where: { isActive: true },
      include: { tracks: { where: { isActive: true }, orderBy: { name: "asc" } } },
    }),
    prisma.registrationDraft.findUnique({ where: { userId } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);
  const [announcements, bankAccounts, upcomingTestSession] = await Promise.all([
    prisma.announcement.findMany({
    where: {
      publishedAt: { lte: new Date() },
      OR: [{ academicPeriodId: period?.id }, { academicPeriodId: null }],
    },
    include: { reads: { where: { userId }, select: { readAt: true } }, attachments: true },
    orderBy: { publishedAt: "desc" },
    }),
    prisma.bankAccount.findMany({
      where: { isActive: true },
      select: { bankName: true, accountName: true, accountNumber: true, instructions: true },
      orderBy: { createdAt: "asc" },
    }),
    period ? prisma.testSession.findFirst({
      where: { academicPeriodId: period.id, status: { in: ["TERJADWAL", "BERLANGSUNG"] }, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }) : Promise.resolve(null),
  ]);
  const registration = student?.registration;
  const upcomingParticipant = registration?.testParticipants.find((participant) =>
    participant.session.status === "TERJADWAL" && participant.session.startsAt >= new Date(),
  );
  let latestNotifications = notifications;
  if (upcomingParticipant) {
    const title = "Jadwal TKA diumumkan";
    const body = `${upcomingParticipant.session.title} · ${upcomingParticipant.session.startsAt.toISOString()}`;
    const id = `jadwal-${upcomingParticipant.session.id}-${userId}`;
    await prisma.notification.upsert({
      where: { id },
      create: { id, userId, title, body, status: "MENUNGGU" },
      update: {},
    });
    latestNotifications = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }
  const unreadNotificationCount = latestNotifications.filter((notification) => notification.status === "MENUNGGU").length;
  const safeRegistration = registration ? {
    ...registration,
    documents: registration.documents.map((document) => {
      const { storageKey, encryptionIv, encryptionTag, ...safeDocument } = document;
      void storageKey;
      void encryptionIv;
      void encryptionTag;
      return safeDocument;
    }),
    invoices: registration.invoices.map((invoice) => ({
      ...invoice,
      amount: Number(invoice.amount),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        amount: Number(payment.amount),
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        hasEvidence: Boolean(payment.rawResponse && typeof payment.rawResponse === "object" && "evidenceKey" in payment.rawResponse && payment.rawResponse.evidenceKey),
      })),
    })),
    testParticipants: registration.testParticipants.map((participant) => ({
      ...participant,
      result: participant.result ? { ...participant.result, score: Number(participant.result.score), maxScore: Number(participant.result.maxScore) } : null,
    })),
    selectionResults: registration.selectionResults.map((result) => ({ ...result, score: result.score === null ? null : Number(result.score) })),
  } : null;
  return {
    user: { id: user.id, name: user.name, email: user.email, hasImage: Boolean(user.image) },
    student: student ? {
      ...student,
      reportGrades: student.reportGrades.map((grade) => ({ ...grade, score: Number(grade.score) })),
      registration: safeRegistration,
    } : null,
    registration: safeRegistration,
    period,
    draft,
    notifications: latestNotifications,
    announcements: announcements.map((announcement) => ({
      ...announcement,
      attachments: announcement.attachments.map((attachment) => {
        const { storageKey, ...safeAttachment } = attachment;
        void storageKey;
        return safeAttachment;
      }),
    })),
    bankAccounts,
    upcomingTestSession,
    unreadNotificationCount,
  };
}

export async function getExamData(userId: string) {
  const now = new Date();
  const participant = await prisma.testParticipant.findFirst({
    where: {
      registration: {
        student: { userId },
        status: { in: ["TERVERIFIKASI", "MENGIKUTI_SELEKSI"] },
      },
      submittedAt: null,
      session: { status: "BERLANGSUNG", startsAt: { lte: now }, endsAt: { gt: now } },
    },
    include: {
      session: {
        include: {
          testPackage: {
            include: {
              questions: {
                orderBy: { order: "asc" },
                include: { question: { include: { options: { select: { id: true, label: true, content: true } } } } },
              },
            },
          },
        },
      },
      answers: { select: { questionId: true, optionId: true, isFlagged: true } },
    },
    orderBy: { session: { startsAt: "asc" } },
  });
  if (!participant) return null;
  if (!participant.startedAt) {
    await prisma.testParticipant.updateMany({
      where: { id: participant.id, startedAt: null, submittedAt: null },
      data: { startedAt: now },
    });
  }
  const savedStartRecord = participant.startedAt ? null : await prisma.testParticipant.findUniqueOrThrow({
    where: { id: participant.id },
    select: { startedAt: true },
  });
  const savedStart = participant.startedAt ?? savedStartRecord?.startedAt ?? now;
  const expiresAt = new Date(Math.min(
    savedStart.getTime() + participant.session.testPackage.durationMin * 60_000,
    participant.session.endsAt.getTime(),
  ));
  return {
    id: participant.id,
    title: participant.session.title,
    startedAt: savedStart,
    expiresAt,
    serverNow: now,
    questions: participant.session.testPackage.questions.map(({ question }) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options.map(({ id, label, content }) => ({ id, label, content })),
    })),
    answers: participant.answers,
  };
}
