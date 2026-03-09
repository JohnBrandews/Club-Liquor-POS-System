import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendResetRequestToAdmin } from "@/lib/mail";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            // Security: don't reveal if email exists
            return NextResponse.json({ ok: true, message: "If that email exists, a request has been sent." });
        }

        // Send notification to admin
        await sendResetRequestToAdmin({
            staffEmail: user.email,
            staffName: user.name,
            staffRole: user.role,
        });

        return NextResponse.json({
            ok: true,
            message: "A reset request has been sent to admin please wait as he sends details to your email."
        });
    } catch (err: any) {
        console.error("Reset request error:", err);
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}
