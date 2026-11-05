import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "goldtrack-erp-super-secret-jwt-key-2026-luxury-bullion";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  branchId?: string | null;
  karigarId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("goldtrack_session")?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

