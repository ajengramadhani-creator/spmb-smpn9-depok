import type { Role } from "@prisma/client";

const permissions = {
  SISWA: ["pendaftaran:baca", "pendaftaran:ubah", "pengumuman:baca", "pembayaran:baca"],
  ADMIN: ["pendaftaran:kelola", "dokumen:verifikasi", "pengumuman:kelola", "laporan:baca", "soal:kelola"],
  KEPSEK: ["dashboard:baca", "seleksi:baca", "laporan:baca", "pengumuman:baca"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof permissions)[Role][number];

export function hasPermission(role: Role, permission: Permission) {
  return (permissions[role] as readonly string[]).includes(permission);
}