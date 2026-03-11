import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { sendTerminationEmail } from "@/lib/mail";

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

    const newStatus = !user.isActive;

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { isActive: newStatus },
        select: { id: true, isActive: true, email: true, name: true },
    });

    // If dismissed, send termination email
    if (!updated.isActive) {
        try {
            await sendTerminationEmail({
                email: updated.email,
                name: updated.name,
            });
        } catch (err) {
            console.error("Termination email failed:", err);
        }
    }

    return NextResponse.json({ ok: true, isActive: updated.isActive });
}
