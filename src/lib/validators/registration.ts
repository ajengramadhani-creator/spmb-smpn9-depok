import { z } from "zod";

export const personalDataSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter"),
  nisn: z.string().regex(/^\d{10}$/, "NISN harus terdiri dari 10 angka"),
  nationalId: z.string().regex(/^\d{16}$/, "NIK harus terdiri dari 16 angka"),
  birthPlace: z.string().trim().min(2, "Tempat lahir wajib diisi"),
  birthDate: z.string().date("Tanggal lahir tidak valid"),
  gender: z.enum(["LAKI_LAKI", "PEREMPUAN"], { message: "Pilih jenis kelamin" }),
  phone: z.string().trim().min(9, "Nomor telepon tidak valid"),
  address: z.string().trim().min(8, "Alamat wajib diisi"),
});

export const guardianDataSchema = z.object({
  name: z.string().trim().min(3, "Nama orang tua/wali wajib diisi"),
  relationship: z.string().trim().min(2, "Hubungan wajib diisi"),
  phone: z.string().trim().min(9, "Nomor telepon tidak valid"),
  email: z.string().email("Alamat email tidak valid").or(z.literal("")),
  occupation: z.string().trim().min(2, "Pekerjaan wajib diisi"),
});

export const schoolDataSchema = z.object({
  name: z.string().trim().min(3, "Nama sekolah wajib diisi"),
  npsn: z.string().regex(/^\d{8}$/, "NPSN harus terdiri dari 8 angka").or(z.literal("")),
  address: z.string().trim().min(5, "Alamat sekolah wajib diisi"),
  city: z.string().trim().min(2, "Kota/kabupaten wajib diisi"),
  graduationYear: z.coerce.number().int().min(2020).max(2035),
});

export const gradesDataSchema = z.object({
  grades: z.array(z.object({
    subject: z.string().trim().min(2),
    semester: z.number().int().min(1).max(6),
    schoolYear: z.string().trim().min(4),
    score: z.coerce.number().min(0).max(100),
  })).min(1, "Masukkan nilai rapor kelas 4–6"),
});

export const trackDataSchema = z.object({
  trackId: z.string().min(1, "Pilih jalur pendaftaran"),
});

export const registrationStageSchemas = [
  personalDataSchema,
  guardianDataSchema,
  schoolDataSchema,
  gradesDataSchema,
  trackDataSchema,
] as const;

export const registrationSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter"),
  nationalId: z.string().regex(/^\d{16}$/, "NIK harus terdiri dari 16 angka"),
  phone: z.string().trim().min(9, "Nomor telepon tidak valid"),
  trackId: z.string().min(1, "Pilih jalur pendaftaran"),
  email: z.string().email("Alamat email tidak valid"),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;