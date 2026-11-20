import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-pale text-primary"><Inbox aria-hidden="true" className="size-5" /></span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}