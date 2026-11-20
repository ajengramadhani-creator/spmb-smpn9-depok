import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export class RoleAuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Silakan masuk terlebih dahulu." : "Anda tidak memiliki izin.");
    this.name = "RoleAuthorizationError";
  }
}

export async function requireRole(
  allowedRoles: Role[],
  options: { redirectOnFailure?: boolean } = {},
) {
  const session = await auth();
  if (!session?.user) {
    if (options.redirectOnFailure !== false) redirect("/masuk");
    throw new RoleAuthorizationError(401);
  }
  if (!session.user.id) {
    if (options.redirectOnFailure !== false) redirect("/masuk");
    throw new RoleAuthorizationError(401);
  }
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    if (options.redirectOnFailure !== false) redirect("/akses-ditolak");
    throw new RoleAuthorizationError(403);
  }
  const userId = session.user.id;
  return { ...session.user, id: userId };
}

export function roleErrorResponse(error: unknown) {
  if (!(error instanceof RoleAuthorizationError)) throw error;
  return Response.json({ pesan: error.message }, { status: error.status });
}