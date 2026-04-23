import { SignJWT, jwtVerify } from "jose";

import { requireSecret } from "../env";

const ISSUER = "kanolens";
const AUDIENCE = "kanolens-web";
const EXPIRY = "7d";

export const AUTH_COOKIE = "kanolens_token";

export interface AuthPayload {
  sub: string; // user id (uuid)
  email: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(requireSecret("JWT_SECRET"));
}

export async function signAuthToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export function authCookieOptions(isProd: boolean): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
