import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { computeTotals } from "@/lib/pos/totals";

export async function GET() {
  const sessionOrRes = await requireApiSession();
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const tabs = await prisma.tab.findMany({
    where: { status: "OPEN" },
    orderBy: [{ openedAt: "asc" }],
    include: {
      table: true,
      orderItems: {
        where: { voidedAt: null },
        select: { totalPriceCents: true },
      },
    },
  });

  const now = Date.now();
  const rows = tabs.map((t) => {
    const subtotalCents = t.orderItems.reduce((sum, it) => sum + it.totalPriceCents, 0);
    const { totalCents } = computeTotals({
      subtotalCents,
      serviceChargeEnabled: t.serviceChargeEnabled,
      serviceChargeRateBps: t.serviceChargeRateBps,
      vatRateBps: t.vatRateBps,
    });
    const ageMs = now - t.openedAt.getTime();
    const needsAttention = ageMs >= 3 * 60 * 60 * 1000;

    return {
      id: t.id,
      type: t.type,
      status: t.status,
      openedAt: t.openedAt,
      label: t.table?.label ?? t.customerName ?? "Quick Sale",
      tableId: t.tableId,
      customerName: t.customerName,
      subtotalCents,
      totalCents,
      needsAttention,
    };
  });

  return NextResponse.json({ ok: true, tabs: rows });
}

