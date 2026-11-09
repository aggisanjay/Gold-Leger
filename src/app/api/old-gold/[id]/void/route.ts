import { api, body } from "@/server/api";
import { voidSchema } from "@/server/schemas";
import { voidOldGold } from "@/server/services/oldgold";

export const POST = api<{ id: string }>(["FINANCE"], async ({ req, ctx, params }) => { await voidOldGold(ctx, params.id, (await body(req, voidSchema)).reason); return { ok: true }; });
