/**
 * Fix (runtime bug) — parseSortParams used to live inside
 * sortable-header.tsx, a "use client" file. That directive marks
 * EVERY export from the file as client-only, including this pure,
 * browser-API-free function — so calling it directly from a Server
 * Component (as every admin/supplier list page does) threw "Attempted
 * to call parseSortParams() from the server" at runtime. Moved here,
 * a plain module with no "use client", so it's safely callable from
 * both server and client code.
 */
export function parseSortParams(
  searchParams: { sort?: string; dir?: string },
  allowedFields: string[],
  defaultField: string,
  defaultDir: "asc" | "desc" = "desc"
): { field: string; dir: "asc" | "desc" } {
  const field = searchParams.sort && allowedFields.includes(searchParams.sort) ? searchParams.sort : defaultField;
  const dir = searchParams.dir === "asc" || searchParams.dir === "desc" ? searchParams.dir : defaultDir;
  return { field, dir };
}
