import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

const RestockSchema = z.object({
    qty: z.number().int().min(1),
    reason: z.string().optional(),
});

export async function POST(
    req: Request,
    { params }: { params: { productId: string } }
) {
    const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const body = RestockSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: params.productId } });
    if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
            where: { id: product.id },
            data: { stockQty: { increment: body.data.qty } },
        });

        await tx.stockMovement.create({
            data: {
                productId: product.id,
                type: "RESTOCK",
                qtyDelta: body.data.qty,
                reason: body.data.reason || "Manual restock",
                byId: sessionOrRes.sub,
            },
        });

        return updated;
    });

    return NextResponse.json({ ok: true, stockQty: updatedProduct.stockQty });
}
