import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export default async function WorkspaceRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/masuk");
  if (session.user.role === "ADMIN") redirect("/admin");
  if (session.user.role === "KEPSEK") redirect("/kepsek");
  redirect("/siswa");
}