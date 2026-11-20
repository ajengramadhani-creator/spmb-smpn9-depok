import { CircleCheck, CircleAlert, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const icons = { success: CircleCheck, error: CircleAlert, info: Info };

export function Toast({
  title,
  description,
  variant = "success",
  onClose,
}: {
  title: string;
  description?: string;
  variant?: keyof typeof icons;
  onClose?: () => void;
}) {
  const Icon = icons[variant];
  return (
    <div role="status" className="flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", variant === "success" ? "text-success" : variant === "error" ? "text-danger" : "text-primary")} />
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy">{title}</p>{description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}</div>
      {onClose && <Button variant="ghost" size="icon" className="-mr-2 -mt-2 size-8" aria-label="Tutup notifikasi" onClick={onClose}><X aria-hidden="true" className="size-4" /></Button>}
    </div>
  );
}