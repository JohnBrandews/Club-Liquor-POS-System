import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

const UpdateStaffSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(["ADMIN", "MANAGER", "BARTENDER", "WAITER"]).optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: { userId: string } }
) {
    const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const body = UpdateStaffSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!existing) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Protection: Only Admins can edit other Admins
    if (existing.role === "ADMIN" && sessionOrRes.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized to edit Admin" }, { status: 403 });
    }

    const data: any = {};
    if (body.data.name) data.name = body.data.name;
    if (body.data.email) data.email = body.data.email;
    if (body.data.role) data.role = body.data.role;
    if (body.data.password) {
        data.passwordHash = await hashPassword(body.data.password);
    }

    const updated = await prisma.user.update({
        where: { id: existing.id },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });

    return NextResponse.json({ ok: true, user: updated });
}
