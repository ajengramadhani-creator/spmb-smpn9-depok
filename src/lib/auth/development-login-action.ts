"use server";

import { Role } from "@prisma/client";
import { signIn } from "@/lib/auth/config";
import { z } from "zod";

const destinationByRole: Record<Role, string> = {
  SISWA: "/siswa",
  ADMIN: "/admin",
  KEPSEK: "/kepsek",
};

export async function developmentQuickLoginAction(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Masuk cepat hanya tersedia di development.");
  }
  const parsedRole = z.nativeEnum(Role).safeParse(formData.get("role"));
  if (!parsedRole.success) throw new Error("Portal demo tidak valid.");

  await signIn("development-demo", {
    role: parsedRole.data,
    redirectTo: destinationByRole[parsedRole.data],
  });
}
