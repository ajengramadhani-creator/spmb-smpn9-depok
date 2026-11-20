import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { clientAddress, consumeRateLimits, hashIdentifier } from "@/lib/auth/rate-limit";
import { writeAuditLog } from "@/lib/audit/log";

const lockoutWindowSeconds = 15 * 60;
const loginActivityActions = ["LOGIN_FAILED", "LOGIN_SUCCESS"];

function credentialsProvider(id: string, name: string, role: Role, acceptsNisn = false) {
  return Credentials({
    id,
    name,
    credentials: {
      identifier: { label: acceptsNisn ? "Email atau NISN" : "Email", type: "text" },
      password: { label: "Kata sandi", type: "password" },
    },
    async authorize(credentials, request) {
      return authorizeForRole(credentials, request, role, id);
    },
  });
}

async function authorizeForRole(
  credentials: Partial<Record<string, unknown>>,
  request: Request,
  expectedRole: Role,
  portal: string,
) {
  const identifier = credentials.identifier;
  const password = credentials.password;
  if (typeof identifier !== "string" || typeof password !== "string") return null;

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const ipAddress = clientAddress(request.headers);
  const ipHash = hashIdentifier(ipAddress);
  const allowedByIp = await consumeRateLimits([
    { key: `login:ip:${ipHash}`, limit: 10, windowSeconds: 900 },
  ]);
  if (!allowedByIp) return null;

  const user = await prisma.user.findFirst({
    where: expectedRole === "SISWA"
      ? {
          OR: [
            { email: normalizedIdentifier },
            { student: { nationalId: normalizedIdentifier } },
          ],
        }
      : { email: normalizedIdentifier },
  });
  const emailHash = hashIdentifier(user?.email ?? normalizedIdentifier);
  const allowedByEmail = await consumeRateLimits([
    { key: `login:email:${emailHash}`, limit: 10, windowSeconds: 900 },
  ]);
  if (!allowedByEmail || await isLoginLocked(emailHash, ipAddress)) return null;

  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  const roleMatches = user?.role === expectedRole;
  const verified = user?.role !== "SISWA" || user.emailVerifiedAt !== null;

  if (!user?.isActive || !passwordMatches || !roleMatches || !verified) {
    const reason = user && passwordMatches && !roleMatches
      ? "ROLE_MISMATCH"
      : !user
        ? "ACCOUNT_NOT_FOUND"
        : !user.isActive
          ? "ACCOUNT_INACTIVE"
          : !passwordMatches
            ? "INVALID_CREDENTIALS"
            : "EMAIL_NOT_VERIFIED";
    await writeAuditLog({
      actorId: user?.id,
      action: "LOGIN_FAILED",
      entity: "AUTH",
      entityId: emailHash,
      ipAddress,
      metadata: { identifierHash: emailHash, portal, reason },
    });
    return null;
  }

  await writeAuditLog({
    actorId: user.id,
    action: "LOGIN_SUCCESS",
    entity: "AUTH",
    entityId: emailHash,
    ipAddress,
    metadata: { identifierHash: emailHash, portal },
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function isLoginLocked(identifierHash: string, ipAddress: string) {
  const since = new Date(Date.now() - lockoutWindowSeconds * 1000);
  const where = {
    entity: "AUTH",
    action: { in: loginActivityActions },
    createdAt: { gte: since },
  };
  const [byIdentifier, byAddress] = await Promise.all([
    prisma.auditLog.findMany({
      where: { ...where, entityId: identifierHash },
      select: { action: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.auditLog.findMany({
      where: { ...where, ipAddress },
      select: { action: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return [byIdentifier, byAddress].some((activity) =>
    activity.length === 5 && activity.every((entry) => entry.action === "LOGIN_FAILED"),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    credentialsProvider("siswa-credentials", "Akun Siswa", "SISWA", true),
    credentialsProvider("admin-credentials", "Akun Admin", "ADMIN"),
    credentialsProvider("kepsek-credentials", "Akun Kepala Sekolah", "KEPSEK"),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  pages: { signIn: "/masuk" },
  callbacks: {
    jwt({ token, user }) {
      if (user && "role" in user) token.role = user.role as Role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (token.role) session.user.role = token.role as Role;
      }
      return session;
    },
  },
});