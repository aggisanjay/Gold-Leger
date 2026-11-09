import { api, body } from "@/server/api";
import { read } from "@/server/db";
import { karigarSchema } from "@/server/schemas";
import { createKarigar } from "@/server/services/work";
import { listKarigars } from "@/server/services/queries";

export const GET = api(["CLERK", "FINANCE", "PARTNER"], async ({ ctx }) => ({ karigars: await read((c) => listKarigars(c, ctx)) }));
export const POST = api(["FINANCE"], async ({ req, ctx }) => { const i = await body(req, karigarSchema); return createKarigar(ctx, { ...i, nameTa: i.nameTa ?? undefined, phone: i.phone || undefined, bench: i.bench ?? undefined }); });
