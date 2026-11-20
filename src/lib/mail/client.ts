import { Resend } from "resend";
import { getEnv } from "@/lib/env";

export async function sendTransactionalEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      const safeHtml = html.replace(/([?&]token=)[^&" ]+/g, "$1[REDACTED]");
      console.info("Pratinjau email transaksi development (token disamarkan):", { to, subject, html: safeHtml });
      return;
    }
    throw new Error("Layanan email belum dikonfigurasi. Isi RESEND_API_KEY untuk lingkungan production.");
  }
  const resend = new Resend(env.RESEND_API_KEY);
  const result = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  if (result.error) throw new Error("Email tidak dapat dikirim melalui Resend.");
  return result;
}