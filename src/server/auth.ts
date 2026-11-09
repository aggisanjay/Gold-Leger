import bcrypt from "bcryptjs";
import { one, run, withTx, read } from "./db";
import { ApiError, forbidden, unauthorized } from "./errors";
import { COOKIE, verifySession, type SessionUser } from "./session";
import { assertRole, audit, newId, type Ctx, type Role } from "./services/core";
import { isoNow } from "./clock";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);

/* simple in-memory throttle: 6 failures per 10 minutes per username. Fine for one instance; use a shared store behind several. */
const failures = new Map<string, { n: number; first: number }>();
const WINDOW = 10 * 60 * 1000, MAX_FAILS = 6;

export async function authenticate(username: string, password: string): Promise<SessionUser> {
  const key = username.trim().toLowerCase();
  const f = failures.get(key);
  if (f && Date.now() - f.first < WINDOW && f.n >= MAX_FAILS) throw new ApiError(429, "TOO_MANY_ATTEMPTS", "Too many wrong attempts. Wait a few minutes and try again.");
  const u = await read((c) => one<{ id: string; name: string; username: string; role: Role; password_hash: string; karigar_id: string | null; active: number }>(c, "SELECT * FROM users WHERE username = ?", [key]));
  const ok = u && u.active === 1 && (await bcrypt.compare(password, u.password_hash));
  if (!u || !ok) {
    const cur = f && Date.now() - f.first < WINDOW ? f : { n: 0, first: Date.now() };
    failures.set(key, { n: cur.n + 1, first: cur.first });
    // same work and same message whether the user exists or not
    if (!u) await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuuAbCdEfGhIjKlMnOpQrStUvWxYz01234");
    throw new ApiError(401, "BAD_LOGIN", "That username or password is not right.");
  }
  failures.delete(key);
  return { id: u.id, name: u.name, username: u.username, role: u.role, karigarId: u.karigar_id };
}

export function resetThrottleForTests() { failures.clear(); }

/** The signed-in user from the request cookie (call from route handlers and server components). */
export async function currentUser(): Promise<SessionUser | null> {
  const { cookies } = await import("next/headers");
  return verifySession((await cookies()).get(COOKIE)?.value);
}

export async function requireUser(roles: Role[] | "any" = "any"): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw unauthorized();
  if (roles !== "any" && !roles.includes(u.role)) throw forbidden();
  return u;
}

export const ctxFor = (u: SessionUser, now = new Date()): Ctx => ({ userId: u.id, role: u.role, karigarId: u.karigarId, now });

/** Finance sets a karigar's PIN. Their login is their phone number. */
export async function setKarigarPin(ctx: Ctx, karigarId: string, pin: string) {
  assertRole(ctx, ["FINANCE"]);
  if (!/^\d{6}$/.test(pin)) throw new ApiError(422, "INVALID", "The PIN must be 6 digits.", { pin: "6 digits" });
  return withTx(async (t) => {
    const k = await one<{ id: string; name: string; phone: string | null }>(t, "SELECT id, name, phone FROM karigars WHERE id = ?", [karigarId]);
    if (!k) throw new ApiError(404, "NOT_FOUND", "The karigar was not found.");
    if (!k.phone) throw new ApiError(422, "NO_PHONE", "Add the karigar's phone number first. It is their login.");
    const hash = await hashPassword(pin);
    const existing = await one<{ id: string }>(t, "SELECT id FROM users WHERE karigar_id = ?", [karigarId]);
    if (existing) await run(t, "UPDATE users SET password_hash = ?, username = ?, name = ?, active = 1 WHERE id = ?", [hash, k.phone, k.name, existing.id]);
    else await run(t, "INSERT INTO users(id, name, username, role, password_hash, karigar_id, active, created_at) VALUES (?,?,?,?,?,?,1,?)", [newId(), k.name, k.phone, "KARIGAR", hash, karigarId, isoNow(ctx.now)]);
    await audit(t, ctx, "KARIGAR_PIN_SET", "karigar", karigarId, {});
  });
}
