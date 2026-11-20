"use server";

import { createHash, randomBytes } from "node:crypto";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import { clientAddress, consumeRateLimits, hashIdentifier } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { sendTransactionalEmail } from "@/lib/mail/client";

const strongPassword = z.string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .regex(/[a-z]/, "Kata sandi harus memiliki huruf kecil.")
  .regex(/[A-Z]/, "Kata sandi harus memiliki huruf besar.")
  .regex(/[0-9]/, "Kata sandi harus memiliki angka.");

const signupSchema = z.object({
  fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter.").max(120),
  nationalId: z.string().regex(/^\d{10}$/, "NISN harus terdiri dari 10 angka."),
  email: z.string().trim().email("Masukkan email yang valid.").max(254),
  phone: z.string().trim().regex(/^\+?[0-9][0-9 ()-]{7,18}$/, "Masukkan nomor WhatsApp orang tua yang valid."),
  password: strongPassword,
  passwordConfirmation: z.string(),
  consent: z.literal("on", { errorMap: () => ({ message: "Persetujuan wajib dicentang." }) }),
}).refine((value) => value.password === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "Konfirmasi kata sandi tidak sama.",
});

const resetSchema = z.object({
  token: z.string().min(1, "Tautan reset tidak valid."),
  password: strongPassword,
  passwordConfirmation: z.string(),
}).refine((value) => value.password === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "Konfirmasi kata sandi tidak sama.",
});

const emailSchema = z.string().trim().email().max(254);
const tokenDigest = (token: string) => createHash("sha256").update(token).digest("hex");
const verificationExpiry = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const resetExpiry = () => new Date(Date.now() + 30 * 60 * 1000);

function formString(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function accountUrl(path: string) {
  return new URL(path, getEnv().AUTH_URL).toString();
}

async function sendAccountEmail(to: string, subject: string, path: string, token: string) {
  const link = accountUrl(`${path}?token=${encodeURIComponent(token)}`);
  await sendTransactionalEmail({
    to,
    subject,
    html: `<p>Gunakan tautan berikut untuk melanjutkan:</p><p><a href="${link}">${link}</a></p><p>Tautan ini hanya dapat digunakan sekali dan memiliki masa berlaku terbatas.</p>`,
  });
}

export type AuthActionState = { status: "success" | "error"; message: string };

export async function registerAction(_previous: AuthActionState | null, formData: FormData): Promise<AuthActionState> {
  const requestHeaders = await headers();
  const ipAddress = clientAddress(requestHeaders);
  const addressHash = hashIdentifier(ipAddress);
  if (!await consumeRateLimits([{ key: `register:ip:${addressHash}`, limit: 5, windowSeconds: 3600 }])) {
    return { status: "error", message: "Terlalu banyak percobaan. Silakan coba kembali nanti." };
  }

  const parsed = signupSchema.safeParse({
    fullName: formString(formData, "fullName"),
    nationalId: formString(formData, "nationalId"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    password: formString(formData, "password"),
    passwordConfirmation: formString(formData, "passwordConfirmation"),
    consent: formString(formData, "consent"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Periksa kembali data pendaftaran." };

  const { fullName, nationalId, email: rawEmail, phone, password } = parsed.data;
  const email = rawEmail.toLowerCase();
  const duplicate = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    ?? await prisma.student.findFirst({
      where: { OR: [{ nationalId }, { nisn: nationalId }] },
      select: { id: true },
    });
  if (duplicate) return { status: "error", message: "NISN atau email sudah terdaftar." };
  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) {
    return { status: "error", message: "Layanan email belum dikonfigurasi. Silakan hubungi administrator SPMB." };
  }

  const rawToken = randomBytes(32).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.$transaction(async (transaction) => {
      const period = await transaction.academicPeriod.findFirst({
        where: { isActive: true },
        orderBy: { startsAt: "desc" },
      });
      if (!period) throw new RegistrationUnavailableError();

      const track = await transaction.track.findFirst({
        where: { academicPeriodId: period.id, isActive: true },
        orderBy: { type: "asc" },
      });
      if (!track) throw new RegistrationUnavailableError();

      const year = period.startsAt.getFullYear();
      const sequence = await transaction.registrationSequence.upsert({
        where: { year },
        create: { year, value: 1 },
        update: { value: { increment: 1 } },
      });
      const user = await transaction.user.create({
        data: {
          name: fullName,
          email,
          passwordHash,
          role: Role.SISWA,
          student: {
            create: {
              fullName,
              nisn: nationalId,
              phone,
              guardians: {
                create: { name: "Orang tua/wali", relationship: "Orang tua/wali", phone, isPrimary: true },
              },
              registration: {
                create: {
                  registrationNo: `SPMB${String(year).slice(-2)}-${String(sequence.value).padStart(5, "0")}`,
                  academicPeriodId: period.id,
                  trackId: track.id,
                },
              },
            },
          },
        },
      });
      await transaction.emailVerificationToken.create({
        data: { email, tokenHash: tokenDigest(rawToken), expiresAt: verificationExpiry() },
      });
      return user.id;
    });
  } catch (error) {
    if (error instanceof RegistrationUnavailableError) {
      return { status: "error", message: "Pendaftaran belum dibuka. Silakan pantau pengumuman resmi." };
    }
    if (isUniqueConstraintError(error)) {
      return { status: "error", message: "NISN atau email sudah terdaftar." };
    }
    throw error;
  }

  try {
    await sendAccountEmail(email, "Verifikasi email SPMB SMPN 9 Depok", "/verifikasi-email", rawToken);
  } catch {
    console.error("Email verifikasi tidak dapat dikirim.");
    return { status: "error", message: "Akun sudah dibuat, tetapi email verifikasi belum dapat dikirim. Silakan hubungi administrator SPMB." };
  }
  return { status: "success", message: "Akun berhasil dibuat. Periksa email Anda untuk memverifikasi alamat email." };
}

export async function requestPasswordResetAction(_previous: AuthActionState | null, formData: FormData): Promise<AuthActionState> {
  const requestHeaders = await headers();
  const ipAddress = clientAddress(requestHeaders);
  const email = formString(formData, "email").trim().toLowerCase();
  const validEmail = emailSchema.safeParse(email);
  const rateKeys = [
    { key: `forgot:ip:${hashIdentifier(ipAddress)}`, limit: 5, windowSeconds: 3600 },
    ...(validEmail.success ? [{ key: `forgot:email:${hashIdentifier(email)}`, limit: 3, windowSeconds: 3600 }] : []),
  ];
  if (!await consumeRateLimits(rateKeys)) {
    return { status: "success", message: "Jika email terdaftar, instruksi reset akan dikirim. Periksa kotak masuk Anda." };
  }
  if (!validEmail.success) return { status: "error", message: "Masukkan alamat email yang valid." };
  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) {
    return { status: "error", message: "Layanan email belum dikonfigurasi. Silakan hubungi administrator SPMB." };
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (user) {
    const rawToken = randomBytes(32).toString("base64url");
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email } }),
      prisma.passwordResetToken.create({ data: { email, tokenHash: tokenDigest(rawToken), expiresAt: resetExpiry() } }),
    ]);
    try {
      await sendAccountEmail(email, "Atur ulang kata sandi SPMB SMPN 9 Depok", "/atur-ulang-password", rawToken);
    } catch {
      console.error("Email pemulihan kata sandi tidak dapat dikirim.");
    }
  }
  return { status: "success", message: "Jika email terdaftar, instruksi reset akan dikirim. Periksa kotak masuk Anda." };
}

export async function resetPasswordAction(_previous: AuthActionState | null, formData: FormData): Promise<AuthActionState> {
  const parsed = resetSchema.safeParse({
    token: formString(formData, "token"),
    password: formString(formData, "password"),
    passwordConfirmation: formString(formData, "passwordConfirmation"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Periksa kembali kata sandi Anda." };

  const { token, password } = parsed.data;
  const now = new Date();
  const reset = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: tokenDigest(token), expiresAt: { gt: now } },
  });
  if (!reset) return { status: "error", message: "Tautan reset tidak valid atau sudah kedaluwarsa." };

  const passwordHash = await bcrypt.hash(password, 12);
  const requestHeaders = await headers();
  try {
    await prisma.$transaction(async (transaction) => {
      const consumed = await transaction.passwordResetToken.deleteMany({
        where: { id: reset.id, tokenHash: tokenDigest(token), expiresAt: { gt: now } },
      });
      if (consumed.count !== 1) throw new ResetTokenAlreadyUsedError();
      const user = await transaction.user.findUniqueOrThrow({ where: { email: reset.email }, select: { id: true } });
      await transaction.user.update({ where: { id: user.id }, data: { passwordHash } });
      await transaction.passwordResetToken.deleteMany({ where: { email: reset.email } });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "PASSWORD_RESET",
          entity: "USER",
          ipAddress: clientAddress(requestHeaders),
        },
      });
    });
  } catch (error) {
    if (error instanceof ResetTokenAlreadyUsedError) {
      return { status: "error", message: "Tautan reset tidak valid atau sudah kedaluwarsa." };
    }
    throw error;
  }
  return { status: "success", message: "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru." };
}

export async function verifyEmailAction(token: string): Promise<boolean> {
  if (!token || token.length > 200) return false;
  const now = new Date();
  const verification = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash: tokenDigest(token), expiresAt: { gt: now } },
  });
  if (!verification) return false;

  return prisma.$transaction(async (transaction) => {
    const consumed = await transaction.emailVerificationToken.deleteMany({
      where: { id: verification.id, tokenHash: tokenDigest(token), expiresAt: { gt: now } },
    });
    if (consumed.count !== 1) return false;
    await transaction.user.updateMany({
      where: { email: verification.email, role: Role.SISWA },
      data: { emailVerifiedAt: now },
    });
    await transaction.emailVerificationToken.deleteMany({ where: { email: verification.email } });
    return true;
  });
}

export async function changeUserRoleAction(formData: FormData): Promise<AuthActionState> {
  const actor = await requireRole([Role.ADMIN]);
  const userId = formString(formData, "userId");
  const newRole = z.nativeEnum(Role).safeParse(formString(formData, "role"));
  if (!userId || !newRole.success) return { status: "error", message: "Data perubahan peran tidak valid." };

  await prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new Error("Akun yang akan diubah tidak ditemukan.");
    await transaction.user.update({ where: { id: userId }, data: { role: newRole.data } });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ROLE_CHANGED",
        entity: "USER",
        entityId: userId,
        metadata: { from: target.role, to: newRole.data },
      },
    });
  });
  return { status: "success", message: "Peran akun berhasil diperbarui." };
}

class RegistrationUnavailableError extends Error {}
class ResetTokenAlreadyUsedError extends Error {}

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
