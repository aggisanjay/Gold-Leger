import { api, body } from "@/server/api";
import { refinerReceiveSchema } from "@/server/schemas";
import { receiveFromRefiner } from "@/server/services/oldgold";

export const POST = api(["FINANCE"], async ({ req, ctx }) => {
  const i = await body(req, refinerReceiveSchema);
  return receiveFromRefiner(ctx, { returnedMg: i.returned, differenceMg: i.difference, note: i.note ?? undefined, idempotencyKey: i.idempotencyKey });
});
