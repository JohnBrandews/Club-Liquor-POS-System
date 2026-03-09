import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { sendStaffWelcomeEmail } from "@/lib/mail";

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

    if (!user.passwordPlain) {
        return NextResponse.json({ error: "No password on record to send. Please update their password first." }, { status: 400 });
    }

    try {
        await sendStaffWelcomeEmail({
            email: user.email,
            name: user.name,
            password: user.passwordPlain,
            role: user.role,
        });

        return NextResponse.json({ ok: true, message: "Details sent successfully" });
    } catch (err: any) {
        console.error("Email error:", err);
        return NextResponse.json({ error: "Failed to send email: " + err.message }, { status: 500 });
    }
}
