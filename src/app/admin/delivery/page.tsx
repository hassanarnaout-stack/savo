import { prisma } from "@/lib/prisma";
import {
  AssignPartnerControl,
  DeliveryStatusControl,
  AddPartnerForm,
  PartnerStatusToggle,
} from "@/components/admin/delivery-controls";
import { AddDriverForm, AssignDriverControl } from "@/components/admin/fleet-controls";

export default async function AdminDeliveryPage() {
  const [needsAssignment, activeDeliveries, partners, drivers] = await Promise.all([
    // Supplier orders that are SHIPPED (ready to hand off) but have no Delivery record yet
    prisma.supplierOrder.findMany({
      where: { status: "SHIPPED", delivery: null },
      include: { supplier: { select: { companyName: true } }, order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    prisma.delivery.findMany({
      where: { status: { not: "DELIVERED" } },
      include: {
        partner: true,
        driver: true,
        supplierOrder: { include: { supplier: { select: { companyName: true } }, order: { select: { orderNumber: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.deliveryPartner.findMany({ orderBy: { name: "asc" } }),
    prisma.deliveryDriver.findMany({ orderBy: { name: "asc" } }),
  ]);

  const activePartners = partners.filter((p) => p.status === "ACTIVE");

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Delivery Management</h1>

      <section className="mb-6 rounded-xl2 border border-black/5 bg-white p-5">
        <h2 className="mb-3 font-bold">Delivery Partners</h2>
        <div className="mb-4 space-y-2">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-black/5 p-2.5 text-sm">
              <span>{p.name} <span className="text-saveo-emerald-700/40">· {p.phone}</span></span>
              <PartnerStatusToggle partnerId={p.id} status={p.status} />
            </div>
          ))}
          {partners.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No delivery partners yet — add one below.</p>}
        </div>
        <AddPartnerForm />
      </section>

      <section className="mb-6 rounded-xl2 border border-black/5 bg-white p-5">
        <h2 className="mb-3 font-bold">Fleet Drivers</h2>
        <div className="mb-4 space-y-2">
          {drivers.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-black/5 p-2.5 text-sm">
              <span>{d.name} <span className="text-saveo-emerald-700/40">· {d.phone}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${d.status === "AVAILABLE" ? "bg-saveo-emerald-100 text-saveo-emerald-800" : d.status === "ON_DELIVERY" ? "bg-amber-100 text-amber-700" : "bg-black/5 text-saveo-emerald-700/50"}`}>
                {d.status}
              </span>
            </div>
          ))}
          {drivers.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No drivers yet — add one below.</p>}
        </div>
        <AddDriverForm partners={partners} />
      </section>

      <section className="mb-6 rounded-xl2 border border-black/5 bg-white p-5">
        <h2 className="mb-3 font-bold">Needs Delivery Assignment</h2>
        <div className="space-y-2">
          {needsAssignment.map((so) => (
            <div key={so.id} className="flex items-center justify-between rounded-lg border border-black/5 p-3 text-sm">
              <span>
                {so.supplierOrderNumber} <span className="text-saveo-emerald-700/40">· {so.supplier.companyName} · {so.order.orderNumber}</span>
              </span>
              <AssignPartnerControl supplierOrderId={so.id} partners={activePartners} />
            </div>
          ))}
          {needsAssignment.length === 0 && <p className="text-sm text-saveo-emerald-700/40">Nothing waiting for assignment.</p>}
        </div>
      </section>

      <section className="rounded-xl2 border border-black/5 bg-white p-5">
        <h2 className="mb-3 font-bold">Active Deliveries</h2>
        <div className="space-y-2">
          {activeDeliveries.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/5 p-3 text-sm">
              <span>
                {d.supplierOrder.supplierOrderNumber}{" "}
                <span className="text-saveo-emerald-700/40">
                  · {d.supplierOrder.supplier.companyName} · {d.supplierOrder.order.orderNumber} · {d.partner?.name ?? "unassigned"}
                  {d.driver && ` · Driver: ${d.driver.name}`}
                </span>
              </span>
              <div className="flex items-center gap-2">
                {!d.driver && <AssignDriverControl deliveryId={d.id} drivers={drivers.map((dr) => ({ id: dr.id, name: dr.name, status: dr.status }))} />}
                <DeliveryStatusControl deliveryId={d.id} currentStatus={d.status} hasOtp={!!d.deliveryOtp} />
              </div>
            </div>
          ))}
          {activeDeliveries.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No active deliveries.</p>}
        </div>
      </section>
    </div>
  );
}
