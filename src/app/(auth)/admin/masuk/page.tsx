import type { Metadata } from "next";
import { PortalLoginPage } from "@/components/auth/portal-login-page";

export const metadata: Metadata = { title: "Masuk administrator" };

export default function AdminLoginPage() {
  return <PortalLoginPage role="ADMIN" />;
}
