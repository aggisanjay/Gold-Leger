import { api, body } from "@/server/api";
import { refinerSendSchema } from "@/server/schemas";
import { addBullion } from "@/server/services/work";

export const POST = api(["FINANCE"], async ({ req, ctx }) => { const i = await body(req, refinerSendSchema); return addBullion(ctx, { fineMg: i.fine, note: i.note ?? undefined, idempotencyKey: i.idempotencyKey }); });
