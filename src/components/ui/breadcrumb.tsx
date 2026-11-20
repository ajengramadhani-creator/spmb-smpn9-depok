import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Navigasi lokasi" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight aria-hidden="true" className="size-3.5" />}
            {item.href ? <Link className="hover:text-primary" href={item.href}>{item.label}</Link> : <span aria-current="page" className="font-medium text-slate-900">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}