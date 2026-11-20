import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-blue-700",
        secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        outline: "border border-primary/30 bg-transparent text-primary hover:bg-pale",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        danger: "bg-danger text-white hover:bg-red-600",
        link: "h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline",
      },
      size: { default: "", sm: "h-9 px-3 text-xs", lg: "h-12 px-6", icon: "size-11 p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & { loading?: boolean };

export function Button({ className, variant, size, loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonStyles({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </button>
  );
}