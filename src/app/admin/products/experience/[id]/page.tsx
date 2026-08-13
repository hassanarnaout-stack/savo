import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { StoryStepManager, IngredientManager, NutritionManager, BadgeManager, FlavorManager } from "@/components/admin/product-experience-editor-controls";
import { Product360FrameManager } from "@/components/admin/product-360-frame-manager";

export default async function ProductExperienceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      storySteps: { orderBy: { sortOrder: "asc" } },
      ingredients: { orderBy: { sortOrder: "asc" } },
      nutritionFact: true,
      badges: true,
      flavorProfile: true,
      media: { where: { type: "IMAGE_360" }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

  return (
    <div className="p-6 sm:p-8">
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Product Experience", href: "/admin/products/experience" }, { label: product.name }]} />
      <h1 className="mb-6 text-2xl font-bold">{product.name} — Experience Editor</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <StoryStepManager productId={product.id} steps={product.storySteps} />
        <IngredientManager productId={product.id} ingredients={product.ingredients} />
        <NutritionManager productId={product.id} existing={product.nutritionFact} />
        <FlavorManager productId={product.id} existing={product.flavorProfile} />
        <BadgeManager productId={product.id} activeBadges={product.badges.map((b) => b.type)} />
        <Product360FrameManager productId={product.id} frames={product.media} />
      </div>
    </div>
  );
}
