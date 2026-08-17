import { prisma } from "@/lib/prisma";
import { QuickWayShortcutControls } from "@/components/admin/quick-way-shortcut-controls";
import { QUICK_WAY_DESTINATIONS } from "@/lib/quick-way-destinations";

export default async function DiscoverQuickWaysPage() {
  const shortcuts = await prisma.quickWayShortcut.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-xl font-bold mb-1">Discover — Quick Ways In</h1>
      <p className="text-sm text-saveo-muted mb-6">
        Controls the shortcut row on the customer Discover page. Only enabled items, in this order,
        up to 8, are shown — the section disappears entirely when nothing is enabled.
      </p>
      <QuickWayShortcutControls
        shortcuts={shortcuts.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() }))}
        destinations={QUICK_WAY_DESTINATIONS}
      />
    </div>
  );
}
