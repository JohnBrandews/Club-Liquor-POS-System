import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

const CreateTabSchema = z.object({
  type: z.enum(["TABLE_TAB", "QUICK_SALE", "NAMED_TAB"]),
  tableId: z.string().cuid().optional(),
  customerName: z.string().trim().min(1).max(64).optional(),
  serviceChargeEnabled: z.boolean().optional(),
});

export async function POST(req: Request) {
  const sessionOrRes = await requireApiSession();
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const body = CreateTabSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { type, tableId, customerName, serviceChargeEnabled } = body.data;

  if (type === "TABLE_TAB") {
    if (!tableId) return NextResponse.json({ error: "tableId required" }, { status: 400 });

    const tab = await prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({ where: { id: tableId } });
      if (!table) throw new Error("TABLE_NOT_FOUND");

      if (table.currentTabId) {
        const existing = await tx.tab.findUnique({ where: { id: table.currentTabId } });
        if (existing && existing.status === "OPEN") return existing;
      }

      const created = await tx.tab.create({
        data: {
          type,
          tableId,
          openedById: sessionOrRes.sub,
          serviceChargeEnabled: serviceChargeEnabled ?? true,
        },
      });

      await tx.table.update({
        where: { id: tableId },
        data: {
          status: "OCCUPIED",
          openedAt: new Date(),
          currentTabId: created.id,
        },
      });

      return created;
    });

    return NextResponse.json({ ok: true, tabId: tab.id });
  }

  if (type === "NAMED_TAB") {
    if (!customerName)
      return NextResponse.json({ error: "customerName required" }, { status: 400 });

    const tab = await prisma.tab.create({
      data: {
        type,
        customerName,
        openedById: sessionOrRes.sub,
        serviceChargeEnabled: serviceChargeEnabled ?? true,
      },
    });
    return NextResponse.json({ ok: true, tabId: tab.id });
  }

  const tab = await prisma.tab.create({
    data: {
      type,
      openedById: sessionOrRes.sub,
      serviceChargeEnabled: serviceChargeEnabled ?? true,
    },
  });
  return NextResponse.json({ ok: true, tabId: tab.id });
}

