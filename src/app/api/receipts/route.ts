import { api, body } from "@/server/api";
import { receiveSchema } from "@/server/schemas";
import { receiveGold } from "@/server/services/work";

export const POST = api(["CLERK", "FINANCE"], async ({ req, ctx }) => {
  const i = await body(req, receiveSchema);
  return receiveGold(ctx, { ...i, lines: i.lines.map((l) => ({ ...l, grossMg: l.gross, purityBp: l.purity })) });
});
