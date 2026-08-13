import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string; // omit for the current page (last item, not a link)
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-saveo-emerald-700/50">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-saveo-emerald-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-saveo-emerald-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
