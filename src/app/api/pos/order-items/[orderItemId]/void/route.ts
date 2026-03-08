import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

const VoidSchema = z.object({
  reason: z.string().trim().min(3).max(160),
});

export async function POST(
  req: Request,
  { params }: { params: { orderItemId: string } },
) {
  const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
  if (sessionOrRes instanceof Response) return sessionOrRes;

  const body = VoidSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const item = await prisma.orderItem.findUnique({
    where: { id: params.orderItemId },
    include: { tab: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.tab.status !== "OPEN") return NextResponse.json({ error: "Tab closed" }, { status: 409 });
  if (item.voidedAt) return NextResponse.json({ error: "Already voided" }, { status: 409 });

  const updated = await prisma.orderItem.update({
    where: { id: item.id },
    data: {
      voidedAt: new Date(),
      voidReason: body.data.reason,
      voidedById: sessionOrRes.sub,
    },
    include: {
      product: true,
      addedBy: { select: { id: true, name: true, role: true } },
      voidedBy: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}

