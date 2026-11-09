import { api, body } from "@/server/api";
import { pinSchema } from "@/server/schemas";
import { setKarigarPin } from "@/server/auth";

export const POST = api<{ id: string }>(["FINANCE"], async ({ req, ctx, params }) => { await setKarigarPin(ctx, params.id, (await body(req, pinSchema)).pin); return { ok: true }; });
