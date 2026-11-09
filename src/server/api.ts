import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { ApiError, forbidden } from "./errors";
import { ctxFor, requireUser } from "./auth";
import type { Ctx, Role } from "./services/core";
import type { SessionUser } from "./session";

export interface ApiArgs<P> { req: NextRequest; user: SessionUser; ctx: Ctx; params: P }

function fail(e: unknown): NextResponse {
  if (e instanceof ApiError) return NextResponse.json({ error: { code: e.code, message: e.message, fields: e.fields } }, { status: e.status });
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const i of e.issues) fields[i.path.join(".") || "_"] ??= i.message;
    return NextResponse.json({ error: { code: "INVALID", message: Object.values(fields)[0] ?? "Please check the details.", fields } }, { status: 422 });
  }
  console.error("[api] unexpected", e);
  return NextResponse.json({ error: { code: "SERVER", message: "Something went wrong on our side. Nothing was saved. Please try again." } }, { status: 500 });
}

/**
 * Wrap a route: authenticate, check role, block cross-site writes, and turn every error into a
 * consistent JSON shape. The role list is the access control for the route.
 */
export function api<P = Record<string, string>>(roles: Role[] | "any", handler: (a: ApiArgs<P>) => Promise<unknown>) {
  return async (req: NextRequest, rc: { params: Promise<P> }) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        if (origin && new URL(origin).host !== req.headers.get("host")) throw forbidden("Cross-site request blocked.");
      }
      const user = await requireUser(roles);
      const params = (rc?.params ? await rc.params : {}) as P;
      const out = await handler({ req, user, ctx: ctxFor(user), params });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      return fail(e);
    }
  };
}

export async function body<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try { json = await req.json(); } catch { throw new ApiError(400, "BAD_JSON", "The request could not be read."); }
  return schema.parse(json);
}

export { fail as errorResponse };
