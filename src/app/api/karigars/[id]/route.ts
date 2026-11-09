import { api, body } from "@/server/api";
import { karigarPatchSchema } from "@/server/schemas";
import { updateKarigar } from "@/server/services/work";

export const PATCH = api<{ id: string }>(["FINANCE"], async ({ req, ctx, params }) => { const i = await body(req, karigarPatchSchema); await updateKarigar(ctx, params.id, { ...i, phone: i.phone === "" ? null : i.phone }); return { ok: true }; });
