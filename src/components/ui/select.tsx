import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { error?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, error, id, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className={cn(
          "h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-9 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-100 aria-[invalid=true]:border-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      {error && <p id={id ? `${id}-error` : undefined} className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});