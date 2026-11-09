import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./services/core";

export const COOKIE = "gl_session";
const MAX_AGE_S = 10 * 60 * 60; // a working day on a shared tablet

export interface SessionUser { id: string; name: string; username: string; role: Role; karigarId: string | null }

/** There is deliberately NO fallback secret: if it is missing the app refuses to sign anyone in. */
function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing or shorter than 32 characters. Run `npm run setup` (it generates one) or set it in the environment.");
  return new TextEncoder().encode(s);
}

export async function signSession(u: SessionUser): Promise<string> {
  return new SignJWT({ name: u.name, username: u.username, role: u.role, kid: u.karigarId })
    .setProtectedHeader({ alg: "HS256" }).setSubject(u.id).setIssuedAt().setExpirationTime(`${MAX_AGE_S}s`).sign(secret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return { id: String(payload.sub), name: String(payload.name), username: String(payload.username), role: payload.role as Role, karigarId: (payload.kid as string) ?? null };
  } catch { return null; }
}

export const cookieOptions = () => ({
  httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE_S,
  secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
});
