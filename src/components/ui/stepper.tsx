import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <ol aria-label="Tahapan pendaftaran" className="flex w-full items-start">
      {steps.map((step, index) => {
        const complete = index < currentStep;
        const active = index === currentStep;
        return (
          <li key={step} className={cn("relative flex flex-1 flex-col items-center text-center", index < steps.length - 1 && "after:absolute after:left-1/2 after:top-4 after:h-0.5 after:w-full after:bg-slate-200", complete && index < steps.length - 1 && "after:bg-primary")}>
            <span className={cn("relative z-10 grid size-8 place-items-center rounded-full border text-xs font-semibold", complete && "border-primary bg-primary text-white", active && "border-primary bg-white text-primary ring-4 ring-pale", !complete && !active && "border-slate-300 bg-white text-slate-500")}>
              {complete ? <Check aria-hidden="true" className="size-4" /> : index + 1}
            </span>
            <span className={cn("mt-2 max-w-24 text-xs", active ? "font-semibold text-primary" : "text-slate-500")}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}