import { api } from "@/server/api";
import { closeJob } from "@/server/services/work";

export const POST = api<{ id: string }>(["CLERK", "FINANCE"], async ({ ctx, params }) => closeJob(ctx, params.id));
