import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

const UpdateItemSchema = z.object({
    qty: z.number().int().min(1).max(100),
});

export async function PATCH(
    req: Request,
    { params }: { params: { orderItemId: string } },
) {
    const sessionOrRes = await requireApiSession();
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const body = UpdateItemSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const item = await prisma.orderItem.findUnique({
        where: { id: params.orderItemId },
        include: { tab: true, product: true },
    });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (item.tab.status !== "OPEN") return NextResponse.json({ error: "Tab closed" }, { status: 409 });
    if (item.voidedAt) return NextResponse.json({ error: "Item voided" }, { status: 409 });

    const updated = await prisma.orderItem.update({
        where: { id: item.id },
        data: {
            qty: body.data.qty,
            totalPriceCents: item.unitPriceCents * body.data.qty,
        },
        include: {
            product: true,
            addedBy: { select: { id: true, name: true, role: true } },
        },
    });

    return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(
    req: Request,
    { params }: { params: { orderItemId: string } },
) {
    const sessionOrRes = await requireApiSession();
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const item = await prisma.orderItem.findUnique({
        where: { id: params.orderItemId },
        include: { tab: true },
    });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (item.tab.status !== "OPEN") return NextResponse.json({ error: "Tab closed" }, { status: 409 });
    if (item.voidedAt) return NextResponse.json({ error: "Cannot delete voided items" }, { status: 409 });

    await prisma.orderItem.delete({
        where: { id: item.id },
    });

    return NextResponse.json({ ok: true });
}
