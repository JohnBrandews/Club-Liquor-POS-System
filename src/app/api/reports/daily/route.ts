import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

function getEatDayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00+03:00`);
  if (Number.isNaN(start.getTime())) throw new Error("BAD_DATE");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(req: Request) {
  const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  let range: { start: Date; end: Date };
  try {
    range = getEatDayRange(date);
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const [paymentsByMethod, topItems] = await Promise.all([
    prisma.payment.groupBy({
      by: ["method"],
      _sum: { amountCents: true },
      where: { createdAt: { gte: range.start, lt: range.end } },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { qty: true, totalPriceCents: true },
      where: { addedAt: { gte: range.start, lt: range.end }, voidedAt: null },
      orderBy: { _sum: { totalPriceCents: "desc" } },
      take: 10,
    }),
  ]);

  const productIds = topItems.map((r) => r.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  const totalCents = paymentsByMethod.reduce((sum, p) => sum + (p._sum.amountCents ?? 0), 0);

  return NextResponse.json({
    ok: true,
    date,
    totals: {
      totalCents,
      byMethod: paymentsByMethod.map((p) => ({
        method: p.method,
        amountCents: p._sum.amountCents ?? 0,
      })),
    },
    topProducts: topItems.map((r) => ({
      productId: r.productId,
      name: productNameById.get(r.productId) ?? "Unknown",
      qty: r._sum.qty ?? 0,
      revenueCents: r._sum.totalPriceCents ?? 0,
    })),
  });
}

