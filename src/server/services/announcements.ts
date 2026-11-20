import { prisma } from "@/lib/db/prisma";

export function listPublishedAnnouncements(academicPeriodId: string) {
  return prisma.announcement.findMany({
    where: { publishedAt: { lte: new Date() }, OR: [{ academicPeriodId }, { academicPeriodId: null }] },
    orderBy: { publishedAt: "desc" },
  });
}