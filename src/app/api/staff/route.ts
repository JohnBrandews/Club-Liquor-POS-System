import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession } from "@/lib/auth/api";
import { sendStaffInviteEmail } from "@/lib/mail";

const CreateUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().transform((v) => v.trim().toLowerCase()),
    role: z.enum(["ADMIN", "MANAGER", "BARTENDER", "WAITER"]),
});

export async function GET() {
    const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const users = await prisma.user.findMany({
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });

    return NextResponse.json({ users });
}

export async function POST(req: Request) {
    const sessionOrRes = await requireApiSession(["ADMIN", "MANAGER"]);
    if (sessionOrRes instanceof Response) return sessionOrRes;

    const body = CreateUserSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
        return NextResponse.json({ error: "Invalid payload", details: body.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
        data: {
            name: body.data.name,
            email: body.data.email,
            role: body.data.role,
            inviteToken,
            inviteExpires,
            isActive: false, // Inactive until password set
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });

    try {
        await sendStaffInviteEmail({
            email: user.email,
            name: user.name,
            role: user.role,
            inviteToken,
        });
    } catch (err) {
        console.error("Invite email failed:", err);
    }

    return NextResponse.json({ ok: true, user });
}
