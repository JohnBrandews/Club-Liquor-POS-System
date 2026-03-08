import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

const AddItemSchema = z.object({
  productId: z.string().cuid(),
  qty: z.number().int().min(1).max(50).default(1),
});

export async function POST(
  req: Request,
  { params }: { params: { tabId: string } },
) {
  const sessionOrRes = await requireApiSession();
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const body = AddItemSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const [tab, product] = await Promise.all([
    prisma.tab.findUnique({ where: { id: params.tabId } }),
    prisma.product.findUnique({ where: { id: body.data.productId } }),
  ]);

  if (!tab || tab.status !== "OPEN") {
    return NextResponse.json({ error: "Tab not found" }, { status: 404 });
  }
  if (!product || !product.isActive || product.is86d) {
    return NextResponse.json({ error: "Product unavailable" }, { status: 409 });
  }

  const qty = body.data.qty;
  const unitPriceCents = product.priceCents;
  const totalPriceCents = unitPriceCents * qty;

  const item = await prisma.orderItem.create({
    data: {
      tabId: tab.id,
      productId: product.id,
      qty,
      unitPriceCents,
      totalPriceCents,
      addedById: sessionOrRes.sub,
      addedAt: new Date(),
    },
    include: {
      product: true,
      addedBy: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json({ ok: true, item });
}

