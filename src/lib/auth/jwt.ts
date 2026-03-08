import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "pos_token";

export const ROLES = ["ADMIN", "MANAGER", "BARTENDER", "WAITER"] as const;
export type Role = (typeof ROLES)[number];

export type SessionJwtPayload = {
  sub: string;
  role: Role;
  name: string;
  email: string;
};

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signSessionJwt(payload: SessionJwtPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());
}

export async function verifySessionJwt(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as unknown as SessionJwtPayload;
}

