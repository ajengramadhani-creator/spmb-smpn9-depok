import { InvoiceStatus, RegistrationStatus, SelectionVersionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const verifiedStatuses = [
  RegistrationStatus.TERVERIFIKASI,
  RegistrationStatus.MENGIKUTI_SELEKSI,
  RegistrationStatus.DITERIMA,
  RegistrationStatus.DITOLAK,
  RegistrationStatus.CADANGAN,
];

function getDailySeries(dates: Date[]) {
  const totalDays = 30;
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - totalDays + 1));
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      label: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "UTC" }).format(date),
      pendaftar: counts.get(key) ?? 0,
    };
  });
}

export async function getAdminDashboardData() {
  const period = await prisma.academicPeriod.findFirst({
    where: { isActive: true },
    orderBy: { startsAt: "desc" },
  });
  const chartStart = new Date();
  chartStart.setUTCHours(0, 0, 0, 0);
  chartStart.setUTCDate(chartStart.getUTCDate() - 29);

  const [
    totalRegistrations,
    verifiedRegistrations,
    paidRegistrations,
    acceptedRegistrations,
    registrationsByDay,
    pendingRegistrations,
    pendingDocuments,
    pendingInvoices,
    recentActivity,
  ] = await Promise.all([
    period ? prisma.registration.count({ where: { academicPeriodId: period.id } }) : Promise.resolve(0),
    period ? prisma.registration.count({ where: { academicPeriodId: period.id, status: { in: verifiedStatuses } } }) : Promise.resolve(0),
    period ? prisma.registration.count({ where: { academicPeriodId: period.id, invoices: { some: { status: InvoiceStatus.LUNAS } } } }) : Promise.resolve(0),
    period ? prisma.registration.count({ where: { academicPeriodId: period.id, status: RegistrationStatus.DITERIMA } }) : Promise.resolve(0),
    period ? prisma.registration.findMany({
      where: { academicPeriodId: period.id, createdAt: { gte: chartStart } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }) : Promise.resolve([]),
    period ? prisma.registration.count({
      where: { academicPeriodId: period.id, status: RegistrationStatus.MENUNGGU_VERIFIKASI },
    }) : Promise.resolve(0),
    period ? prisma.document.count({
      where: {
        registration: { academicPeriodId: period.id },
        OR: [{ reviews: { none: {} } }, { reviews: { some: { status: "MENUNGGU" } } }],
      },
    }) : Promise.resolve(0),
    period ? prisma.invoice.count({
      where: {
        registration: { academicPeriodId: period.id },
        status: { in: [InvoiceStatus.BELUM_DIBAYAR, InvoiceStatus.MENUNGGU] },
      },
    }) : Promise.resolve(0),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, entity: true, createdAt: true, actor: { select: { name: true } } },
    }),
  ]);

  return {
    periodName: period?.name ?? "Periode aktif belum tersedia",
    totalRegistrations,
    verifiedRegistrations,
    paidRegistrations,
    acceptedRegistrations,
    dailyRegistrations: getDailySeries(registrationsByDay.map(({ createdAt }) => createdAt)),
    tasks: [
      { label: "Pendaftaran menunggu verifikasi", count: pendingRegistrations, href: "/admin/pendaftaran" },
      { label: "Berkas perlu ditinjau", count: pendingDocuments, href: "/admin/verifikasi" },
      { label: "Pembayaran belum lunas", count: pendingInvoices, href: "/admin/pembayaran" },
    ],
    recentActivity,
  };
}

export async function getKepsekDashboardData() {
  const period = await prisma.academicPeriod.findFirst({
    where: { isActive: true },
    include: { tracks: { where: { isActive: true }, orderBy: { type: "asc" } } },
    orderBy: { startsAt: "desc" },
  });
  if (!period) {
    return {
      periodName: "Periode aktif belum tersedia",
      totalRegistrations: 0,
      verifiedRegistrations: 0,
      paidRegistrations: 0,
      acceptedRegistrations: 0,
      submittedRegistrations: 0,
      testResults: 0,
      publishedResults: 0,
      tracks: [],
    };
  }

  const [
    totalRegistrations,
    verifiedRegistrations,
    paidRegistrations,
    acceptedRegistrations,
    submittedRegistrations,
    testResults,
    publishedResults,
    acceptedByTrack,
  ] = await Promise.all([
    prisma.registration.count({ where: { academicPeriodId: period.id } }),
    prisma.registration.count({ where: { academicPeriodId: period.id, status: { in: verifiedStatuses } } }),
    prisma.registration.count({ where: { academicPeriodId: period.id, invoices: { some: { status: InvoiceStatus.LUNAS } } } }),
    prisma.registration.count({ where: { academicPeriodId: period.id, status: RegistrationStatus.DITERIMA } }),
    prisma.registration.count({ where: { academicPeriodId: period.id, submittedAt: { not: null } } }),
    prisma.testResult.count({ where: { participant: { registration: { academicPeriodId: period.id } } } }),
    prisma.selectionResult.count({
      where: { selectionVersion: { academicPeriodId: period.id, status: SelectionVersionStatus.TERBIT } },
    }),
    prisma.registration.groupBy({
      by: ["trackId"],
      where: { academicPeriodId: period.id, status: RegistrationStatus.DITERIMA },
      _count: { _all: true },
    }),
  ]);

  const acceptedCountByTrack = new Map(acceptedByTrack.map(({ trackId, _count }) => [trackId, _count._all]));
  return {
    periodName: period.name,
    totalRegistrations,
    verifiedRegistrations,
    paidRegistrations,
    acceptedRegistrations,
    submittedRegistrations,
    testResults,
    publishedResults,
    tracks: period.tracks.map((track) => ({
      name: track.name,
      quota: track.quota,
      filled: acceptedCountByTrack.get(track.id) ?? 0,
    })),
  };
}
