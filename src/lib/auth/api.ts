import type { Role } from "./jwt";
import { getSession } from "./server";
import { NextResponse } from "next/server";

export async function requireApiSession(allowedRoles?: Role[]) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return session;
}

