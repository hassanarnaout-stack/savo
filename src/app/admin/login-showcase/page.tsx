import { LoginShowcaseControls } from "@/components/admin/login-showcase-controls";
import { LoginShowcaseService } from "@/lib/services/login-showcase-service";
import { prisma } from "@/lib/prisma";

export default async function AdminLoginShowcasePage() {
  const [settings, products] = await Promise.all([
    LoginShowcaseService.get(),
    prisma.product.findMany({
      where: { status: "ACTIVE", approvalStatus: "APPROVED" },
      select: { id: true, name: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
      take: 300,
    }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-2 text-2xl font-bold">Login Showcase Products</h1>
      <p className="mb-6 text-sm text-saveo-muted">Pick 3 real catalog products to display on the customer /login page's identity panel (Left / Center / Right positions). Changes apply the next time the Login page loads.</p>
      <LoginShowcaseControls
        products={products.map((p) => ({ id: p.id, name: p.name, image: p.images[0]?.url ?? null }))}
        initial={{ leftProductId: settings.leftProductId, centerProductId: settings.centerProductId, rightProductId: settings.rightProductId }}
      />
    </div>
  );
}
