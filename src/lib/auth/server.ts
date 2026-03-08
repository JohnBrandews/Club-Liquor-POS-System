import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionJwt } from "./jwt";
import type { Role } from "./jwt";

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionJwt(token);
  } catch {
    return null;
  }
}

export async function requireSession(allowedRoles?: Role[]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

