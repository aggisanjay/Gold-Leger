import { api, body } from "@/server/api";
import { voidSchema } from "@/server/schemas";
import { reverseTxn } from "@/server/services/work";

export const POST = api<{ id: string }>(["FINANCE"], async ({ req, ctx, params }) => reverseTxn(ctx, params.id, (await body(req, voidSchema)).reason));
