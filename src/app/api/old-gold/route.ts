import { api, body } from "@/server/api";
import { oldGoldSchema } from "@/server/schemas";
import { recordOldGold } from "@/server/services/oldgold";

export const POST = api(["CLERK", "FINANCE"], async ({ req, ctx }) => {
  const i = await body(req, oldGoldSchema);
  return recordOldGold(ctx, { ...i, grossMg: i.gross, deductionMg: i.deduction, purityBp: i.purity });
});
