import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { sendStaffInviteEmail, sendPasswordResetEmail } from "@/lib/mail";

export async function POST(
    req: Request,
    { params }: { params: { userId: string } }
) {
    const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const user = await prisma.user.findUnique({
        where: { id: params.userId },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isReset = user.isActive && !user.inviteToken;

    // Refresh token and expiry
    const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: { inviteToken, inviteExpires },
    });

    try {
        if (isReset) {
            await sendPasswordResetEmail({
                email: user.email,
                name: user.name,
                token: inviteToken,
            });
            return NextResponse.json({ ok: true, message: "Reset link sent successfully" });
        } else {
            await sendStaffInviteEmail({
                email: user.email,
                name: user.name,
                role: user.role,
                inviteToken,
            });
            return NextResponse.json({ ok: true, message: "Invite resent successfully" });
        }
    } catch (err: any) {
        console.error("Email error:", err);
        return NextResponse.json({ error: "Failed to send email: " + err.message }, { status: 500 });
    }
}
