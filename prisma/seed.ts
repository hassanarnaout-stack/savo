import { PrismaClient, RelationType, ProductType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/600/600`;

async function main() {
  console.log("Seeding Saveo V2 (Marketplace)...\n");

  // ---- Suppliers ----
  const supplierDefs = [
    {
      slug: "sultan-sweets-trading",
      companyName: "Sultan Sweets Trading Co.",
      companyNameAr: "شركة سلطان للحلويات التجارية",
      email: "orders@sultansweets.example",
      phone: "+965 2222 1111",
      commissionRate: 15,
      description: "A trusted Kuwaiti importer of premium chocolates and confectionery since 2009.",
      descriptionAr: "شركة كويتية موثوقة لاستيراد الشوكولاتة والحلويات الفاخرة منذ عام 2009.",
    },
    {
      slug: "kuwait-pantry-supplies",
      companyName: "Kuwait Pantry Supplies",
      companyNameAr: "مؤن الكويت الغذائية",
      email: "orders@kuwaitpantry.example",
      phone: "+965 2222 2222",
      commissionRate: 12,
      description: "Wholesale pantry staples and snacks, supplying Kuwait's retailers for over a decade.",
      descriptionAr: "مواد غذائية وسناكس بالجملة، تزوّد تجار التجزئة في الكويت منذ أكثر من عقد.",
    },
    {
      slug: "gulf-surplus-partners",
      companyName: "Gulf Surplus Partners",
      companyNameAr: "شركاء الفائض الخليجي",
      email: "orders@gulfsurplus.example",
      phone: "+965 2222 3333",
      commissionRate: 18,
      description: "Specialists in verified-safe overstock and near-expiry inventory recovery.",
      descriptionAr: "متخصصون في استرداد المخزون الفائض والمنتجات قريبة الانتهاء الآمنة والموثقة.",
    },
  ];

  const suppliers: Record<string, any> = {};
  for (const def of supplierDefs) {
    suppliers[def.slug] = await prisma.supplier.upsert({
      where: { slug: def.slug },
      update: {},
      create: { ...def, status: "ACTIVE", verificationStatus: "VERIFIED" },
    });
  }

  // ---- Users: admin, supplier owners, customer ----
  await prisma.user.upsert({
    where: { email: "admin@saveo.com.kw" },
    update: {},
    create: {
      name: "Saveo Admin",
      email: "admin@saveo.com.kw",
      passwordHash: await bcrypt.hash("Admin1234!", 10),
      role: "ADMIN",
    },
  });

  const supplierUser = await prisma.user.upsert({
    where: { email: "supplier@sultansweets.example" },
    update: {},
    create: {
      name: "Sultan Sweets — Owner",
      email: "supplier@sultansweets.example",
      passwordHash: await bcrypt.hash("Supplier1234!", 10),
      role: "SUPPLIER",
    },
  });
  await prisma.supplier.update({
    where: { slug: "sultan-sweets-trading" },
    data: { ownerUserId: supplierUser.id },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "Sara Al-Fahad",
      email: "customer@example.com",
      passwordHash: await bcrypt.hash("Customer1234!", 10),
      role: "CUSTOMER",
    },
  });

  // Saveo Plus membership for this demo customer is created further down,
  // after the plan + pricing options exist (see "Membership Plans" section).

  // ---- Categories (fully data-driven; add more anytime via /admin/categories) ----
  const categoryDefs = [
    { name: "Food & Snacks", nameAr: "أطعمة ووجبات خفيفة", slug: "food-snacks", icon: "🍿", isFeatured: true, sortOrder: 1 },
    { name: "Chocolates & Sweets", nameAr: "شوكولاتة وحلويات", slug: "chocolates-sweets", icon: "🍫", isFeatured: true, sortOrder: 2 },
    { name: "Saveo Deals", nameAr: "عروض سافيو", slug: "saveo-deals", icon: "⚡", isFeatured: true, sortOrder: 3, displayType: "deals" },
    { name: "Mystery Boxes", nameAr: "صناديق المفاجآت", slug: "mystery-boxes", icon: "🎁", isFeatured: true, sortOrder: 4, displayType: "mystery" },
    { name: "Saveo Rescue Deals", nameAr: "عروض الإنقاذ", slug: "saveo-rescue-deals", icon: "🛟", isFeatured: true, sortOrder: 5, displayType: "rescue" },
    { name: "Cleaning Supplies", nameAr: "منظفات", slug: "cleaning-supplies", icon: "🧽", isFeatured: true, sortOrder: 6 },
    { name: "Dairy", nameAr: "ألبان", slug: "dairy", icon: "🥛", isFeatured: true, sortOrder: 7 },
    { name: "Cheese", nameAr: "أجبان", slug: "cheese", icon: "🧀", isFeatured: true, sortOrder: 8 },
    { name: "Juices", nameAr: "عصائر", slug: "juices", icon: "🧃", isFeatured: true, sortOrder: 9 },
    { name: "Plastic Dishes", nameAr: "أطباق بلاستيك", slug: "plastic-dishes", icon: "🍽️", isFeatured: true, sortOrder: 10 },
    { name: "Personal Care", nameAr: "العناية الشخصية", slug: "personal-care", icon: "🧴", isFeatured: true, sortOrder: 11 },
    { name: "Perfumes", nameAr: "عطور", slug: "perfumes", icon: "🌸", isFeatured: true, sortOrder: 12 },
    { name: "Kitchen Supplies", nameAr: "مستلزمات مطبخ", slug: "kitchen-supplies", icon: "🍳", isFeatured: true, sortOrder: 13 },
    { name: "Water", nameAr: "مياه", slug: "water", icon: "💧", isFeatured: true, sortOrder: 14 },
    { name: "Coffee", nameAr: "قهوة", slug: "coffee", icon: "☕", isFeatured: true, sortOrder: 15 },
  ];

  const categories: Record<string, any> = {};
  for (const def of categoryDefs) {
    categories[def.slug] = await prisma.category.upsert({
      where: { slug: def.slug },
      update: {},
      create: { ...def, isActive: true },
    });
  }

  // Bonus fix: the pre-existing "kitchen" category (added manually via /admin/categories) had no icon. Only touches the icon field, and only if it's still empty — never overwrites a manual edit.
  await prisma.category.updateMany({
    where: { slug: "kitchen", OR: [{ icon: null }, { icon: "" }] },
    data: { icon: "🍴" },
  });

  const dealEnds = new Date(Date.now() + 1000 * 60 * 60 * 30);
  const hourFromNow = new Date(Date.now() + 1000 * 60 * 60);

  // ---- Products, each owned by a supplier ----
  const productDefs: any[] = [
    {
      key: "ferrero",
      name: "Ferrero Rocher 24-Piece Box",
      nameAr: "فيريرو روشيه علبة 24 قطعة",
      slug: "ferrero-rocher-24-piece-box",
      description: "The iconic hazelnut chocolate, gold-wrapped for gifting or self-indulgence.",
      descriptionAr: "شوكولاتة البندق الشهيرة، مغلفة بالذهبي للإهداء أو للتدليل الشخصي.",
      category: "chocolates-sweets",
      supplier: "sultan-sweets-trading",
      brandName: "Ferrero Rocher",
      type: ProductType.DEAL,
      originalPrice: 6.9,
      saveoPrice: 4.2,
      stockQty: 60,
      dealEndsAt: dealEnds,
    },
    {
      key: "lindt",
      name: "Lindt Excellence Dark Chocolate 100g",
      nameAr: "ليندت اكسلنس شوكولاتة داكنة 100غ",
      slug: "lindt-excellence-dark-chocolate-100g",
      description: "Premium Swiss dark chocolate, 70% cocoa.",
      descriptionAr: "شوكولاتة سويسرية داكنة فاخرة، 70% كاكاو.",
      category: "chocolates-sweets",
      supplier: "sultan-sweets-trading",
      brandName: "Lindt",
      type: ProductType.STANDARD,
      originalPrice: 2.5,
      saveoPrice: 1.75,
      stockQty: 120,
    },
    {
      key: "kitkat",
      name: "KitKat Chunky Multipack (6x)",
      nameAr: "كيت كات تشنكي عبوة 6 قطع",
      slug: "kitkat-chunky-multipack-6x",
      description: "Six chunky KitKat bars for the snack drawer.",
      descriptionAr: "ست قطع من كيت كات تشنكي لدرج السناكس.",
      category: "chocolates-sweets",
      supplier: "sultan-sweets-trading",
      brandName: "KitKat",
      type: ProductType.STANDARD,
      originalPrice: 3.2,
      saveoPrice: 2.1,
      stockQty: 4,
      lowStockAlert: 5,
    },
    {
      key: "juice",
      name: "Rani Mixed Fruit Juice 6-Pack",
      nameAr: "عصير راني فواكه مشكلة عبوة 6",
      slug: "rani-mixed-fruit-juice-6-pack",
      description: "Refreshing mixed fruit juice, perfect with any sweet treat.",
      descriptionAr: "عصير فواكه مشكلة منعش، مثالي مع أي حلوى.",
      category: "food-snacks",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 2.4,
      saveoPrice: 1.6,
      stockQty: 200,
    },
    {
      key: "chips",
      name: "Lay's Classic Potato Chips Family Pack",
      nameAr: "ليز كلاسيك عبوة عائلية",
      slug: "lays-classic-potato-chips-family-pack",
      description: "Crispy, salty, family-size favorite.",
      descriptionAr: "مقرمشة ومالحة، الحجم العائلي المفضل.",
      category: "food-snacks",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 2.0,
      saveoPrice: 1.3,
      stockQty: 150,
    },
    {
      key: "coffee",
      name: "Nespresso-Compatible Capsules 50-Pack",
      nameAr: "كبسولات قهوة متوافقة مع نسبريسو 50 كبسولة",
      slug: "nespresso-compatible-capsules-50-pack",
      description: "Rich espresso capsules compatible with Nespresso Original machines.",
      descriptionAr: "كبسولات إسبريسو غنية متوافقة مع ماكينات نسبريسو الأصلية.",
      category: "saveo-deals",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.DEAL,
      originalPrice: 12.0,
      saveoPrice: 6.5,
      stockQty: 30,
      dealEndsAt: dealEnds,
    },
    {
      key: "nuts",
      name: "Roasted Mixed Nuts 500g",
      nameAr: "مكسرات محمصة مشكلة 500غ",
      slug: "roasted-mixed-nuts-500g",
      description: "A protein-packed mix of roasted almonds, cashews, and pistachios.",
      descriptionAr: "خليط غني بالبروتين من اللوز والكاجو والفستق المحمص.",
      category: "food-snacks",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 5.5,
      saveoPrice: 3.4,
      stockQty: 45,
    },
    {
      key: "oliveoil",
      name: "Extra Virgin Olive Oil 1L — Near Expiry",
      nameAr: "زيت زيتون بكر ممتاز 1 لتر — قريب الانتهاء",
      slug: "extra-virgin-olive-oil-1l-rescue",
      description:
        "Cold-pressed extra virgin olive oil, imported and independently tested. Best before date approaching — fully safe, verified by supplier, steeply discounted.",
      descriptionAr:
        "زيت زيتون بكر ممتاز معصور على البارد ومستورد ومختبر. تاريخ الصلاحية يقترب — آمن تماماً وموثق من المورد وبخصم كبير.",
      category: "saveo-rescue-deals",
      supplier: "gulf-surplus-partners",
      type: ProductType.RESCUE,
      originalPrice: 8.9,
      saveoPrice: 2.9,
      stockQty: 18,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
    },
    {
      key: "cereal",
      name: "Overstock Breakfast Cereal Family Box",
      nameAr: "حبوب فطور عائلية — فائض مخزون",
      slug: "overstock-breakfast-cereal-family-box",
      description: "Surplus stock from a packaging redesign — same product, huge discount.",
      descriptionAr: "فائض من إعادة تصميم التغليف — نفس المنتج بخصم كبير.",
      category: "saveo-rescue-deals",
      supplier: "gulf-surplus-partners",
      type: ProductType.RESCUE,
      originalPrice: 4.5,
      saveoPrice: 1.8,
      stockQty: 40,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180),
    },
    {
      key: "mysterysnack",
      name: "Saveo Snack Mystery Box",
      nameAr: "صندوق مفاجآت سناكس سافيو",
      slug: "saveo-snack-mystery-box",
      description: "A surprise assortment of premium snacks worth far more than you pay.",
      descriptionAr: "تشكيلة مفاجئة من السناكس الفاخرة بقيمة أكبر بكثير مما تدفعه.",
      category: "mystery-boxes",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.MYSTERY_BOX,
      originalPrice: 15.0,
      saveoPrice: 6.0,
      stockQty: 40,
      mysteryBoxReveal: "Contains 6-9 surprise snack & sweet items, hand-picked weekly.",
      mysteryBoxRevealAr: "يحتوي على 6-9 عناصر مفاجئة من السناكس والحلويات، يتم اختيارها أسبوعياً.",
      mysteryBoxValueMin: 12,
      mysteryBoxValueMax: 18,
      mysteryBoxTier: "BRONZE",
    },
    {
      key: "mysterychoc",
      name: "Saveo Chocolate Lovers Mystery Box",
      nameAr: "صندوق مفاجآت عشاق الشوكولاتة",
      slug: "saveo-chocolate-lovers-mystery-box",
      description: "A curated surprise box of premium chocolates and sweets from top brands.",
      descriptionAr: "صندوق مفاجآت منتقى من الشوكولاتة والحلويات الفاخرة من أفضل العلامات التجارية.",
      category: "mystery-boxes",
      supplier: "sultan-sweets-trading",
      type: ProductType.MYSTERY_BOX,
      originalPrice: 20.0,
      saveoPrice: 8.5,
      stockQty: 25,
      mysteryBoxReveal: "Contains 5-7 surprise chocolate and confectionery items from international brands.",
      mysteryBoxRevealAr: "يحتوي على 5-7 عناصر مفاجئة من الشوكولاتة والحلويات من علامات عالمية.",
      mysteryBoxValueMin: 16,
      mysteryBoxValueMax: 24,
      mysteryBoxTier: "SILVER",
    },
    {
      key: "mysterygold",
      name: "Saveo Gold Treasure Mystery Box",
      nameAr: "صندوق كنز الذهب من سافيو",
      slug: "saveo-gold-treasure-mystery-box",
      description: "Our most exclusive surprise box — premium imported goods, luxury sweets, and rare finds curated for our top discoverers.",
      descriptionAr: "أفخم صناديق المفاجآت لدينا — منتجات مستوردة فاخرة وحلويات نادرة مُنتقاة لأكثر عملائنا شغفاً بالاكتشاف.",
      category: "mystery-boxes",
      supplier: "gulf-surplus-partners",
      type: ProductType.MYSTERY_BOX,
      originalPrice: 40.0,
      saveoPrice: 15.0,
      stockQty: 12,
      mysteryBoxReveal: "Contains 4-6 premium surprise items worth at least double the price — imported specialty goods and rare finds.",
      mysteryBoxRevealAr: "يحتوي على 4-6 عناصر مفاجئة فاخرة بقيمة تعادل الضعف على الأقل — منتجات مستوردة مميزة ونادرة.",
      mysteryBoxValueMin: 30,
      mysteryBoxValueMax: 50,
      mysteryBoxTier: "GOLD",
    },
    // Demo products for previously-empty categories (Coffee, Water, Dairy)
    {
      key: "nespresso-capsules",
      name: "Nespresso-Compatible Capsules 50-Pack",
      nameAr: "كبسولات متوافقة مع نسبريسو عبوة 50 كبسولة",
      slug: "nespresso-compatible-capsules-50-pack",
      description: "Rich, aromatic coffee capsules compatible with Nespresso Original Line machines.",
      descriptionAr: "كبسولات قهوة غنية وعطرية متوافقة مع أجهزة نسبريسو الأصلية.",
      category: "coffee",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 12.0,
      saveoPrice: 6.5,
      stockQty: 80,
    },
    {
      key: "arabica-beans",
      name: "Premium Arabica Coffee Beans 500g",
      nameAr: "حبوب قهوة أرابيكا فاخرة 500غ",
      slug: "premium-arabica-coffee-beans-500g",
      description: "Single-origin Arabica beans, medium roast, whole bean.",
      descriptionAr: "حبوب أرابيكا أصل واحد، تحميص متوسط، حبة كاملة.",
      category: "coffee",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 5.5,
      saveoPrice: 3.9,
      stockQty: 45,
    },
    {
      key: "water-24pack",
      name: "Mineral Water 330ml (24-Pack)",
      nameAr: "مياه معدنية 330مل (عبوة 24 قطعة)",
      slug: "mineral-water-330ml-24-pack",
      description: "Natural mineral water sourced locally, low sodium.",
      descriptionAr: "مياه معدنية طبيعية محلية المصدر، منخفضة الصوديوم.",
      category: "water",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 2.2,
      saveoPrice: 1.5,
      stockQty: 200,
    },
    {
      key: "sparkling-water",
      name: "Sparkling Water 500ml (6-Pack)",
      nameAr: "مياه فوارة 500مل (عبوة 6 قطع)",
      slug: "sparkling-water-500ml-6-pack",
      description: "Naturally carbonated sparkling water, no added sugar.",
      descriptionAr: "مياه فوارة طبيعياً، بدون سكر مضاف.",
      category: "water",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 3.5,
      saveoPrice: 2.4,
      stockQty: 90,
    },
    {
      key: "fresh-milk",
      name: "Full Fat Fresh Milk 1L",
      nameAr: "حليب طازج كامل الدسم 1 لتر",
      slug: "full-fat-fresh-milk-1l",
      description: "Pasteurized full-fat fresh milk, locally sourced.",
      descriptionAr: "حليب طازج كامل الدسم مبستر، مصدره محلي.",
      category: "dairy",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 1.1,
      saveoPrice: 0.85,
      stockQty: 150,
      lowStockAlert: 20,
    },
    {
      key: "greek-yogurt",
      name: "Greek Yogurt 500g",
      nameAr: "زبادي يوناني 500غ",
      slug: "greek-yogurt-500g",
      description: "Thick, creamy Greek-style yogurt, high in protein.",
      descriptionAr: "زبادي يوناني كثيف وقشدي، غني بالبروتين.",
      category: "dairy",
      supplier: "kuwait-pantry-supplies",
      type: ProductType.STANDARD,
      originalPrice: 2.0,
      saveoPrice: 1.6,
      stockQty: 70,
    },
  ];

  const products: Record<string, any> = {};
  for (const def of productDefs) {
    const { key, category, supplier, ...rest } = def;
    products[key] = await prisma.product.upsert({
      where: { slug: def.slug },
      update: rest,
      create: {
        ...rest,
        categoryId: categories[category].id,
        supplierId: suppliers[supplier].id,
        status: "ACTIVE",
        discountPct: Math.round(((rest.originalPrice - rest.saveoPrice) / rest.originalPrice) * 100),
        images: { create: [{ url: IMG(key), isPrimary: true, sortOrder: 0 }] },
      },
    });
  }

  // ---- Deal of the Hour ----
  await prisma.dealOfTheHour.upsert({
    where: { id: "seed-deal-of-hour-ferrero" },
    update: {},
    create: {
      id: "seed-deal-of-hour-ferrero",
      productId: products.ferrero.id,
      startTime: new Date(),
      endTime: hourFromNow,
      discountOverride: 45,
      stockLimit: 8,
      buyersCount: 23,
      isActive: true,
    },
  });

  // ---- Cross-selling: chocolate -> coffee, nuts, juice, snacks ----
  const crossSellMap: [string, string[]][] = [
    ["ferrero", ["coffee", "nuts", "juice"]],
    ["lindt", ["coffee", "juice", "chips"]],
    ["kitkat", ["juice", "chips"]],
  ];
  for (const [source, targets] of crossSellMap) {
    for (const [i, target] of targets.entries()) {
      await prisma.productRelation.upsert({
        where: { sourceId_targetId_type: { sourceId: products[source].id, targetId: products[target].id, type: RelationType.CROSS_SELL } },
        update: {},
        create: { sourceId: products[source].id, targetId: products[target].id, type: RelationType.CROSS_SELL, sortOrder: i },
      });
    }
  }

  // Upsell: KitKat -> Ferrero box
  await prisma.productRelation.upsert({
    where: { sourceId_targetId_type: { sourceId: products.kitkat.id, targetId: products.ferrero.id, type: RelationType.UPSELL } },
    update: {},
    create: { sourceId: products.kitkat.id, targetId: products.ferrero.id, type: RelationType.UPSELL, sortOrder: 0 },
  });

  // Frequently bought together
  const fbtPairs: [string, string][] = [
    ["nuts", "coffee"],
    ["coffee", "oliveoil"],
  ];
  for (const [source, target] of fbtPairs) {
    await prisma.productRelation.upsert({
      where: { sourceId_targetId_type: { sourceId: products[source].id, targetId: products[target].id, type: RelationType.FREQUENTLY_BOUGHT_TOGETHER } },
      update: {},
      create: { sourceId: products[source].id, targetId: products[target].id, type: RelationType.FREQUENTLY_BOUGHT_TOGETHER, sortOrder: 0 },
    });
  }

  // Complete your deal (cart-side)
  const completeYourDealPairs: [string, string][] = [
    ["ferrero", "mysterychoc"],
    ["lindt", "mysterychoc"],
    ["chips", "mysterysnack"],
    ["juice", "mysterysnack"],
  ];
  for (const [source, target] of completeYourDealPairs) {
    await prisma.productRelation.upsert({
      where: { sourceId_targetId_type: { sourceId: products[source].id, targetId: products[target].id, type: RelationType.COMPLETE_YOUR_DEAL } },
      update: {},
      create: { sourceId: products[source].id, targetId: products[target].id, type: RelationType.COMPLETE_YOUR_DEAL, sortOrder: 0 },
    });
  }

  // Related products
  const relatedPairs: [string, string][] = [
    ["lindt", "kitkat"],
    ["kitkat", "lindt"],
    ["juice", "chips"],
    ["mysterysnack", "mysterychoc"],
    ["mysterychoc", "mysterysnack"],
    ["oliveoil", "cereal"],
  ];
  for (const [source, target] of relatedPairs) {
    await prisma.productRelation.upsert({
      where: { sourceId_targetId_type: { sourceId: products[source].id, targetId: products[target].id, type: RelationType.RELATED } },
      update: {},
      create: { sourceId: products[source].id, targetId: products[target].id, type: RelationType.RELATED, sortOrder: 0 },
    });
  }

  // Mystery Box contents (Phase 4.2) — weighted probability pool for the
  // Gold box, matching the spec's example: 40% / 30% / 20% / 10%.
  const goldBoxContents: [string, number, boolean][] = [
    ["ferrero", 40, false],
    ["lindt", 30, false],
    ["kitkat", 20, false],
    ["juice", 10, true], // "Special Item" — the rare bonus pull
  ];
  for (const [possibleKey, probability, isSpecialItem] of goldBoxContents) {
    await prisma.mysteryBoxContent.upsert({
      where: {
        mysteryBoxId_possibleProductId: {
          mysteryBoxId: products["mysterygold"].id,
          possibleProductId: products[possibleKey].id,
        },
      },
      update: { probability, isSpecialItem },
      create: {
        mysteryBoxId: products["mysterygold"].id,
        possibleProductId: products[possibleKey].id,
        probability,
        isSpecialItem,
      },
    });
  }

  // Bundle Offers (Phase 4.3) — example: buy chips + juice, save 15%.
  const snackBundle = await prisma.bundle.upsert({
    where: { id: "seed-bundle-snack-sip-combo" },
    update: {},
    create: {
      id: "seed-bundle-snack-sip-combo",
      name: "Snack & Sip Combo",
      nameAr: "كومبو سناك وعصير",
      description: "Grab a chips pack with a juice pack and save 15% on both.",
      descriptionAr: "خذ عبوة شيبس مع عبوة عصير ووفّر 15% على الاثنين.",
      discountType: "PERCENTAGE",
      discountValue: 15,
      isActive: true,
    },
  });
  for (const [key, isReward] of [["chips", false], ["juice", false]] as [string, boolean][]) {
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: snackBundle.id, productId: products[key].id } },
      update: {},
      create: { bundleId: snackBundle.id, productId: products[key].id, isRewardItem: isReward, requiredQuantity: 1 },
    });
  }

  // Membership Plans (Phase 4.4) — ships with one plan, schema supports more.
  const plusPlan = await prisma.membershipPlan.upsert({
    where: { slug: "saveo-plus" },
    update: {},
    create: {
      name: "Saveo Plus",
      nameAr: "سافيو بلس",
      slug: "saveo-plus",
      description: "More savings, more access, more discoveries.",
      descriptionAr: "توفير أكبر، وصول أوسع، اكتشافات أكثر.",
      isActive: true,
      sortOrder: 1,
    },
  });

  for (const [cycle, price] of [["MONTHLY", 2.99], ["YEARLY", 29.99]] as [string, number][]) {
    await prisma.membershipPricingOption.upsert({
      where: { planId_billingCycle: { planId: plusPlan.id, billingCycle: cycle as any } },
      update: { price },
      create: { planId: plusPlan.id, billingCycle: cycle as any, price, isActive: true },
    });
  }

  const plusBenefits: [string, boolean, number | null, string, string][] = [
    ["EXTRA_DISCOUNT", true, 5, "Extra 5% off every order", "خصم إضافي 5% على كل طلب"],
    ["EARLY_ACCESS", true, null, "Early access to new deals", "أولوية الوصول للعروض الجديدة"],
    ["EXCLUSIVE_DEALS", true, null, "Access to members-only products", "الوصول لمنتجات حصرية للأعضاء"],
    ["FREE_DELIVERY", true, null, "Free delivery on every order", "توصيل مجاني على كل طلب"],
    ["PLUS_BADGE", true, null, "Saveo Plus badge", "شارة Saveo Plus"],
    ["MYSTERY_BOX_BONUS", true, 3, "Extra 3 KD guaranteed value on Mystery Boxes", "قيمة إضافية 3 KD بصناديق المفاجآت"],
    ["DOUBLE_REWARD_POINTS", false, 2, "Double reward points (coming soon)", "نقاط مكافآت مضاعفة (قريباً)"],
  ];
  for (const [key, isEnabled, value, label, labelAr] of plusBenefits) {
    await prisma.membershipPlanBenefit.upsert({
      where: { planId_key: { planId: plusPlan.id, key: key as any } },
      update: {},
      create: { planId: plusPlan.id, key: key as any, isEnabled, value, label, labelAr },
    });
  }

  // ---- Saveo Plus membership for the demo customer ----
  const monthlyOption = await prisma.membershipPricingOption.findFirstOrThrow({
    where: { planId: plusPlan.id, billingCycle: "MONTHLY" },
  });
  await prisma.membership.upsert({
    where: { userId: customer.id },
    update: {},
    create: {
      userId: customer.id,
      planId: plusPlan.id,
      pricingOptionId: monthlyOption.id,
      status: "ACTIVE",
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  // Mark one existing product as Members Only, to make Phase 4.4's
  // exclusive-visibility feature testable out of the box.
  await prisma.product.update({
    where: { id: products["mysterygold"].id },
    data: { isMembersOnly: true },
  });

  // Feature Flags (Phase 5.2) — all default ON so nothing already-shipped
  // silently turns off just because this system now exists.
  const featureFlags: [string, string][] = [
    ["mystery_boxes", "Mystery Boxes"],
    ["flash_deals", "Flash Deals"],
    ["saveo_plus", "Saveo Plus"],
    ["recommendations", "Recommendations"],
    ["brand_ads", "Brand Ads"],
    ["new_discovery_features", "New Discovery Features"],
  ];
  for (const [key, name] of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: {},
      create: { key, name, enabled: true },
    });
  }

  // Launch Mode flags (production launch prep) — explicitly seeded false,
  // matching the specified launch state. Unlike the flags above, these
  // fail CLOSED if ever unseeded (see FeatureFlagService.isEnabledFailClosed).
  const launchFlags: [string, string][] = [
    ["SAVE_AI_ENABLED", "Savo AI Shopping Assistant"],
    ["ADVANCED_RECOMMENDATIONS_ENABLED", "Advanced Recommendation Engine"],
    ["MYSTERY_BOX_ENABLED", "Mystery Boxes (Launch Mode)"],
    ["SAVEO_PLUS_ENABLED", "Savo Plus (Launch Mode)"],
    ["GAMIFICATION_ENABLED", "Gamification Campaigns"],
    ["ADVANCED_DEAL_OF_HOUR_ENABLED", "Advanced Deal of the Hour"],
    ["SMART_CROSS_SELLING_ENABLED", "Smart Cross-Selling"],
  ];
  for (const [key, name] of launchFlags) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: {},
      create: { key, name, enabled: false },
    });
  }

  // Marketing Campaigns (Phase 5.2) — Treasure Chest is the flagship,
  // fully-built first experience and ships ACTIVE. The other 14 types
  // are cataloged (INACTIVE) so the admin can configure and activate
  // them later without any schema change — see CampaignService.
  const campaignDefs: { name: string; slug: string; type: string; status: string; priority: number; config: any }[] = [
    {
      name: "Treasure Chest",
      slug: "treasure",
      type: "TREASURE_CHEST",
      status: "ACTIVE",
      priority: 100,
      config: {
        rewardPool: [
          { type: "DISCOUNT", label: "5% Off Your Next Order", value: 5, weight: 30 },
          { type: "FREE_DELIVERY", label: "Free Delivery", value: null, weight: 25 },
          { type: "POINTS", label: "50 Saveo Points", value: 50, weight: 20 },
          { type: "CREDIT", label: "1.000 KD Credit", value: 1, weight: 15 },
          { type: "MYSTERY_BOX", label: "Free Mystery Box Entry", value: null, weight: 7 },
          { type: "GOLDEN_TICKET", label: "Golden Ticket", value: null, weight: 3 },
        ],
      },
    },
    {
      name: "Mystery Safe",
      slug: "mystery-safe",
      type: "MYSTERY_SAFE",
      status: "INACTIVE",
      priority: 90,
      config: {
        rewardPool: [
          { type: "DISCOUNT", label: "10% Off Your Next Order", value: 10, weight: 20 },
          { type: "FREE_DELIVERY", label: "Free Delivery", value: null, weight: 30 },
          { type: "POINTS", label: "100 Saveo Points", value: 100, weight: 25 },
          { type: "CREDIT", label: "2.000 KD Credit", value: 2, weight: 15 },
          { type: "GOLDEN_TICKET", label: "Golden Ticket", value: null, weight: 10 },
        ],
      },
    },
    {
      name: "Surprise Envelope", slug: "surprise-envelope", type: "SURPRISE_ENVELOPE", status: "INACTIVE", priority: 0,
      config: {
        rewardPool: [
          { type: "DISCOUNT", label: "5% Off Your Next Order", value: 5, weight: 30 },
          { type: "FREE_DELIVERY", label: "Free Delivery", value: null, weight: 25 },
          { type: "POINTS", label: "40 Saveo Points", value: 40, weight: 25 },
          { type: "CREDIT", label: "0.750 KD Wallet Credit", value: 0.75, weight: 15 },
          { type: "GOLDEN_TICKET", label: "Golden Ticket", value: null, weight: 5 },
        ],
      },
    },
    {
      name: "Pick Three", slug: "pick-three", type: "PICK_THREE", status: "INACTIVE", priority: 0,
      config: {
        numTiles: 9,
        rewardPool: [
          { type: "DISCOUNT", label: "5% Off", value: 5, weight: 35 },
          { type: "DISCOUNT", label: "10% Off", value: 10, weight: 20 },
          { type: "FREE_DELIVERY", label: "Free Delivery", value: null, weight: 25 },
          { type: "POINTS", label: "60 Saveo Points", value: 60, weight: 20 },
        ],
      },
    },
    { name: "Daily Crystal", slug: "daily-crystal", type: "DAILY_CRYSTAL", status: "INACTIVE", priority: 0, config: {} },
    { name: "Balloon Pop", slug: "balloon-pop", type: "BALLOON_POP", status: "INACTIVE", priority: 0, config: {} },
    { name: "Mystery Cards", slug: "mystery-cards", type: "MYSTERY_CARDS", status: "INACTIVE", priority: 0, config: {} },
    { name: "Lucky Product", slug: "lucky-product", type: "LUCKY_PRODUCT", status: "INACTIVE", priority: 0, config: {} },
    { name: "Hidden Cashback", slug: "hidden-cashback", type: "HIDDEN_CASHBACK", status: "INACTIVE", priority: 0, config: { minAmount: 0.5, maxAmount: 3 } },
    { name: "Community Goal", slug: "community-goal", type: "COMMUNITY_GOAL", status: "INACTIVE", priority: 0, config: {} },
    { name: "Mystery Friday", slug: "mystery-friday", type: "MYSTERY_FRIDAY", status: "INACTIVE", priority: 0, config: {} },
    { name: "Secret VIP Deal", slug: "secret-vip-deal", type: "SECRET_VIP_DEAL", status: "INACTIVE", priority: 0, config: {} },
    {
      name: "Collect & Unlock", slug: "collect-unlock", type: "COLLECT_UNLOCK", status: "INACTIVE", priority: 0,
      config: { target: 5, reward: { type: "POINTS", label: "50 Saveo Points", value: 50 } },
    },
    {
      name: "Golden Ticket",
      slug: "golden-ticket",
      type: "GOLDEN_TICKET",
      status: "INACTIVE",
      priority: 0,
      config: { odds: 20, reward: { label: "Free Mystery Box", type: "MYSTERY_BOX" } }, // 1-in-20 orders
    },
    {
      name: "Treasure Map",
      slug: "treasure-map",
      type: "TREASURE_MAP",
      status: "INACTIVE",
      priority: 0,
      config: {
        nodes: [
          {
            id: "node-1",
            category: "chocolates-sweets",
            task: "Discover the Chocolates & Sweets section and buy a product",
            reward: { type: "POINTS", label: "Discovery Stamp — 20 Points", value: 20 },
            order: 1,
          },
          {
            id: "node-2",
            category: "food-snacks",
            task: "Buy a product from Food & Snacks",
            reward: { type: "DISCOUNT", label: "Discovery Stamp — 5% Off", value: 5 },
            order: 2,
          },
        ],
      },
    },
  ];
  for (const def of campaignDefs) {
    await prisma.campaign.upsert({
      where: { slug: def.slug },
      update: {},
      create: def as any,
    });
  }

  // Audience Segments (Phase 5.4 §5) — a starter set of common targeting rules brands can pick from.
  const segmentDefs = [
    { name: "Saveo Plus Members", rules: { isSaveoPlusMember: true }, estimatedUsers: 0 },
    { name: "New Customers", rules: { isNewCustomer: true }, estimatedUsers: 0 },
    { name: "Returning Customers", rules: { isReturningCustomer: true }, estimatedUsers: 0 },
    { name: "All Customers", rules: {}, estimatedUsers: 0 },
  ];
  for (const def of segmentDefs) {
    const existing = await prisma.audienceSegment.findFirst({ where: { name: def.name } });
    if (!existing) await prisma.audienceSegment.create({ data: def as any });
  }

  // Brand Packages (Phase 5.7 §5) — exact default pricing from the brief.
  const packageDefs = [
    {
      name: "Standard",
      type: "STANDARD",
      monthlyPrice: 250,
      description: "Standard sponsored placement",
      features: { maxSponsoredSlots: 2, productExperience: false, discoveryScoreBoost: 0, heroDisplay: false },
    },
    {
      name: "Premium",
      type: "PREMIUM",
      monthlyPrice: 750,
      description: "Premium display with Product Experience unlocked",
      features: { maxSponsoredSlots: 5, productExperience: true, discoveryScoreBoost: 10, heroDisplay: false },
    },
    {
      name: "Spotlight",
      type: "SPOTLIGHT",
      monthlyPrice: 2000,
      description: "Hero placement + maximum discovery boost",
      features: { maxSponsoredSlots: 10, productExperience: true, discoveryScoreBoost: 20, heroDisplay: true },
    },
    {
      name: "Enterprise",
      type: "ENTERPRISE",
      monthlyPrice: 0, // Custom — negotiated directly, not self-serve
      description: "Custom enterprise partnership — contact Saveo",
      features: { maxSponsoredSlots: 999, productExperience: true, discoveryScoreBoost: 25, heroDisplay: true, custom: true },
    },
  ];
  for (const def of packageDefs) {
    const existing = await prisma.brandPackage.findFirst({ where: { type: def.type as any } });
    if (!existing) await prisma.brandPackage.create({ data: def as any });
  }

  // Regional Expansion Ready (Phase 6.11) — Kuwait is the only active country.
  let kuwait = await prisma.country.findUnique({ where: { code: "KW" } });
  if (!kuwait) {
    kuwait = await prisma.country.create({
      data: { code: "KW", name: "Kuwait", currencyCode: "KWD", currencySymbol: "KD", taxRatePercent: 0, isActive: true },
    });
  }
  const governorates = ["Al Asimah", "Hawalli", "Farwaniya", "Mubarak Al-Kabeer", "Ahmadi", "Jahra"];
  for (const zoneName of governorates) {
    const existing = await prisma.shippingRule.findFirst({ where: { countryId: kuwait.id, zoneName } });
    if (!existing) {
      await prisma.shippingRule.create({ data: { countryId: kuwait.id, zoneName, baseFee: 1.5, freeShippingThreshold: 15 } });
    }
  }

  // Warehouse ERP (Phase 7.4) — starter locations so Put Away has somewhere to target immediately.
  for (const loc of [
    { code: "A-01-01", zone: "A", aisle: "01", shelf: "01" },
    { code: "A-01-02", zone: "A", aisle: "01", shelf: "02" },
    { code: "B-01-01", zone: "B", aisle: "01", shelf: "01" },
  ]) {
    const existing = await prisma.warehouseLocation.findUnique({ where: { code: loc.code } });
    if (!existing) await prisma.warehouseLocation.create({ data: loc });
  }

  console.log("Seed complete.\n");
  console.log("Admin login:    admin@saveo.com.kw / Admin1234!");
  // Test brand account (Phase 7.7 — Sponsored Products) — ACTIVE immediately so it's ready to test without waiting for admin approval.
  const brandUser = await prisma.user.upsert({
    where: { email: "brand@nestle-demo.example" },
    update: {},
    create: {
      name: "Nestlé Kuwait — Demo Brand",
      email: "brand@nestle-demo.example",
      passwordHash: await bcrypt.hash("Brand1234!", 10),
      role: "BRAND",
    },
  });
  await prisma.brandAccount.upsert({
    where: { ownerUserId: brandUser.id },
    update: {},
    create: {
      ownerUserId: brandUser.id,
      companyName: "Nestlé Kuwait (Demo)",
      contactName: "Demo Brand Manager",
      email: "brand@nestle-demo.example",
      phone: "+96512345678",
      status: "ACTIVE",
    },
  });

  console.log("Supplier login: supplier@sultansweets.example / Supplier1234!");
  console.log("Brand login: brand@nestle-demo.example / Brand1234!");
  console.log("Customer login: customer@example.com / Customer1234! (Saveo Plus member)");

  // Affiliate Milestone Rules (Phase 9.3) — default tiers, fully editable afterward from /admin/affiliates.
  const milestoneRules = [
    { name: "15 Referrals", metric: "REFERRAL_COUNT" as const, threshold: 15, giftCardAmount: 10, newCommissionRate: 2.5, sortOrder: 1 },
    { name: "30 Referrals", metric: "REFERRAL_COUNT" as const, threshold: 30, giftCardAmount: 20, newCommissionRate: 3, sortOrder: 2 },
    { name: "1000 KD Referred Revenue", metric: "REVENUE" as const, threshold: 1000, giftCardAmount: 30, newCommissionRate: null, sortOrder: 3 },
  ];
  for (const rule of milestoneRules) {
    const existing = await prisma.affiliateMilestoneRule.findFirst({ where: { name: rule.name } });
    if (!existing) await prisma.affiliateMilestoneRule.create({ data: rule });
  }

  // Product Experience Studio demo data (Phase 8.0) — the Lindt product gets full sample data for every new feature, approved immediately, so it's visible on the product page without any manual admin/supplier steps.
  if (products["lindt"]) {
    const lindtId = products["lindt"].id;

    await prisma.product.update({
      where: { id: lindtId },
      data: {
        experienceApproved: true,
        productStory: "Crafted in Switzerland since 1845, Lindt Excellence blends the finest cocoa beans with generations of chocolate-making mastery for a smooth, intense dark chocolate experience.",
        originStory: "We chose Lindt for its uncompromising commitment to quality — every batch is still stone-ground the traditional Swiss way.",
        highlightFeatures: [
          { icon: "🇨🇭", label: "Swiss Made" },
          { icon: "🍫", label: "70% Cocoa" },
          { icon: "🌱", label: "Sustainably Sourced" },
          { icon: "🚫", label: "No Artificial Flavors" },
        ],
      },
    });

    const existingImage = await prisma.productImage.findFirst({ where: { productId: lindtId }, orderBy: { sortOrder: "asc" } });
    if (existingImage) {
      for (let i = 0; i < 8; i++) {
        await prisma.productMedia.upsert({
          where: { id: `demo-360-${lindtId}-${i}` },
          update: {},
          create: { id: `demo-360-${lindtId}-${i}`, productId: lindtId, type: "IMAGE_360", url: existingImage.url, sortOrder: i },
        });
      }
    }

    const ingredients = [
      { name: "Cocoa Mass", nameAr: "كتلة الكاكاو", origin: "Ghana & Ecuador", benefit: "Rich source of antioxidant flavanols.", isAllergen: false },
      { name: "Cocoa Butter", nameAr: "زبدة الكاكاو", origin: "Ghana", benefit: "Gives the chocolate its signature smooth melt.", isAllergen: false },
      { name: "Milk Solids", nameAr: "مواد حليب", origin: "Switzerland", benefit: null, isAllergen: true },
      { name: "Soy Lecithin", nameAr: "ليسيثين الصويا", origin: null, benefit: "Natural emulsifier for smooth texture.", isAllergen: true },
    ];
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];
      await prisma.productIngredient.upsert({
        where: { id: `demo-ing-${lindtId}-${i}` },
        update: {},
        create: { id: `demo-ing-${lindtId}-${i}`, productId: lindtId, sortOrder: i, ...ing },
      });
    }

    await prisma.productNutritionFact.upsert({
      where: { productId: lindtId },
      update: {},
      create: {
        productId: lindtId,
        servingSize: "30g",
        calories: 170,
        proteinG: 2.5,
        carbsG: 12,
        sugarG: 8,
        fatG: 12.5,
        saturatedFatG: 7.5,
        fiberG: 2.8,
        sodiumMg: 5,
        dietTags: ["VEGETARIAN", "GLUTEN_FREE"],
      },
    });

    await prisma.productBadge.upsert({
      where: { productId_type: { productId: lindtId, type: "PREMIUM" } },
      update: {},
      create: { productId: lindtId, type: "PREMIUM", isAutomatic: false },
    });

    console.log("Product Experience Studio demo: Lindt Excellence Dark Chocolate 100g (360°/ingredients/nutrition/badges) — visit /en/products/lindt-excellence-dark-chocolate-100g");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
