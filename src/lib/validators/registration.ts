import { z } from "zod";

export const registrationSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter"),
  nationalId: z.string().regex(/^\d{16}$/, "NIK harus terdiri dari 16 angka"),
  phone: z.string().trim().min(9, "Nomor telepon tidak valid"),
  trackId: z.string().min(1, "Pilih jalur pendaftaran"),
  email: z.string().email("Alamat email tidak valid"),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;