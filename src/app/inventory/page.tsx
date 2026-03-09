import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/server";
import { InventoryPageClient } from "./InventoryPageClient";

export default async function InventoryPage() {
  const session = await getSession();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }],
    }),
    prisma.category.findMany({
      orderBy: { displayOrder: "asc" }
    })
  ]);

  const mapped = products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    priceCents: p.priceCents,
    stockQty: p.stockQty,
    stockUnit: p.stockUnit,
    reorderLevel: p.reorderLevel,
    isActive: p.isActive,
    is86d: p.is86d,
  }));

  const mappedCats = categories.map(c => ({
    id: c.id,
    name: c.name
  }));

  return <InventoryPageClient initialProducts={mapped} categories={mappedCats} />;
}


