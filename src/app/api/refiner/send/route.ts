import { api, body } from "@/server/api";
import { refinerSendSchema } from "@/server/schemas";
import { sendToRefiner } from "@/server/services/oldgold";

export const POST = api(["FINANCE"], async ({ req, ctx }) => { const i = await body(req, refinerSendSchema); return sendToRefiner(ctx, { fineMg: i.fine, note: i.note ?? undefined, idempotencyKey: i.idempotencyKey }); });
