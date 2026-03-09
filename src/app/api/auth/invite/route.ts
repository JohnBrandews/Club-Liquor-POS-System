import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

const InviteSubmitSchema = z.object({
    token: z.string(),
    password: z.string().min(8),
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { inviteToken: token },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            inviteExpires: true,
        }
    });

    if (!user) {
        return NextResponse.json({ error: "Invalid or expired invitation link" }, { status: 404 });
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
        return NextResponse.json({ error: "Invitation link has expired" }, { status: 400 });
    }

    return NextResponse.json({ user });
}

export async function POST(req: Request) {
    const body = InviteSubmitSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { inviteToken: body.data.token },
    });

    if (!user || (user.inviteExpires && user.inviteExpires < new Date())) {
        return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.data.password);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            inviteToken: null,
            inviteExpires: null,
            isActive: true,
        },
    });

    return NextResponse.json({ ok: true });
}
