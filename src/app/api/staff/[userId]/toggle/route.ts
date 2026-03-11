import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { sendTerminationEmail, sendReinstatementEmail } from "@/lib/mail";

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
    const inviteToken = newStatus ? Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) : undefined;
    const inviteExpires = newStatus ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { 
            isActive: newStatus,
            inviteToken: newStatus ? inviteToken : null,
            inviteExpires: newStatus ? inviteExpires : null,
        },
        select: { id: true, isActive: true, email: true, name: true, inviteToken: true },
    });

    // Handle notifications
    try {
        if (!updated.isActive) {
            await sendTerminationEmail({
                email: updated.email,
                name: updated.name,
            });
        } else if (updated.isActive && updated.inviteToken) {
            await sendReinstatementEmail({
                email: updated.email,
                name: updated.name,
                token: updated.inviteToken,
            });
        }
    } catch (err) {
        console.error("Staff notification email failed:", err);
    }

    return NextResponse.json({ ok: true, isActive: updated.isActive });
}
