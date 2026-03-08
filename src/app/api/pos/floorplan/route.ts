import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { computeTotals } from "@/lib/pos/totals";

export async function GET() {
  const sessionOrRes = await requireApiSession();
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const isWaiter = sessionOrRes.role === "WAITER";

  const tables = await prisma.table.findMany({
    where: isWaiter ? { assignedWaiterId: sessionOrRes.sub } : {},
    orderBy: [{ section: "asc" }, { label: "asc" }],
    include: {
      assignedWaiter: { select: { id: true, name: true } },
      currentTab: {
        include: {
          orderItems: {
            where: { voidedAt: null },
            select: { totalPriceCents: true },
          },
        },
      },
    },
  });

  const now = Date.now();

  const rows = tables.map((t) => {
    const subtotalCents =
      t.currentTab?.orderItems.reduce((sum, it) => sum + it.totalPriceCents, 0) ?? 0;
    const totalCents = t.currentTab
      ? computeTotals({
          subtotalCents,
          serviceChargeEnabled: t.currentTab.serviceChargeEnabled,
          serviceChargeRateBps: t.currentTab.serviceChargeRateBps,
          vatRateBps: t.currentTab.vatRateBps,
        }).totalCents
      : 0;
    const openedAt = t.openedAt ?? t.currentTab?.openedAt ?? null;
    const needsAttention =
      openedAt !== null ? now - openedAt.getTime() >= 3 * 60 * 60 * 1000 : false;

    return {
      id: t.id,
      label: t.label,
      section: t.section,
      status: t.status,
      posX: t.posX,
      posY: t.posY,
      width: t.width,
      height: t.height,
      openedAt,
      assignedWaiter: t.assignedWaiter,
      currentTabId: t.currentTabId,
      subtotalCents,
      totalCents,
      needsAttention,
    };
  });

  return NextResponse.json({ ok: true, tables: rows });
}

