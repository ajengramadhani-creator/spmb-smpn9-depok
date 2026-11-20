import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole([Role.ADMIN]);
  return <PortalShell role="ADMIN" name={user.name ?? "Administrator"}>{children}</PortalShell>;
}