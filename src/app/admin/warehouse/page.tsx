import { prisma } from "@/lib/prisma";
import { WarehouseService } from "@/lib/services/warehouse-service";
import { PickingService } from "@/lib/services/picking-service";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { AddLocationForm, PutAwayForm, CreatePickListButton, PickItemButton, PackButton } from "@/components/admin/warehouse-controls";

export default async function WarehousePage() {
  const [locations, products, pickLists, readyToPickOrders] = await Promise.all([
    WarehouseService.getLocations(),
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 }),
    PickingService.getAll(),
    prisma.supplierOrder.findMany({
      where: { status: "ACCEPTED", pickList: null },
      select: { id: true, orderId: true, order: { select: { orderNumber: true } }, supplier: { select: { companyName: true } } },
      take: 20,
    }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Warehouse" }]} />
      <h1 className="mb-6 text-2xl font-bold">Warehouse Operations</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-saveo-emerald-700">📍 Locations ({locations.length})</h2>
          <AddLocationForm />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {locations.map((l) => (
              <span key={l.id} className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium">{l.code}</span>
            ))}
            {locations.length === 0 && <p className="text-xs text-saveo-emerald-700/40">No locations yet — add one above before putting away stock.</p>}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-bold text-saveo-emerald-700">📦 Put Away</h2>
          <p className="mb-2 text-xs text-saveo-emerald-700/50">Assigns received-but-unassigned stock to a shelf location. Never changes total stock — only where it physically sits.</p>
          <PutAwayForm products={products} locations={locations.map((l) => ({ id: l.id, code: l.code }))} />
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">📋 Orders Ready to Pick</h2>
        <div className="space-y-2">
          {readyToPickOrders.map((so) => (
            <div key={so.id} className="flex items-center justify-between rounded-xl2 border border-black/5 bg-white p-4 text-sm">
              <span>{so.order.orderNumber} — {so.supplier.companyName}</span>
              <CreatePickListButton supplierOrderId={so.id} />
            </div>
          ))}
          {readyToPickOrders.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No accepted orders waiting for a pick list right now.</p>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">🚚 Active Pick Lists</h2>
        <div className="space-y-3">
          {pickLists.map((pl) => (
            <div key={pl.id} className="rounded-xl2 border border-black/5 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">{pl.supplierOrder.order.orderNumber} — {pl.supplierOrder.supplier.companyName}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold">{pl.status}</span>
                  {pl.status === "PICKED" && <PackButton pickListId={pl.id} />}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {pl.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className={item.isPicked ? "line-through opacity-40" : ""}>
                      {item.quantity}× {item.product.name} {item.location ? `(${item.location.code})` : "(no location assigned)"}
                    </span>
                    {!item.isPicked && <PickItemButton pickListItemId={item.id} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {pickLists.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No active pick lists.</p>}
        </div>
      </section>
    </div>
  );
}
