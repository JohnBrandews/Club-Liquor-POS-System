import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

export async function GET() {
  const sessionOrRes = await requireApiSession();
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      products: {
        where: { isActive: true },
        orderBy: [{ isPopular: "desc" }, { name: "asc" }],
      },
    },
  });

  const popular = await prisma.product.findMany({
    where: { isActive: true, isPopular: true },
    orderBy: [{ name: "asc" }],
    take: 12,
    include: { category: true },
  });

  return NextResponse.json({
    ok: true,
    popular,
    categories,
  });
}

