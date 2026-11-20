import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function SiswaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole([Role.SISWA]);
  return <PortalShell role="SISWA" name={user.name ?? "Calon murid"}>{children}</PortalShell>;
}