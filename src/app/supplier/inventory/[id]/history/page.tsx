import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

const ACTION_LABELS: Record<string, string> = {
  MANUAL_UPDATE: "Manual update",
  RESTOCK: "Restock",
  ORDER_RESERVED: "Reserved for order",
  ORDER_RELEASED: "Reservation released",
  ORDER_COMPLETED: "Order delivered",
};

export default async function InventoryHistoryPage({ params }: Props) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    switch (gate.reason) {
      case "NOT_AUTHENTICATED":
        redirect("/login?callbackUrl=/supplier/inventory");
      case "WRONG_ROLE":
        redirect("/");
      case "NO_SUPPLIER_PROFILE":
        redirect("/supplier/register");
      case "PENDING":
        redirect("/supplier/pending");
      case "REJECTED":
        redirect("/supplier/rejected");
      case "SUSPENDED":
        redirect("/supplier/suspended");
    }
  }
  const { supplier } = gate;

  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, supplierId: true } });
  if (!product || product.supplierId !== supplier.id) notFound();

  const history = await prisma.inventoryHistory.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/supplier/inventory" className="mb-4 flex items-center gap-1.5 text-sm text-saveo-emerald-700/60">
        <ArrowLeft className="h-4 w-4" /> Back to Inventory
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-saveo-emerald-700">{product.name}</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">Stock movement history</p>

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Previous</th>
              <th className="px-4 py-3">New</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">By</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 text-saveo-emerald-700/60">
                  {new Date(h.createdAt).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-3">{ACTION_LABELS[h.actionType] ?? h.actionType}</td>
                <td className="px-4 py-3">{h.previousQuantity}</td>
                <td className="px-4 py-3">{h.newQuantity}</td>
                <td className={`px-4 py-3 font-semibold ${h.difference >= 0 ? "text-saveo-emerald-600" : "text-red-600"}`}>
                  {h.difference >= 0 ? "+" : ""}{h.difference}
                </td>
                <td className="px-4 py-3 text-saveo-emerald-700/60">{h.user?.name ?? h.user?.email ?? "System"}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-saveo-emerald-700/40">
                  No stock movements recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
