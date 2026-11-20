import { PrismaClient, RegistrationStatus, Role, TrackType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const includeDemoAccounts = process.env.NODE_ENV !== "production";
  const demoPassword = process.env.DEMO_PASSWORD;
  if (includeDemoAccounts && (!demoPassword || demoPassword.length < 12)) {
    throw new Error("Atur DEMO_PASSWORD minimal 12 karakter sebelum menjalankan seed.");
  }
  const passwordHash = includeDemoAccounts ? await bcrypt.hash(demoPassword!, 12) : null;
  const period = await prisma.academicPeriod.upsert({
    where: { name: "2027/2028" },
    create: { id: "periode-2027-2028", name: "2027/2028", startsAt: new Date("2027-01-01"), endsAt: new Date("2027-12-31"), isActive: true },
    update: { isActive: true },
  });

  const trackData = [
    { type: TrackType.DOMISILI, name: "Jalur Domisili", quota: 144 },
    { type: TrackType.PRESTASI, name: "Jalur Prestasi", quota: 72 },
    { type: TrackType.AFIRMASI, name: "Jalur Afirmasi", quota: 58 },
    { type: TrackType.MUTASI, name: "Jalur Mutasi", quota: 14 },
  ];
  const tracks = await Promise.all(trackData.map((track) => prisma.track.upsert({
    where: { academicPeriodId_type: { academicPeriodId: period.id, type: track.type } },
    create: { ...track, academicPeriodId: period.id },
    update: { name: track.name, quota: track.quota, isActive: true },
  })));

  const accounts = includeDemoAccounts ? [
    { id: "demo-siswa-nabila", name: "Nabila Putri Azzahra", email: "nabila@spmb.smpn9depok.sch.id", role: Role.SISWA },
    { id: "demo-admin-andi", name: "Andi Rahman", email: "andi.rahman@spmb.smpn9depok.sch.id", role: Role.ADMIN },
    { id: "demo-kepsek-ratna", name: "Dr. Ratna Wulandari", email: "ratna.wulandari@spmb.smpn9depok.sch.id", role: Role.KEPSEK },
  ] : [];
  let nabilaUser = null;
  for (const account of accounts) {
    if (!passwordHash) throw new Error("Kata sandi seed demo tidak tersedia.");
    const existingById = await prisma.user.findUnique({
      where: { id: account.id },
      select: { id: true, email: true, role: true },
    });
    const existingByEmail = await prisma.user.findUnique({
      where: { email: account.email },
      select: { id: true },
    });
    if ((existingById && (existingById.email !== account.email || existingById.role !== account.role))
      || (existingByEmail && existingByEmail.id !== account.id)) {
      console.warn(`Seed akun demo ${account.role} dilewati karena identitasnya sudah digunakan akun lain.`);
      continue;
    }
    const seededAccount = await prisma.user.upsert({
      where: { id: account.id },
      create: { ...account, passwordHash, isActive: true, emailVerifiedAt: new Date() },
      update: { name: account.name, passwordHash, isActive: true, emailVerifiedAt: new Date() },
    });
    if (account.id === "demo-siswa-nabila") nabilaUser = seededAccount;
  }

  let nabilaRegistrationNo = "tidak dibuat";
  if (nabilaUser) {
    const nabila = await prisma.student.upsert({
      where: { userId: nabilaUser.id },
      create: {
        id: "demo-student-nabila",
        fullName: "Nabila Putri Azzahra",
        nationalId: "0091812345",
        birthPlace: "Depok",
        birthDate: new Date("2011-01-01"),
        gender: "PEREMPUAN",
        phone: "081234567890",
        address: "Kota Depok",
        userId: nabilaUser.id,
      },
      update: { fullName: "Nabila Putri Azzahra", nationalId: "0091812345" },
    });
    const nabilaRegistration = await prisma.registration.upsert({
      where: { registrationNo: "SPMB27-00918" },
      create: {
        registrationNo: "SPMB27-00918",
        studentId: nabila.id,
        academicPeriodId: period.id,
        trackId: tracks[0].id,
        status: RegistrationStatus.MENUNGGU_VERIFIKASI,
        submittedAt: new Date("2027-05-04T08:30:00Z"),
      },
      update: { status: RegistrationStatus.MENUNGGU_VERIFIKASI },
    });
    nabilaRegistrationNo = nabilaRegistration.registrationNo;
    await prisma.parentGuardian.upsert({
      where: { id: "demo-guardian-nabila" },
      create: { id: "demo-guardian-nabila", studentId: nabila.id, name: "Dewi Anggraini", relationship: "Ibu", phone: "081298765432", isPrimary: true },
      update: { name: "Dewi Anggraini", phone: "081298765432" },
    });
    await prisma.schoolOrigin.upsert({
      where: { studentId: nabila.id },
      create: { studentId: nabila.id, name: "SD Negeri Depok", npsn: "20200000", city: "Depok", graduationYear: 2027 },
      update: { name: "SD Negeri Depok", graduationYear: 2027 },
    });
  }

  const sampleStudents = [
    { id: "demo-student-rizky", nationalId: "3276010202100002", fullName: "Rizky Maulana", track: tracks[1], no: "SPMB27-00919", status: RegistrationStatus.TERVERIFIKASI },
    { id: "demo-student-siti", nationalId: "3276010303100003", fullName: "Siti Rahmawati", track: tracks[2], no: "SPMB27-00920", status: RegistrationStatus.DRAF },
  ];
  for (const sample of sampleStudents) {
    const student = await prisma.student.upsert({
      where: { nationalId: sample.nationalId },
      create: { id: sample.id, nationalId: sample.nationalId, fullName: sample.fullName, phone: "081234567891", address: "Kota Depok" },
      update: { fullName: sample.fullName },
    });
    await prisma.registration.upsert({
      where: { registrationNo: sample.no },
      create: { registrationNo: sample.no, studentId: student.id, academicPeriodId: period.id, trackId: sample.track.id, status: sample.status },
      update: { status: sample.status },
    });
  }
  const sequence = await prisma.registrationSequence.upsert({ where: { year: 2027 }, create: { year: 2027, value: 920 }, update: {} });
  if (sequence.value < 920) await prisma.registrationSequence.update({ where: { year: 2027 }, data: { value: 920 } });

  const announcements = [
    ["Pengumuman SPMB 2027/2028", "Pendaftaran murid baru SMPN 9 Depok segera dibuka. Pantau jadwal resmi di portal ini.", "UMUM"],
    ["Jadwal pendaftaran", "Jadwal pendaftaran dan tahapan seleksi akan diumumkan melalui portal SPMB.", "JADWAL"],
    ["Persiapkan dokumen", "Pastikan dokumen kependudukan dan rapor tersedia dalam format digital yang terbaca.", "UMUM"],
    ["Informasi jalur seleksi", "Tersedia jalur Domisili, Prestasi, Afirmasi, dan Mutasi sesuai ketentuan yang berlaku.", "UMUM"],
    ["Layanan bantuan", "Untuk bantuan teknis, hubungi sekretariat SPMB SMPN 9 Depok pada hari kerja.", "UMUM"],
  ] as const;
  for (const [index, [title, body, type]] of announcements.entries()) {
    const publishedAt = new Date(Date.now() - (announcements.length - index) * 24 * 60 * 60 * 1000);
    await prisma.announcement.upsert({
      where: { id: `pengumuman-demo-${index + 1}` },
      create: { id: `pengumuman-demo-${index + 1}`, academicPeriodId: period.id, title, body, type, publishedAt },
      update: { title, body, publishedAt },
    });
  }

  const category = await prisma.questionCategory.upsert({
    where: { name: "TKA" },
    create: { id: "kategori-tka", name: "TKA" },
    update: {},
  });
  const questions = [
    ["Berapakah hasil 125 + 275?", "300", "400", "500", "350"],
    ["Hasil dari 12 x 8 adalah ...", "86", "92", "96", "108"],
    ["Pecahan yang senilai dengan 1/2 adalah ...", "2/3", "3/6", "4/6", "5/8"],
    ["Keliling persegi dengan sisi 9 cm adalah ...", "18 cm", "27 cm", "36 cm", "81 cm"],
    ["Nilai tempat angka 7 pada bilangan 3.742 adalah ...", "Satuan", "Puluhan", "Ratusan", "Ribuan"],
    ["Jika 3x = 21, nilai x adalah ...", "6", "7", "8", "9"],
    ["Rata-rata dari 6, 8, dan 10 adalah ...", "7", "8", "9", "24"],
    ["Luas persegi panjang 8 cm x 5 cm adalah ...", "13 cm2", "26 cm2", "40 cm2", "80 cm2"],
    ["Pola bilangan 2, 5, 8, 11, ... dilanjutkan dengan ...", "12", "13", "14", "15"],
    ["Bentuk desimal dari 3/4 adalah ...", "0,25", "0,5", "0,75", "1,25"],
    ["Sinonim kata 'cermat' adalah ...", "Teliti", "Lalai", "Lambat", "Ragu"],
    ["Antonim kata 'hemat' adalah ...", "Irit", "Rajin", "Boros", "Bijak"],
    ["Ide pokok biasanya berisi ...", "Gagasan utama", "Contoh tambahan", "Nama tokoh", "Kalimat penutup"],
    ["Kalimat efektif menggunakan kata secara ...", "Berulang", "Tepat dan hemat", "Panjang", "Tidak baku"],
    ["Kata baku yang tepat adalah ...", "Resiko", "Risiko", "Resikko", "Riziko"],
    ["Teks yang berisi langkah melakukan sesuatu disebut ...", "Narasi", "Prosedur", "Deskripsi", "Puisi"],
    ["Subjek pada kalimat 'Dina membaca buku' adalah ...", "Membaca", "Buku", "Dina", "Kalimat"],
    ["Tanda baca untuk mengakhiri kalimat tanya adalah ...", "Titik", "Koma", "Seru", "Tanya"],
    ["Kata hubung yang menyatakan sebab adalah ...", "Tetapi", "Karena", "Atau", "Lalu"],
    ["Ringkasan yang baik memuat ...", "Semua kalimat asli", "Gagasan penting", "Pendapat baru", "Contoh terperinci"],
  ];
  const correctAnswers = [1, 2, 1, 2, 2, 1, 1, 2, 2, 2, 0, 2, 0, 1, 1, 1, 2, 3, 1, 1];
  for (const [index, [prompt, ...options]] of questions.entries()) {
    const questionId = `soal-tka-${String(index + 1).padStart(2, "0")}`;
    await prisma.question.upsert({
      where: { id: questionId },
      create: { id: questionId, categoryId: category.id, prompt, points: 1 },
      update: { prompt, categoryId: category.id },
    });
    for (const [optionIndex, content] of options.entries()) {
      const label = String.fromCharCode(65 + optionIndex);
      await prisma.questionOption.upsert({
        where: { id: `${questionId}-${label.toLowerCase()}` },
        create: { id: `${questionId}-${label.toLowerCase()}`, questionId, label, content, isCorrect: optionIndex === correctAnswers[index] },
        update: { content, isCorrect: optionIndex === correctAnswers[index] },
      });
    }
  }

  console.info(`Seed selesai: ${period.name}, ${tracks.length} jalur, ${accounts.length} akun demo, ${nabilaRegistrationNo}, ${questions.length} soal.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());