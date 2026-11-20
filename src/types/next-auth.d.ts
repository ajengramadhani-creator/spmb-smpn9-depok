import type { Role } from "@prisma/client";
import "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & NonNullable<DefaultSession["user"]>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}