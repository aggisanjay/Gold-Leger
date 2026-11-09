import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/server/auth";
import { cookieOptions, COOKIE, signSession } from "@/server/session";
import { loginSchema } from "@/server/schemas";
import { errorResponse } from "@/server/api";
import { ApiError } from "@/server/errors";

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) throw new ApiError(403, "FORBIDDEN", "Cross-site request blocked.");
    const input = loginSchema.parse(await req.json().catch(() => ({})));
    const user = await authenticate(input.username, input.password);
    const res = NextResponse.json({ user: { name: user.name, role: user.role } });
    res.cookies.set(COOKIE, await signSession(user), cookieOptions());
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
