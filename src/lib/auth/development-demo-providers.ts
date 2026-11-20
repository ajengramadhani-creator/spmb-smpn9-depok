import { Role } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { clientAddress, hashIdentifier } from "@/lib/auth/rate-limit";
import { writeAuditLog } from "@/lib/audit/log";

const developmentDemoUserIds = {
  SISWA: "demo-siswa-nabila",
  ADMIN: "demo-admin-andi",
  KEPSEK: "demo-kepsek-ratna",
} satisfies Record<Role, string>;

export function getDevelopmentDemoProviders() {
  if (process.env.NODE_ENV === "production") return [];
  return [
    Credentials({
      id: "development-demo",
      name: "Akun Demo Development",
      credentials: { role: { label: "Peran demo", type: "text" } },
      async authorize(credentials, request) {
        if (process.env.NODE_ENV === "production") return null;
        const parsedRole = z.nativeEnum(Role).safeParse(credentials.role);
        if (!parsedRole.success) return null;

        const role = parsedRole.data;
        const user = await prisma.user.findUnique({
          where: { id: developmentDemoUserIds[role] },
          select: { id: true, name: true, email: true, role: true, isActive: true },
        });
        if (!user || !user.isActive || user.role !== role) return null;

        const emailHash = hashIdentifier(user.email);
        await writeAuditLog({
          actorId: user.id,
          action: "LOGIN_SUCCESS",
          entity: "AUTH",
          entityId: emailHash,
          ipAddress: clientAddress(request.headers),
          metadata: { identifierHash: emailHash, portal: role.toLowerCase(), source: "DEVELOPMENT_DEMO" },
        });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ];
}
