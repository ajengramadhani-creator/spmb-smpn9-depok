import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, id, ...props },
  ref,
) {
  return (
    <div className="w-full">
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className={cn(
          "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-100 aria-[invalid=true]:border-danger",
          className,
        )}
        {...props}
      />
      {error && <p id={id ? `${id}-error` : undefined} className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});