import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { computeTotals } from "@/lib/pos/totals";

export async function GET(
  _req: Request,
  { params }: { params: { tabId: string } },
) {
  const sessionOrRes = await requireApiSession();
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const tab = await prisma.tab.findUnique({
    where: { id: params.tabId },
    include: {
      table: true,
      openedBy: { select: { id: true, name: true, role: true } },
      orderItems: {
        orderBy: [{ addedAt: "asc" }],
        include: {
          product: true,
          addedBy: { select: { id: true, name: true, role: true } },
          voidedBy: { select: { id: true, name: true, role: true } },
        },
      },
      payments: { orderBy: [{ createdAt: "asc" }] },
    },
  });

  if (!tab) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const subtotalCents = tab.orderItems
    .filter((i) => !i.voidedAt)
    .reduce((sum, i) => sum + i.totalPriceCents, 0);
  const totals = computeTotals({
    subtotalCents,
    serviceChargeEnabled: tab.serviceChargeEnabled,
    serviceChargeRateBps: tab.serviceChargeRateBps,
    vatRateBps: tab.vatRateBps,
  });

  return NextResponse.json({
    ok: true,
    tab,
    totals: { subtotalCents, ...totals },
  });
}

