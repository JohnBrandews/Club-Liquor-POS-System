import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { computeTotals } from "@/lib/pos/totals";

const PaySchema = z.object({
  method: z.enum(["CASH", "MPESA", "SPLIT"]),
  cashReceivedCents: z.number().int().nonnegative().optional(),
  mpesaAmountCents: z.number().int().nonnegative().optional(),
  mpesaPhone: z.string().trim().min(9).max(20).optional(),
  mpesaRef: z.string().trim().min(3).max(64).optional(),
  serviceChargeEnabled: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { tabId: string } },
) {
  const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER", "BARTENDER"]);
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const body = PaySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const isOverrideRole = sessionOrRes.role === "ADMIN" || sessionOrRes.role === "MANAGER";

  const result = await prisma.$transaction(async (tx) => {
    const tab = await tx.tab.findUnique({
      where: { id: params.tabId },
      include: {
        table: true,
        orderItems: {
          where: { voidedAt: null },
          include: { product: true },
        },
      },
    });

    if (!tab || tab.status !== "OPEN") throw new Error("TAB_NOT_OPEN");

    const subtotalCents = tab.orderItems.reduce((sum, it) => sum + it.totalPriceCents, 0);
    const serviceChargeEnabled =
      isOverrideRole && typeof body.data.serviceChargeEnabled === "boolean"
        ? body.data.serviceChargeEnabled
        : tab.serviceChargeEnabled;

    const totals = computeTotals({
      subtotalCents,
      serviceChargeEnabled,
      serviceChargeRateBps: tab.serviceChargeRateBps,
      vatRateBps: tab.vatRateBps,
    });

    if (serviceChargeEnabled !== tab.serviceChargeEnabled) {
      await tx.tab.update({
        where: { id: tab.id },
        data: { serviceChargeEnabled },
      });
    }

    const totalDueCents = totals.totalCents;

    const paymentsToCreate: Array<{
      method: "CASH" | "MPESA";
      amountCents: number;
      mpesaPhone?: string;
      mpesaRef?: string;
    }> = [];

    if (body.data.method === "CASH") {
      const cashReceived = body.data.cashReceivedCents ?? 0;
      if (cashReceived < totalDueCents) throw new Error("INSUFFICIENT_CASH");
      paymentsToCreate.push({ method: "CASH", amountCents: totalDueCents });
    } else if (body.data.method === "MPESA") {
      if (!body.data.mpesaPhone) throw new Error("MPESA_PHONE_REQUIRED");
      paymentsToCreate.push({
        method: "MPESA",
        amountCents: totalDueCents,
        mpesaPhone: body.data.mpesaPhone,
        mpesaRef: body.data.mpesaRef,
      });
    } else {
      const mpesaAmount = body.data.mpesaAmountCents ?? 0;
      const cashReceived = body.data.cashReceivedCents ?? 0;
      if (mpesaAmount < 0 || mpesaAmount > totalDueCents) throw new Error("BAD_SPLIT");
      const cashDue = totalDueCents - mpesaAmount;
      if (cashReceived < cashDue) throw new Error("INSUFFICIENT_CASH");
      if (mpesaAmount > 0) {
        if (!body.data.mpesaPhone) throw new Error("MPESA_PHONE_REQUIRED");
        paymentsToCreate.push({
          method: "MPESA",
          amountCents: mpesaAmount,
          mpesaPhone: body.data.mpesaPhone,
          mpesaRef: body.data.mpesaRef,
        });
      }
      if (cashDue > 0) paymentsToCreate.push({ method: "CASH", amountCents: cashDue });
    }

    const paymentRows = [];
    for (const p of paymentsToCreate) {
      paymentRows.push(
        await tx.payment.create({
          data: {
            tabId: tab.id,
            method: p.method,
            amountCents: p.amountCents,
            mpesaPhone: p.mpesaPhone,
            mpesaRef: p.mpesaRef,
            processedById: sessionOrRes.sub,
          },
        }),
      );
    }

    for (const it of tab.orderItems) {
      await tx.product.update({
        where: { id: it.productId },
        data: {
          stockQty: { decrement: it.qty },
        },
      });
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          type: "SALE",
          qtyDelta: -it.qty,
          tabId: tab.id,
          byId: sessionOrRes.sub,
          reason: "Sale",
        },
      });
    }

    await tx.tab.update({
      where: { id: tab.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    if (tab.tableId) {
      await tx.table.update({
        where: { id: tab.tableId },
        data: {
          status: "EMPTY",
          openedAt: null,
          currentTabId: null,
          assignedWaiterId: null,
        },
      });
    }

    const cashReceived = body.data.cashReceivedCents ?? 0;
    const mpesaAmount = body.data.mpesaAmountCents ?? 0;
    const cashPaid =
      body.data.method === "CASH"
        ? totalDueCents
        : body.data.method === "SPLIT"
          ? totalDueCents - Math.min(mpesaAmount, totalDueCents)
          : 0;
    const changeCents = Math.max(0, cashReceived - cashPaid);

    return {
      paymentIds: paymentRows.map((p) => p.id),
      totals: { subtotalCents, ...totals },
      changeCents,
    };
  });

  return NextResponse.json({ ok: true, ...result });
}

