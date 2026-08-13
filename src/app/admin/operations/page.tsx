import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatKWD } from "@/lib/utils";
import { ShoppingBag, DollarSign, Building2, ClipboardCheck, AlertTriangle, CreditCard, MessageCircleWarning } from "lucide-react";

/**
 * Operations Dashboard — Phase 5 (Closed Beta Launch Preparation).
 *
 * Deliberately NOT an analytics dashboard (no trends, no charts, no
 * historical comparison) — this answers one question only: "what needs
 * my attention today?" It's meant to be the first thing someone running
 * daily operations checks each morning during the beta.
 */
export default async function AdminOperationsPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    ordersToday,
    salesTodayAgg,
    newSuppliersToday,
    pendingProductApprovals,
    pendingSupplierReviews,
    activeProductStock,
    failedPayments,
    openIssues,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: startOfToday } }, _sum: { total: true } }),
    prisma.supplier.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.product.count({ where: { approvalStatus: "PENDING_REVIEW" } }),
    prisma.supplier.count({ where: { verificationStatus: "PENDING" } }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, stockQty: true, lowStockAlert: true, supplier: { select: { companyName: true } } },
    }),
    prisma.order.count({ where: { paymentStatus: "FAILED" } }),
    prisma.orderIssue.count({ where: { status: "OPEN" } }),
  ]);

  // Comparing two fields of the same row (stockQty <= lowStockAlert) isn't
  // expressible in a single Prisma `where` filter, so we filter in-memory
  // here — the product catalog is small enough at this stage that this is
  // simpler and clearer than a raw SQL query for the same result.
  const lowStockProducts = activeProductStock.filter((p) => p.stockQty <= p.lowStockAlert).slice(0, 10);

  const cards = [
    { label: "Orders Today", value: ordersToday, icon: ShoppingBag, href: "/admin/orders", tone: "emerald" },
    { label: "Sales Today", value: formatKWD(Number(salesTodayAgg._sum.total ?? 0)), icon: DollarSign, href: "/admin/orders", tone: "emerald" },
    { label: "New Suppliers Today", value: newSuppliersToday, icon: Building2, href: "/admin/suppliers", tone: "emerald" },
    { label: "Pending Product Approvals", value: pendingProductApprovals, icon: ClipboardCheck, href: "/admin/products/pending", tone: pendingProductApprovals > 0 ? "amber" : "emerald" },
    { label: "Pending Supplier Reviews", value: pendingSupplierReviews, icon: Building2, href: "/admin/suppliers", tone: pendingSupplierReviews > 0 ? "amber" : "emerald" },
    { label: "Low Stock Products", value: lowStockProducts.length, icon: AlertTriangle, href: "/admin/products", tone: lowStockProducts.length > 0 ? "red" : "emerald" },
    { label: "Failed Payments", value: failedPayments, icon: CreditCard, href: "/admin/orders", tone: failedPayments > 0 ? "red" : "emerald" },
    { label: "Open Customer Issues", value: openIssues, icon: MessageCircleWarning, href: "/admin/support", tone: openIssues > 0 ? "red" : "emerald" },
  ];

  const toneClasses = {
    emerald: "bg-saveo-emerald-50 text-saveo-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">Operations Dashboard</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        What needs attention today — {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className={`rounded-xl2 p-5 transition-opacity hover:opacity-80 ${toneClasses[card.tone as keyof typeof toneClasses]}`}>
            <card.icon className="h-6 w-6" />
            <p className="mt-3 text-2xl font-black">{card.value}</p>
            <p className="text-xs font-semibold">{card.label}</p>
          </Link>
        ))}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="mt-6 rounded-xl2 border border-red-100 bg-red-50/50 p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4" /> Low Stock — needs restocking
          </h2>
          <ul className="space-y-1.5 text-sm">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name} <span className="text-red-600/60">({p.supplier.companyName})</span></span>
                <span className="font-semibold text-red-700">{p.stockQty} left (alert at {p.lowStockAlert})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
