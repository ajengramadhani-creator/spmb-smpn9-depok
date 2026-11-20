import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  trend?: "naik" | "turun";
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="grid size-10 place-items-center rounded-lg bg-pale text-primary"><Icon aria-hidden="true" className="size-5" /></span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-normal text-navy">{value}</p>
      {detail && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
        {trend === "naik" && <ArrowUpRight aria-hidden="true" className="size-3.5 text-success" />}
        {trend === "turun" && <ArrowDownRight aria-hidden="true" className="size-3.5 text-danger" />}
        {detail}
      </p>}
    </section>
  );
}