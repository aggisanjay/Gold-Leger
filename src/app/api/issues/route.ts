import { api, body } from "@/server/api";
import { issueSchema } from "@/server/schemas";
import { issueGold } from "@/server/services/work";

export const POST = api(["CLERK", "FINANCE"], async ({ req, ctx }) => {
  const i = await body(req, issueSchema);
  return issueGold(ctx, { ...i, grossMg: i.gross, purityBp: i.purity });
});
