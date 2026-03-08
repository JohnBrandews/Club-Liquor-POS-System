import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE_NAME, signSessionJwt } from "@/lib/auth/jwt";

const LoginSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = LoginSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: body.data.email },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(body.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSessionJwt({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return res;
}

