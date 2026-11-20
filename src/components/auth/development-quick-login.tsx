import { BookOpenCheck, GraduationCap, Landmark } from "lucide-react";
import { developmentQuickLoginAction } from "@/lib/auth/development-login-action";

const demoAccounts = [
  { role: "SISWA", label: "Masuk sebagai Siswa Demo", icon: GraduationCap },
  { role: "ADMIN", label: "Masuk sebagai Admin Demo", icon: BookOpenCheck },
  { role: "KEPSEK", label: "Masuk sebagai Kepsek Demo", icon: Landmark },
] as const;

export function DevelopmentQuickLoginPanel() {
  return (
    <aside className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5" aria-labelledby="demo-login-heading">
      <h2 id="demo-login-heading" className="text-sm font-bold text-amber-950">Mode pengembangan: akun demo</h2>
      <p className="mt-1 text-xs leading-5 text-amber-900">Masuk cepat untuk meninjau setiap portal lokal. Tombol ini hanya tersedia saat development.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {demoAccounts.map(({ role, label, icon: Icon }) => (
          <form key={role} action={developmentQuickLoginAction}>
            <button
              type="submit"
              name="role"
              value={role}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {label}
            </button>
          </form>
        ))}
      </div>
    </aside>
  );
}
