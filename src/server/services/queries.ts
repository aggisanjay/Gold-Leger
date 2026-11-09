import type { Client } from "@libsql/client";
import { all, one, type Row } from "../db";
import { forbidden, notFound } from "../errors";
import { addDays, istDate } from "../clock";
import { accountBalance, assertRole, getSetting, getSettingNum, type Ctx } from "./core";
import { closedOutcomes } from "./alerts";
import { jobView, type JobView } from "./work";
import { buildStatement, karigarAccount, ACCOUNTS as A, type Statement } from "@/domain/stock";
import { detectDrift } from "@/domain/drift";
import { ratioBp } from "@/domain/units";
import type { Movement } from "@/domain/tally";

const names = async (c: Client) => Object.fromEntries((await all<{ id: string; name: string }>(c, "SELECT id, name FROM karigars")).map((k) => [k.id, k.name]));

/* ───────── karigars ───────── */

export interface KarigarSummary {
  id: string; code: string; name: string; nameTa: string | null; phone: string | null; bench: string | null; active: boolean;
  balanceMg: number; openJobs: number; oldestOpenOn: string | null; driftLevel: "NONE" | "WATCH" | "REVIEW" | "INSUFFICIENT" | null;
}

export async function listKarigars(c: Client, ctx: Ctx): Promise<KarigarSummary[]> {
  assertRole(ctx, ["CLERK", "FINANCE", "PARTNER"]);
  const rows = await all<Row>(c,
    `SELECT k.*, COALESCE((SELECT SUM(fine_mg) FROM ledger_lines WHERE account = 'KARIGAR:' || k.id), 0) AS balance,
            (SELECT COUNT(*) FROM jobs WHERE karigar_id = k.id AND status = 'OPEN') AS open_jobs,
            (SELECT MIN(opened_on) FROM jobs WHERE karigar_id = k.id AND status = 'OPEN') AS oldest_open
       FROM karigars k ORDER BY k.active DESC, k.name`);
  const showDrift = ctx.role === "FINANCE" || ctx.role === "PARTNER";
  const out: KarigarSummary[] = [];
  for (const r of rows) {
    out.push({
      id: r.id, code: r.code, name: r.name, nameTa: r.name_ta, phone: r.phone, bench: r.bench, active: !!r.active, balanceMg: Number(r.balance),
      openJobs: Number(r.open_jobs), oldestOpenOn: r.oldest_open,
      driftLevel: showDrift ? detectDrift(await closedOutcomes(c, r.id)).level : null,
    });
  }
  return out;
}

export interface LedgerEntry {
  txnId: string; txnNo: string; kind: string; subtype: string | null; businessDate: string; jobNo: string | null; slipNo: string | null;
  grossMg: number | null; purityBp: number | null; huid: string | null; itemDesc: string | null; note: string | null; reversed: boolean;
  fineMg: number; runningMg: number; createdAt: string;
}

export async function karigarLedger(c: Client, karigarId: string, upTo: string): Promise<{ entries: LedgerEntry[]; balanceMg: number; openingMg: number }> {
  const rows = await all<Row>(c,
    `SELECT l.fine_mg AS line_fine, l.business_date, t.id AS txn_id, t.txn_no, t.kind, t.subtype, t.gross_mg, t.purity_bp, t.huid, t.item_desc, t.note,
            t.reversed_by, t.slip_no, t.created_at, j.job_no
       FROM ledger_lines l JOIN txns t ON t.id = l.txn_id LEFT JOIN jobs j ON j.id = t.job_id
      WHERE l.account = ? AND l.business_date <= ? ORDER BY l.id`, [karigarAccount(karigarId), upTo]);
  let run = 0;
  const entries = rows.map((r) => {
    run += Number(r.line_fine);
    return {
      txnId: r.txn_id, txnNo: r.txn_no, kind: r.kind, subtype: r.subtype, businessDate: r.business_date, jobNo: r.job_no, slipNo: r.slip_no,
      grossMg: r.gross_mg === null ? null : Number(r.gross_mg), purityBp: r.purity_bp === null ? null : Number(r.purity_bp), huid: r.huid, itemDesc: r.item_desc,
      note: r.note, reversed: !!r.reversed_by, fineMg: Number(r.line_fine), runningMg: run, createdAt: r.created_at,
    };
  });
  const openingMg = entries.filter((e) => e.businessDate < upTo).reduce((a, e) => a + e.fineMg, 0);
  return { entries, balanceMg: run, openingMg };
}

export async function openJobs(c: Client, karigarId?: string): Promise<JobView[]> {
  const ids = await all<{ id: string }>(c, `SELECT id FROM jobs WHERE status = 'OPEN' ${karigarId ? "AND karigar_id = ?" : ""} ORDER BY opened_on, job_no`, karigarId ? [karigarId] : []);
  return Promise.all(ids.map((r) => jobView(c, r.id)));
}

export async function recentClosedJobs(c: Client, karigarId: string, limit = 12): Promise<JobView[]> {
  const ids = await all<{ id: string }>(c, "SELECT id FROM jobs WHERE status = 'CLOSED' AND karigar_id = ? ORDER BY closed_on DESC, job_no DESC LIMIT ?", [karigarId, limit]);
  return Promise.all(ids.map((r) => jobView(c, r.id)));
}

export async function karigarDetail(c: Client, ctx: Ctx, id: string, date?: string) {
  assertRole(ctx, ["CLERK", "FINANCE", "PARTNER"]);
  const k = await one<Row>(c, "SELECT * FROM karigars WHERE id = ?", [id]);
  if (!k) throw notFound("The karigar");
  const day = date ?? istDate();
  const wastage = await all<Row>(c,
    `SELECT c.id AS category_id, c.name, c.name_ta, c.default_wastage_bp, w.wastage_bp
       FROM categories c LEFT JOIN karigar_wastage w ON w.category_id = c.id AND w.karigar_id = ? ORDER BY c.name`, [id]);
  const ledger = await karigarLedger(c, id, day);
  const finance = ctx.role === "FINANCE" || ctx.role === "PARTNER";
  return {
    karigar: { id: k.id, code: k.code, name: k.name, nameTa: k.name_ta, phone: k.phone, bench: k.bench, active: !!k.active },
    asOf: day,
    wastage: wastage.map((w) => ({ categoryId: w.category_id, name: w.name, nameTa: w.name_ta, defaultBp: Number(w.default_wastage_bp), agreedBp: w.wastage_bp === null ? null : Number(w.wastage_bp) })),
    ledger,
    openJobs: await openJobs(c, id),
    recentJobs: await recentClosedJobs(c, id),
    drift: finance ? detectDrift(await closedOutcomes(c, id)) : null,
  };
}

/* ───────── statement and movements ───────── */

export async function statementFor(c: Client, ctx: Ctx, date: string): Promise<Statement> {
  assertRole(ctx, ["FINANCE", "PARTNER"]);
  const rows = await all<Row>(c, "SELECT account, business_date, SUM(fine_mg) AS fine_mg FROM ledger_lines WHERE business_date <= ? GROUP BY account, business_date", [date]);
  return buildStatement(rows.map((r) => ({ account: r.account, businessDate: r.business_date, fineMg: Number(r.fine_mg) })), date, await names(c));
}

const godown = (account: string, nm: Record<string, string>) =>
  account === A.VAULT ? "Vault - Fine Gold" : account === A.JEWELLERY ? "Vault - Finished Jewellery" : account === A.SCRAP ? "Vault - Scrap and Old Gold"
  : account === A.REFINER ? "Refiner" : account === A.ALLOWANCE ? "Wastage Allowed" : account === A.LOSS ? "Loss Under Review"
  : account === A.EXTERNAL ? "Outside (opening stock and purchases)" : `Karigar - ${nm[account.slice(8)] ?? account.slice(8)}`;

export async function movementsFor(c: Client, ctx: Ctx, date: string): Promise<Movement[]> {
  assertRole(ctx, ["FINANCE", "PARTNER"]);
  const nm = await names(c);
  const rows = await all<Row>(c,
    `SELECT t.txn_no, t.kind, t.note, t.item_desc, t.business_date, l.account, l.fine_mg, j.job_no
       FROM txns t JOIN ledger_lines l ON l.txn_id = t.id LEFT JOIN jobs j ON j.id = t.job_id WHERE t.business_date = ? ORDER BY t.txn_no, l.fine_mg`, [date]);
  const byTx = new Map<string, Row[]>();
  for (const r of rows) byTx.set(r.txn_no, [...(byTx.get(r.txn_no) ?? []), r]);
  const label: Record<string, string> = { ISSUE: "Issue to karigar", RECEIPT: "Receipt from karigar", ALLOWANCE: "Agreed wastage", LOSS: "Loss under review", OLD_GOLD: "Old gold purchase", TO_REFINER: "Sent to refiner", FROM_REFINER: "Received from refiner", REVERSAL: "Reversal", OPENING: "Opening stock" };
  return [...byTx.values()].map((ls) => {
    const from = ls.find((l) => Number(l.fine_mg) < 0)!, to = ls.find((l) => Number(l.fine_mg) > 0)!;
    return {
      voucherNo: from.txn_no, date, from: godown(from.account, nm), to: godown(to.account, nm), fineMg: Number(to.fine_mg),
      narration: [label[from.kind] ?? from.kind, from.job_no, from.item_desc ?? from.note].filter(Boolean).join(", "),
    };
  });
}

/* ───────── recent activity and slips ───────── */

export async function recentTxns(c: Client, ctx: Ctx, limit = 12, onlyToday = false) {
  assertRole(ctx, ["CLERK", "FINANCE", "PARTNER"]);
  const rows = await all<Row>(c,
    `SELECT t.txn_no, t.kind, t.subtype, t.slip_no, t.gross_mg, t.purity_bp, t.fine_mg, t.created_at, t.business_date, t.reversed_by, k.name AS karigar_name, j.job_no, u.name AS by_name
       FROM txns t LEFT JOIN karigars k ON k.id = t.karigar_id LEFT JOIN jobs j ON j.id = t.job_id LEFT JOIN users u ON u.id = t.created_by
      WHERE t.kind IN ('ISSUE','RECEIPT','OLD_GOLD') ${onlyToday ? "AND t.business_date = ?" : ""} ORDER BY t.created_at DESC, t.txn_no DESC LIMIT ?`,
    onlyToday ? [istDate(), limit] : [limit]);
  return rows.map((r) => ({
    txnNo: r.txn_no as string, kind: r.kind as string, subtype: r.subtype as string | null, slipNo: r.slip_no as string | null, grossMg: r.gross_mg === null ? null : Number(r.gross_mg),
    purityBp: r.purity_bp === null ? null : Number(r.purity_bp), fineMg: Number(r.fine_mg), createdAt: r.created_at as string, reversed: !!r.reversed_by,
    karigarName: r.karigar_name as string | null, jobNo: r.job_no as string | null, byName: r.by_name as string | null,
  }));
}

export async function slipData(c: Client, ctx: Ctx, slipNo: string) {
  const lines = await all<Row>(c,
    `SELECT t.*, k.name AS karigar_name, k.name_ta AS karigar_name_ta, k.code AS karigar_code, j.job_no, cat.name AS category_name, u.name AS by_name
       FROM txns t LEFT JOIN karigars k ON k.id = t.karigar_id LEFT JOIN jobs j ON j.id = t.job_id LEFT JOIN categories cat ON cat.id = j.category_id LEFT JOIN users u ON u.id = t.created_by
      WHERE t.slip_no = ? ORDER BY t.txn_no`, [slipNo]);
  if (!lines.length) throw notFound("The slip");
  if (ctx.role === "KARIGAR" && lines[0].karigar_id !== ctx.karigarId) throw forbidden();
  const first = lines[0];
  const job = await jobView(c, first.job_id);
  const asOf = await karigarLedger(c, first.karigar_id, "9999-12-31");
  // running balance after each line of this slip
  const slipIds = new Set(lines.map((l) => l.id));
  const all_ = asOf.entries.filter((e) => slipIds.has(e.txnId));
  return {
    slipNo, kind: first.kind as "ISSUE" | "RECEIPT", karigar: { name: first.karigar_name as string, nameTa: first.karigar_name_ta as string | null, code: first.karigar_code as string },
    job, categoryName: first.category_name as string, businessDate: first.business_date as string, createdAt: first.created_at as string, byName: first.by_name as string | null,
    lines: lines.map((l) => ({
      txnNo: l.txn_no as string, subtype: l.subtype as string | null, grossMg: Number(l.gross_mg), purityBp: Number(l.purity_bp), fineMg: Number(l.fine_mg),
      huid: l.huid as string | null, itemDesc: l.item_desc as string | null, verification: l.verification as string | null, reversed: !!l.reversed_by,
      balanceAfterMg: all_.find((e) => e.txnId === l.id)?.runningMg ?? null,
    })),
  };
}

/* ───────── dashboards ───────── */

export async function financeDashboard(c: Client, ctx: Ctx) {
  assertRole(ctx, ["FINANCE", "PARTNER"]);
  const today = istDate();
  const month = today.slice(0, 7);
  const statement = await statementFor(c, ctx, today);
  const alerts = await all<{ level: string; n: number }>(c, "SELECT level, COUNT(*) AS n FROM alerts WHERE status='OPEN' GROUP BY level");
  const trendRows = await all<Row>(c,
    `SELECT substr(j.closed_on,1,7) AS month, SUM(j.loss_mg) AS loss, SUM(j.allowance_mg) AS allowance,
            SUM((SELECT SUM(fine_mg) FROM txns x WHERE x.job_id = j.id AND x.kind='ISSUE' AND x.reversed_by IS NULL)) AS issued
       FROM jobs j WHERE j.status = 'CLOSED' AND j.closed_on >= ? GROUP BY month ORDER BY month`, [addDays(today, -185).slice(0, 7) + "-01"]);
  const trend = trendRows.map((r) => ({ month: r.month as string, lossMg: Number(r.loss), issuedMg: Number(r.issued), lossBp: ratioBp(Number(r.loss), Number(r.issued)) }));
  const mtd = trend.find((t) => t.month === month) ?? { month, lossMg: 0, issuedMg: 0, lossBp: 0 };
  const stale = await getSettingNum(c, "stale_job_days");
  const staleJobs = await all<Row>(c,
    `SELECT j.job_no, k.name AS karigar_name, j.opened_on FROM jobs j JOIN karigars k ON k.id = j.karigar_id WHERE j.status='OPEN' AND j.opened_on <= ? ORDER BY j.opened_on LIMIT 6`, [addDays(today, -stale)]);
  const refinerMg = await accountBalance(c, A.REFINER);
  return {
    date: today, statement, openAlerts: { review: Number(alerts.find((a) => a.level === "REVIEW")?.n ?? 0), watch: Number(alerts.find((a) => a.level === "WATCH")?.n ?? 0) },
    trend, monthToDate: mtd, targetBp: 15,
    staleJobs: staleJobs.map((s) => ({ jobNo: s.job_no as string, karigarName: s.karigar_name as string, openedOn: s.opened_on as string })), refinerMg,
    goldRatePaise: await getSettingNum(c, "gold_rate_paise"), companyName: await getSetting(c, "company_name"),
  };
}

export async function clerkDashboard(c: Client, ctx: Ctx) {
  assertRole(ctx, ["CLERK", "FINANCE"]);
  const jobs = await openJobs(c);
  return { date: istDate(), openJobs: jobs, today: await recentTxns(c, ctx, 12, true) };
}

/* ───────── karigar portal ───────── */

export async function karigarPortal(c: Client, ctx: Ctx) {
  if (ctx.role !== "KARIGAR" || !ctx.karigarId) throw forbidden();
  const k = await one<Row>(c, "SELECT * FROM karigars WHERE id = ?", [ctx.karigarId]);
  if (!k) throw notFound("Your profile");
  const slips = await all<{ slip_no: string }>(c,
    `SELECT slip_no FROM (SELECT slip_no, MAX(created_at) AS at FROM txns WHERE karigar_id = ? AND slip_no IS NOT NULL AND slip_no <> '' GROUP BY slip_no) ORDER BY at DESC LIMIT 15`, [ctx.karigarId]);
  return {
    karigar: { id: k.id as string, name: k.name as string, nameTa: k.name_ta as string | null, code: k.code as string },
    balanceMg: await accountBalance(c, karigarAccount(ctx.karigarId)),
    openJobs: await openJobs(c, ctx.karigarId),
    slips: await Promise.all(slips.map((s) => slipData(c, ctx, s.slip_no))),
  };
}

export async function categories(c: Client) {
  return (await all<Row>(c, "SELECT id, name, name_ta, default_wastage_bp FROM categories ORDER BY name")).map((r) => ({ id: r.id as string, name: r.name as string, nameTa: r.name_ta as string | null, defaultBp: Number(r.default_wastage_bp) }));
}
