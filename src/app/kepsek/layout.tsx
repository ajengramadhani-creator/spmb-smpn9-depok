import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function KepsekLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole([Role.KEPSEK]);
  return <PortalShell role="KEPSEK" name={user.name ?? "Kepala sekolah"}>{children}</PortalShell>;
}