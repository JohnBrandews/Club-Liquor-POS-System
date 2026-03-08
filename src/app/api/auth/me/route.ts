import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
}

