"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

/**
 * SortableHeader — Phase 5.3 §7
 *
 * URL-driven (not client-side array sorting) so it works correctly with
 * paginated, server-rendered tables — clicking a header just navigates
 * to `?sort=field&dir=asc|desc`, and the page's own Prisma query reads
 * those params to build its `orderBy`. One component, reusable across
 * every admin/supplier table.
 */
export function SortableHeader({ field, label }: { field: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort");
  const currentDir = searchParams.get("dir") ?? "asc";
  const isActive = currentSort === field;

  // 3-state cycle: first click = asc, second click = desc, third click = remove sorting entirely.
  function handleClick() {
    const params = new URLSearchParams(searchParams.toString());
    if (!isActive) {
      params.set("sort", field);
      params.set("dir", "asc");
    } else if (currentDir === "asc") {
      params.set("sort", field);
      params.set("dir", "desc");
    } else {
      params.delete("sort");
      params.delete("dir");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const Icon = !isActive ? ArrowUpDown : currentDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 font-semibold hover:text-saveo-emerald-700 ${isActive ? "text-saveo-emerald-700" : "text-saveo-emerald-700/50"}`}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}
