import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/api";

export async function GET() {
  const sessionOrRes = await requireApiSession();
  if (sessionOrRes instanceof Response) return sessionOrRes;

  return NextResponse.json({
    ok: true,
    user: {
      id: sessionOrRes.sub,
      email: sessionOrRes.email,
      name: sessionOrRes.name,
      role: sessionOrRes.role,
    },
  });
}

