import { api, body } from "@/server/api";
import { withTx } from "@/server/db";
import { alertSchema } from "@/server/schemas";
import { resolveAlert } from "@/server/services/alerts";

export const PATCH = api<{ id: string }>(["FINANCE", "PARTNER"], async ({ req, ctx, params }) => {
  const i = await body(req, alertSchema);
  await withTx((t) => resolveAlert(ctx, t, params.id, i.status, i.note));
  return { ok: true };
});
