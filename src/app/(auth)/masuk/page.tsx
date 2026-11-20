import type { Metadata } from "next";
import { PortalLoginPage } from "@/components/auth/portal-login-page";

export const metadata: Metadata = { title: "Masuk siswa" };

export default function StudentLoginPage() {
  return <PortalLoginPage role="SISWA" />;
}
