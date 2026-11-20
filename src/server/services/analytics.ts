import {
  InvoiceStatus,
  RegistrationStatus,
  Role,
  SelectionVersionStatus,
} from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

const periodSelect = {
  id: true,
  name: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
} as const;

function getDailyTrend(dates: Date[], startsAt: Date, endsAt: Date) {
  const today = new Date();
  const lastDay = endsAt < today ? endsAt : today;
  const rangeStart = new Date(lastDay);
  rangeStart.setUTCHours(0, 0, 0, 0);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 29);
  const firstDay = startsAt > rangeStart ? startsAt : rangeStart;
  firstDay.setUTCHours(0, 0, 0, 0);

  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days = Math.max(1, Math.floor((lastDay.getTime() - firstDay.getTime()) / 86_400_000) + 1);
  return Array.from({ length: Math.min(days, 30) }, (_, index) => {
    const date = new Date(firstDay);
    date.setUTCDate(firstDay.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      label: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "UTC" }).format(date),
      pendaftar: counts.get(key) ?? 0,
    };
  });
}

function countByName<T extends { name: string | null; _count: { _all: number } }>(groups: T[]) {
  return groups
    .filter((group) => group.name)
    .map((group) => ({ name: group.name as string, jumlah: group._count._all }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

function countByCity(groups: Array<{ city: string | null; _count: { _all: number } }>) {
  return groups
    .filter((group): group is { city: string; _count: { _all: number } } => group.city !== null)
    .map((group) => ({ name: group.city, jumlah: group._count._all }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

export async function getAdminAnalyticsData(requestedPeriodId?: string) {
  await requireRole([Role.ADMIN]);
  const periods = await prisma.academicPeriod.findMany({
    orderBy: { startsAt: "desc" },
    select: periodSelect,
  });
  const period = periods.find((item) => item.id === requestedPeriodId)
    ?? periods.find((item) => item.isActive)
    ?? periods[0]
    ?? null;

  if (!period) {
    return {
      periods,
      period: null,
      byTrack: [],
      byCity: [],
      bySchool: [],
      byStatus: [],
      dailyRegistrations: [],
      registrations: [],
      total: 0,
    };
  }

  const registrationWhere = { academicPeriodId: period.id };
  const trendEnd = period.endsAt < new Date() ? period.endsAt : new Date();
  const trendStart = new Date(trendEnd);
  trendStart.setUTCHours(0, 0, 0, 0);
  trendStart.setUTCDate(trendStart.getUTCDate() - 29);
  const effectiveStart = period.startsAt > trendStart ? period.startsAt : trendStart;

  const [
    tracks,
    trackCounts,
    cityCounts,
    schoolCounts,
    statusCounts,
    trendDates,
    registrations,
    total,
  ] = await Promise.all([
    prisma.track.findMany({
      where: { academicPeriodId: period.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, quota: true },
    }),
    prisma.registration.groupBy({
      by: ["trackId"],
      where: registrationWhere,
      _count: { _all: true },
    }),
    prisma.schoolOrigin.groupBy({
      by: ["city"],
      where: { student: { registration: { is: registrationWhere } } },
      _count: { _all: true },
    }),
    prisma.schoolOrigin.groupBy({
      by: ["name"],
      where: { student: { registration: { is: registrationWhere } } },
      _count: { _all: true },
    }),
    prisma.registration.groupBy({
      by: ["status"],
      where: registrationWhere,
      _count: { _all: true },
    }),
    prisma.registration.findMany({
      where: {
        ...registrationWhere,
        createdAt: { gte: effectiveStart, lte: trendEnd },
      },
      select: { createdAt: true },
    }),
    prisma.registration.findMany({
      where: registrationWhere,
      orderBy: { createdAt: "desc" },
      select: {
        registrationNo: true,
        status: true,
        createdAt: true,
        submittedAt: true,
        track: { select: { name: true } },
        student: {
          select: {
            fullName: true,
            schoolOrigin: { select: { name: true, city: true } },
          },
        },
      },
    }),
    prisma.registration.count({ where: registrationWhere }),
  ]);
  const countByTrackId = new Map(trackCounts.map((item) => [item.trackId, item._count._all]));

  return {
    periods,
    period,
    byTrack: tracks.map((track) => ({
      name: track.name,
      jumlah: countByTrackId.get(track.id) ?? 0,
      kuota: track.quota,
    })),
    byCity: countByCity(cityCounts),
    bySchool: countByName(schoolCounts).slice(0, 10),
    byStatus: statusCounts.map((item) => ({ name: item.status, jumlah: item._count._all })),
    dailyRegistrations: getDailyTrend(trendDates.map((item) => item.createdAt), period.startsAt, trendEnd),
    registrations,
    total,
  };
}

export async function getKepsekReportData(page: string) {
  await requireRole([Role.KEPSEK]);
  const period = await prisma.academicPeriod.findFirst({
    where: { isActive: true },
    orderBy: { startsAt: "desc" },
    select: periodSelect,
  });
  if (!period) return { kind: "empty" as const, periodName: "Periode aktif belum tersedia" };

  if (page === "pendaftaran") {
    const registrations = await prisma.registration.findMany({
      where: { academicPeriodId: period.id },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        registrationNo: true,
        status: true,
        createdAt: true,
        track: { select: { name: true } },
        student: { select: { fullName: true } },
      },
    });
    const total = await prisma.registration.count({ where: { academicPeriodId: period.id } });
    return { kind: "pendaftaran" as const, periodName: period.name, registrations, total };
  }

  if (page === "hasil-tes") {
    const results = await prisma.testResult.findMany({
      where: { participant: { registration: { academicPeriodId: period.id } } },
      take: 100,
      orderBy: { gradedAt: "desc" },
      select: {
        score: true,
        maxScore: true,
        gradedAt: true,
        participant: {
          select: {
            registration: {
              select: {
                registrationNo: true,
                track: { select: { name: true } },
                student: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });
    const total = await prisma.testResult.count({
      where: { participant: { registration: { academicPeriodId: period.id } } },
    });
    return { kind: "hasil-tes" as const, periodName: period.name, results, total };
  }

  if (page === "hasil-seleksi") {
    const version = await prisma.selectionVersion.findFirst({
      where: { academicPeriodId: period.id, status: SelectionVersionStatus.TERBIT },
      orderBy: { publishedAt: "desc" },
      select: {
        version: true,
        publishedAt: true,
        _count: { select: { results: true } },
        results: {
          take: 100,
          orderBy: [{ rank: "asc" }, { registration: { registrationNo: "asc" } }],
          select: {
            status: true,
            score: true,
            rank: true,
            registration: {
              select: {
                registrationNo: true,
                track: { select: { name: true } },
                student: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });
    return { kind: "hasil-seleksi" as const, periodName: period.name, version };
  }

  if (page === "statistik") {
    const [tracks, trackCounts, cities, schools, statuses, dates] = await Promise.all([
      prisma.track.findMany({
        where: { academicPeriodId: period.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, quota: true },
      }),
      prisma.registration.groupBy({
        by: ["trackId"],
        where: { academicPeriodId: period.id },
        _count: { _all: true },
      }),
      prisma.schoolOrigin.groupBy({
        by: ["city"],
        where: { student: { registration: { is: { academicPeriodId: period.id } } } },
        _count: { _all: true },
      }),
      prisma.schoolOrigin.groupBy({
        by: ["name"],
        where: { student: { registration: { is: { academicPeriodId: period.id } } } },
        _count: { _all: true },
      }),
      prisma.registration.groupBy({
        by: ["status"],
        where: { academicPeriodId: period.id },
        _count: { _all: true },
      }),
      prisma.registration.findMany({
        where: { academicPeriodId: period.id, createdAt: { gte: period.startsAt, lte: new Date() } },
        select: { createdAt: true },
      }),
    ]);
    const byTrackId = new Map(trackCounts.map((item) => [item.trackId, item._count._all]));
    return {
      kind: "statistik" as const,
      periodName: period.name,
      tracks: tracks.map((track) => ({
        name: track.name,
        jumlah: byTrackId.get(track.id) ?? 0,
        kuota: track.quota,
      })),
      cities: countByCity(cities).slice(0, 10),
      schools: countByName(schools).slice(0, 10),
      statuses: statuses.map((item) => ({ name: item.status, jumlah: item._count._all })),
      dailyRegistrations: getDailyTrend(dates.map((item) => item.createdAt), period.startsAt, period.endsAt),
    };
  }

  if (page === "pembayaran") {
    const [invoices, payments, paidTotal] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        where: { registration: { academicPeriodId: period.id } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where: { invoice: { registration: { academicPeriodId: period.id } } },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          amount: true,
          status: true,
          createdAt: true,
          invoice: {
            select: {
              invoiceNo: true,
              registration: {
                select: {
                  registrationNo: true,
                  student: { select: { fullName: true } },
                },
              },
            },
          },
        },
      }),
      prisma.invoice.aggregate({
        where: { registration: { academicPeriodId: period.id }, status: InvoiceStatus.LUNAS },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    return {
      kind: "pembayaran" as const,
      periodName: period.name,
      invoices: invoices.map((item) => ({
        status: item.status,
        jumlah: item._count._all,
        total: Number(item._sum.amount ?? 0),
      })),
      payments,
      paidCount: paidTotal._count._all,
      paidAmount: Number(paidTotal._sum.amount ?? 0),
    };
  }

  if (page === "laporan-eksekutif") {
    const [total, submitted, accepted, rejected, reserve, paid, trackCounts] = await Promise.all([
      prisma.registration.count({ where: { academicPeriodId: period.id } }),
      prisma.registration.count({ where: { academicPeriodId: period.id, submittedAt: { not: null } } }),
      prisma.registration.count({ where: { academicPeriodId: period.id, status: RegistrationStatus.DITERIMA } }),
      prisma.registration.count({ where: { academicPeriodId: period.id, status: RegistrationStatus.DITOLAK } }),
      prisma.registration.count({ where: { academicPeriodId: period.id, status: RegistrationStatus.CADANGAN } }),
      prisma.invoice.aggregate({
        where: { registration: { academicPeriodId: period.id }, status: InvoiceStatus.LUNAS },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.registration.groupBy({
        by: ["trackId", "status"],
        where: { academicPeriodId: period.id },
        _count: { _all: true },
      }),
    ]);
    const tracks = await prisma.track.findMany({
      where: { academicPeriodId: period.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, quota: true },
    });
    return {
      kind: "laporan-eksekutif" as const,
      periodName: period.name,
      summary: {
        total,
        submitted,
        accepted,
        rejected,
        reserve,
        paidCount: paid._count._all,
        paidAmount: Number(paid._sum.amount ?? 0),
      },
      tracks: tracks.map((track) => {
        const counts = trackCounts.filter((item) => item.trackId === track.id);
        const totalApplicants = counts.reduce((sum, item) => sum + item._count._all, 0);
        const acceptedCount = counts.find((item) => item.status === RegistrationStatus.DITERIMA)?._count._all ?? 0;
        return { name: track.name, quota: track.quota, total: totalApplicants, accepted: acceptedCount };
      }),
    };
  }

  return { kind: "empty" as const, periodName: period.name };
}
