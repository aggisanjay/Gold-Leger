import { api, body } from "@/server/api";
import { withTx } from "@/server/db";
import { audit, setSetting } from "@/server/services/core";
import { settingsSchema } from "@/server/schemas";

/** The day's gold rate, used to value old gold. Finance only. */
export const PUT = api(["FINANCE"], async ({ req, ctx }) => {
  const i = await body(req, settingsSchema);
  const [r, p = ""] = i.goldRate.split(".");
  const paise = Number(r) * 100 + Number(p.padEnd(2, "0"));
  await withTx(async (t) => { await setSetting(t, "gold_rate_paise", String(paise)); await audit(t, ctx, "RATE_SET", "setting", "gold_rate_paise", { paise }); });
  return { ok: true };
});
