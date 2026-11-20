import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, id, ...props },
  ref,
) {
  return (
    <div className="w-full">
      <textarea
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className={cn(
          "min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-danger",
          className,
        )}
        {...props}
      />
      {error && <p id={id ? `${id}-error` : undefined} className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});