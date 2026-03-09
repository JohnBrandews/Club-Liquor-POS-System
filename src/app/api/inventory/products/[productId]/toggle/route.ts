import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

export async function POST(
    req: Request,
    { params }: { params: { productId: string } }
) {
    const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
    if (sessionOrRes instanceof Response) return sessionOrRes;

    try {
        const product = await prisma.product.findUnique({
            where: { id: params.productId },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const updated = await prisma.product.update({
            where: { id: params.productId },
            data: { is86d: !product.is86d },
        });

        return NextResponse.json({ ok: true, product: updated });
    } catch (err) {
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
