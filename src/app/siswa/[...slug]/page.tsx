import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { getExamData, getStudentPortalData } from "@/server/services/student-portal";
import { StudentPortalPage } from "@/components/siswa/student-portal";

const routes = new Set(["pendaftaran", "dokumen", "pembayaran", "hasil", "ujian", "pengumuman", "notifikasi", "profil"]);

export default async function SiswaPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  if (!routes.has(slug[0]) || (slug.length > 1 && slug[0] !== "pengumuman")) notFound();
  const user = await requireRole([Role.SISWA]);
  const data = await getStudentPortalData(user.id);
  const exam = slug[0] === "ujian" ? await getExamData(user.id) : null;
  return <StudentPortalPage page={slug[0]} detailId={slug[1]} data={data} exam={exam} />;
}
