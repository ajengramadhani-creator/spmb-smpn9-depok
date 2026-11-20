import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Menunggu: "bg-amber-50 text-amber-700 ring-amber-200",
  Diterima: "bg-green-50 text-green-700 ring-green-200",
  Ditolak: "bg-red-50 text-red-700 ring-red-200",
  Draf: "bg-slate-100 text-slate-600 ring-slate-200",
  Lunas: "bg-green-50 text-green-700 ring-green-200",
  Lulus: "bg-green-50 text-green-700 ring-green-200",
  "Tidak Lulus": "bg-red-50 text-red-700 ring-red-200",
  Cadangan: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", statusStyles[status] ?? statusStyles.Draf, className)}>
      {status}
    </span>
  );
}