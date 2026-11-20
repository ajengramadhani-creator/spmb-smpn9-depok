import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { clientAddress, consumeRateLimits, hashIdentifier } from "@/lib/auth/rate-limit";
import { writeAuditLog } from "@/lib/audit/log";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email atau NISN", type: "text" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(credentials, request) {
        const identifier = credentials.identifier;
        const password = credentials.password;
        if (typeof identifier !== "string" || typeof password !== "string") return null;

        const normalizedIdentifier = identifier.trim().toLowerCase();
        const allowed = await consumeRateLimits([
          { key: `login:ip:${hashIdentifier(clientAddress(request.headers))}`, limit: 10, windowSeconds: 900 },
          { key: `login:identifier:${hashIdentifier(normalizedIdentifier)}`, limit: 10, windowSeconds: 900 },
        ]);
        if (!allowed) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: normalizedIdentifier },
              { student: { nationalId: normalizedIdentifier } },
            ],
          },
        });
        const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
        const verified = user?.role !== "SISWA" || user.emailVerifiedAt !== null;

        if (!user?.isActive || !passwordMatches || !verified) {
          await writeAuditLog({
            actorId: user?.id,
            action: "LOGIN_FAILED",
            entity: "AUTH",
            ipAddress: clientAddress(request.headers),
            metadata: {
              identifierHash: hashIdentifier(normalizedIdentifier),
              reason: !user ? "ACCOUNT_NOT_FOUND" : !user.isActive ? "ACCOUNT_INACTIVE" : !passwordMatches ? "INVALID_CREDENTIALS" : "EMAIL_NOT_VERIFIED",
            },
          });
          return null;
        }

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
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