import { api, body } from "@/server/api";
import { wastageSchema } from "@/server/schemas";
import { setWastage } from "@/server/services/work";

export const PUT = api<{ id: string }>(["FINANCE"], async ({ req, ctx, params }) => { const i = await body(req, wastageSchema); await setWastage(ctx, params.id, i.categoryId, i.wastage); return { ok: true }; });
