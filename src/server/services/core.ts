import type { Transaction } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { all, one, run } from "../db";
import { ApiError, forbidden, notFound } from "../errors";
import { istDate, isoNow } from "../clock";
import { compareReading, type ReadingKind } from "@/domain/reading";

export type Role = "CLERK" | "FINANCE" | "PARTNER" | "KARIGAR";
export interface Ctx { userId: string; role: Role; now: Date; karigarId?: string | null }
export const newId = () => randomUUID();

export function assertRole(ctx: Ctx, roles: Role[]) {
  if (!roles.includes(ctx.role)) throw forbidden();
}

export const SETTING_DEFAULTS: Record<string, string> = {
  company_name: "Company A",
  gold_rate_paise: "1250000", // Rs 12,500.00 per gram: the brief's assumed rate
  pan_threshold_paise: "20000000", // ASSUMPTION: Rs 2,00,000
  cash_limit_paise: "20000000", // ASSUMPTION: Rs 2,00,000
  job_excess_min_mg: "100", // ignore sub-0.100 g differences
  stale_job_days: "14",
};

export async function getSetting(c: Transaction | import("@libsql/client").Client, key: string): Promise<string> {
  const r = await one<{ value: string }>(c, "SELECT value FROM settings WHERE key = ?", [key]);
  return r?.value ?? SETTING_DEFAULTS[key] ?? "";
}
export async function getSettingNum(c: Transaction | import("@libsql/client").Client, key: string): Promise<number> {
  return Number(await getSetting(c, key));
}
export async function setSetting(c: Transaction, key: string, value: string) {
  await run(c, "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
}

export async function nextNo(t: Transaction, name: string, start: number): Promise<number> {
  await run(t, "INSERT INTO sequences(name, value) VALUES(?, ?) ON CONFLICT(name) DO UPDATE SET value = value + 1", [name, start + 1]);
  const r = await one<{ value: number }>(t, "SELECT value FROM sequences WHERE name = ?", [name]);
  return r!.value;
}

export async function audit(t: Transaction, ctx: Ctx, action: string, entity: string, entityId: string, detail: unknown = {}) {
  await run(t, "INSERT INTO audit_log(at, user_id, action, entity, entity_id, detail) VALUES(?,?,?,?,?,?)", [isoNow(ctx.now), ctx.userId, action, entity, entityId, JSON.stringify(detail)]);
}

export interface TxnInput {
  kind: "OPENING" | "ISSUE" | "RECEIPT" | "ALLOWANCE" | "LOSS" | "OLD_GOLD" | "TO_REFINER" | "FROM_REFINER" | "REVERSAL";
  subtype?: "PIECE" | "SCRAP" | "FILINGS" | null;
  jobId?: string | null; karigarId?: string | null; slipNo?: string | null;
  grossMg?: number | null; purityBp?: number | null; fineMg: number;
  huid?: string | null; itemDesc?: string | null;
  weightReadingId?: string | null; purityReadingId?: string | null; verification?: string | null; note?: string | null;
  reverses?: string | null; idempotencyKey?: string | null;
  from: string; to: string;
}

/**
 * Post one movement of fine gold. A movement is always two lines that cancel exactly, so gold can
 * only move between accounts, never appear or vanish.
 */
export async function postTxn(t: Transaction, ctx: Ctx, i: TxnInput): Promise<{ id: string; txnNo: string; businessDate: string }> {
  if (!Number.isSafeInteger(i.fineMg) || i.fineMg <= 0) throw new ApiError(422, "INVALID", "The fine weight must be more than zero.");
  const id = newId();
  const txnNo = `TX-${await nextNo(t, "txn", 30000)}`;
  const businessDate = istDate(ctx.now);
  await run(
    t,
    `INSERT INTO txns (id, txn_no, kind, subtype, job_id, karigar_id, slip_no, gross_mg, purity_bp, fine_mg, huid, item_desc,
       weight_reading_id, purity_reading_id, verification, note, reverses, business_date, created_at, created_by, idempotency_key)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, txnNo, i.kind, i.subtype ?? null, i.jobId ?? null, i.karigarId ?? null, i.slipNo ?? null, i.grossMg ?? null, i.purityBp ?? null, i.fineMg,
     i.huid ?? null, i.itemDesc ?? null, i.weightReadingId ?? null, i.purityReadingId ?? null, i.verification ?? null, i.note ?? null,
     i.reverses ?? null, businessDate, isoNow(ctx.now), ctx.userId, i.idempotencyKey ?? null],
  );
  await run(t, "INSERT INTO ledger_lines(txn_id, account, fine_mg, business_date) VALUES (?,?,?,?)", [id, i.from, -i.fineMg, businessDate]);
  await run(t, "INSERT INTO ledger_lines(txn_id, account, fine_mg, business_date) VALUES (?,?,?,?)", [id, i.to, i.fineMg, businessDate]);
  return { id, txnNo, businessDate };
}

type Exec = Transaction | import("@libsql/client").Client;

export async function accountBalance(c: Exec, account: string, upTo?: string): Promise<number> {
  const r = upTo
    ? await one<{ v: number }>(c, "SELECT COALESCE(SUM(fine_mg),0) AS v FROM ledger_lines WHERE account = ? AND business_date <= ?", [account, upTo])
    : await one<{ v: number }>(c, "SELECT COALESCE(SUM(fine_mg),0) AS v FROM ledger_lines WHERE account = ?", [account]);
  return Number(r?.v ?? 0);
}

/** What went out and came back for a job, ignoring entries that were reversed. */
export async function jobSums(c: Exec, jobId: string) {
  const r = await one<{ issued: number; piece: number; scrap: number; filings: number }>(
    c,
    `SELECT COALESCE(SUM(CASE WHEN kind='ISSUE' THEN fine_mg END),0) AS issued,
            COALESCE(SUM(CASE WHEN kind='RECEIPT' AND subtype='PIECE' THEN fine_mg END),0) AS piece,
            COALESCE(SUM(CASE WHEN kind='RECEIPT' AND subtype='SCRAP' THEN fine_mg END),0) AS scrap,
            COALESCE(SUM(CASE WHEN kind='RECEIPT' AND subtype='FILINGS' THEN fine_mg END),0) AS filings
       FROM txns WHERE job_id = ? AND reversed_by IS NULL AND kind IN ('ISSUE','RECEIPT')`,
    [jobId],
  );
  return { issued: Number(r!.issued), piece: Number(r!.piece), scrap: Number(r!.scrap), filings: Number(r!.filings) };
}

export async function wastageFor(c: Exec, karigarId: string, categoryId: string): Promise<number> {
  const r = await one<{ wastage_bp: number }>(c, "SELECT wastage_bp FROM karigar_wastage WHERE karigar_id = ? AND category_id = ?", [karigarId, categoryId]);
  if (r) return Number(r.wastage_bp);
  const d = await one<{ default_wastage_bp: number }>(c, "SELECT default_wastage_bp FROM categories WHERE id = ?", [categoryId]);
  if (!d) throw notFound("The item category");
  return Number(d.default_wastage_bp);
}

export interface ReadingRef { id: string; confirmed?: boolean }

/**
 * The photo rule, enforced where it cannot be bypassed. The server loads the reading itself, so a
 * client can neither invent a reading nor reuse one photo for two entries.
 */
export async function verifyReading(
  t: Transaction, ref: ReadingRef | null | undefined, kind: ReadingKind, typed: number, what: string,
): Promise<{ outcome: string; readingId: string | null }> {
  if (!ref) return { outcome: "NO_PHOTO", readingId: null };
  const r = await one<{ id: string; kind: string; status: "READ" | "UNSURE" | "UNREADABLE"; value: number | null; used_by: string | null }>(
    t, "SELECT id, kind, status, value, used_by FROM readings WHERE id = ?", [ref.id],
  );
  if (!r || r.kind !== kind) throw new ApiError(422, "READING_UNKNOWN", `The ${what} photo could not be found. Take it again.`);
  if (r.used_by) throw new ApiError(422, "READING_REUSED", `That ${what} photo was already used for another entry. Take a new photo.`);
  const cmp = compareReading(typed, { status: r.status, value: r.value }, !!ref.confirmed, kind === "WEIGHT" ? "g" : "%");
  if (!cmp.canSave) throw new ApiError(422, cmp.outcome === "MISMATCH" ? "READING_MISMATCH" : "READING_NEEDS_CONFIRMATION", cmp.message, { [kind === "WEIGHT" ? "gross" : "purity"]: cmp.message });
  return { outcome: cmp.outcome, readingId: r.id };
}

export async function markReadingsUsed(t: Transaction, ids: (string | null)[], txnId: string) {
  for (const id of ids) if (id) await run(t, "UPDATE readings SET used_by = ? WHERE id = ? AND used_by IS NULL", [txnId, id]);
}

export const verificationLabel = (w: string, p: string) => `weight:${w};purity:${p}`;

export async function listJson<T>(c: Exec, sql: string, args: any[] = []): Promise<T[]> {
  return all<T>(c, sql, args);
}
