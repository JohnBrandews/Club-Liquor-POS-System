import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";

export async function POST(
    req: Request,
    { params }: { params: { userId: string } }
) {
    const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-disabling or disabling other admins
    if (user.id === sessionOrRes.sub || user.role === "ADMIN") {
        return NextResponse.json({ error: "Cannot modify status of protected accounts" }, { status: 403 });
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { isActive: !user.isActive },
        select: { id: true, isActive: true },
    });

    return NextResponse.json({ ok: true, isActive: updated.isActive });
}
