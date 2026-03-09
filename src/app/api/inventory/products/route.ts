import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

const CreateProductSchema = z.object({
    name: z.string().min(2),
    categoryId: z.string().cuid(),
    priceCents: z.number().int().min(0),
    stockQty: z.number().int().min(0).default(0),
    stockUnit: z.string().default("unit"),
    reorderLevel: z.number().int().min(0).default(5),
});

export async function POST(req: Request) {
    const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const body = CreateProductSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
        return NextResponse.json({ error: "Invalid payload", details: body.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { name: body.data.name } });
    if (existing) {
        return NextResponse.json({ error: "Product name already exists" }, { status: 409 });
    }

    const product = await prisma.product.create({
        data: {
            name: body.data.name,
            categoryId: body.data.categoryId,
            priceCents: body.data.priceCents,
            stockQty: body.data.stockQty,
            stockUnit: body.data.stockUnit,
            reorderLevel: body.data.reorderLevel,
            isActive: true,
        },
        include: { category: true },
    });

    return NextResponse.json({ ok: true, product });
}
