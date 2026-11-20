import type { Metadata } from "next";
import { PortalLoginPage } from "@/components/auth/portal-login-page";

export const metadata: Metadata = { title: "Masuk kepala sekolah" };

export default function PrincipalLoginPage() {
  return <PortalLoginPage role="KEPSEK" />;
}
