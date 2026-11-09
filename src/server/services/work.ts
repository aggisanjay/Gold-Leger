import type { Transaction } from "@libsql/client";
import { all, one, run, withTx, type Row } from "../db";
import { ApiError, badRequest, conflict, notFound } from "../errors";
import { isoNow, istDate } from "../clock";
import {
  accountBalance, assertRole, audit, jobSums, markReadingsUsed, newId, nextNo, postTxn, verificationLabel,
  verifyReading, wastageFor, type Ctx, type ReadingRef,
} from "./core";
import { evaluateAfterClose } from "./alerts";
import { fineMg, formatGrams, type Bp, type Mg } from "@/domain/units";
import { jobPosition, settleJob, SettlementError, type JobPosition } from "@/domain/settlement";
import { ACCOUNTS as A, karigarAccount } from "@/domain/stock";
import { isHuid } from "@/domain/validators";

const MAX_MG = 5_000_000;

/* ───────── karigar master ───────── */

export async function createKarigar(ctx: Ctx, i: { name: string; nameTa?: string; phone?: string; bench?: string }) {
  assertRole(ctx, ["FINANCE"]);
  return withTx(async (t) => {
    const id = newId();
    const n = await nextNo(t, "karigar", 0);
    const code = `K-${String(n).padStart(3, "0")}`;
    await run(t, "INSERT INTO karigars(id, code, name, name_ta, phone, bench, active, created_at) VALUES (?,?,?,?,?,?,1,?)",
      [id, code, i.name.trim(), i.nameTa?.trim() || null, i.phone?.trim() || null, i.bench?.trim() || null, isoNow(ctx.now)]);
    await audit(t, ctx, "KARIGAR_CREATED", "karigar", id, { code, name: i.name });
    return { id, code };
  });
}

export async function updateKarigar(ctx: Ctx, id: string, p: { name?: string; nameTa?: string | null; phone?: string | null; bench?: string | null; active?: boolean }) {
  assertRole(ctx, ["FINANCE"]);
  return withTx(async (t) => {
    const k = await one(t, "SELECT * FROM karigars WHERE id = ?", [id]);
    if (!k) throw notFound("The karigar");
    if (p.active === false) {
      const bal = await accountBalance(t, karigarAccount(id));
      if (bal !== 0) throw conflict(`This karigar still holds ${formatGrams(bal)} g of fine gold. Settle their jobs before deactivating.`, "HAS_BALANCE");
    }
    await run(t, "UPDATE karigars SET name = ?, name_ta = ?, phone = ?, bench = ?, active = ? WHERE id = ?", [
      p.name?.trim() ?? k.name, p.nameTa === undefined ? k.name_ta : p.nameTa, p.phone === undefined ? k.phone : p.phone,
      p.bench === undefined ? k.bench : p.bench, p.active === undefined ? k.active : p.active ? 1 : 0, id]);
    await audit(t, ctx, "KARIGAR_UPDATED", "karigar", id, p);
  });
}

export async function setWastage(ctx: Ctx, karigarId: string, categoryId: string, wastageBp: Bp) {
  assertRole(ctx, ["FINANCE"]);
  if (wastageBp < 0 || wastageBp > 2000) throw badRequest("Agreed wastage must be between 0.00% and 20.00%.", { wastage: "Between 0.00 and 20.00" });
  return withTx(async (t) => {
    if (!(await one(t, "SELECT 1 FROM karigars WHERE id = ?", [karigarId])) || !(await one(t, "SELECT 1 FROM categories WHERE id = ?", [categoryId]))) throw notFound("The karigar or category");
    await run(t, `INSERT INTO karigar_wastage(karigar_id, category_id, wastage_bp, updated_by, updated_at) VALUES (?,?,?,?,?)
                  ON CONFLICT(karigar_id, category_id) DO UPDATE SET wastage_bp = excluded.wastage_bp, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      [karigarId, categoryId, wastageBp, ctx.userId, isoNow(ctx.now)]);
    await audit(t, ctx, "WASTAGE_SET", "karigar", karigarId, { categoryId, wastageBp });
  });
}

/* ───────── job position ───────── */

export interface JobView {
  id: string; jobNo: string; karigarId: string; karigarName: string; categoryId: string; categoryName: string; description: string | null;
  status: "OPEN" | "CLOSED"; openedOn: string; closedOn: string | null; wastageBp: number; position: JobPosition;
  allowanceMg: number | null; lossMg: number | null;
}

export async function jobView(c: Transaction | import("@libsql/client").Client, jobId: string): Promise<JobView> {
  const j = await one<Row>(c,
    `SELECT j.*, k.name AS karigar_name, c.name AS category_name FROM jobs j JOIN karigars k ON k.id = j.karigar_id JOIN categories c ON c.id = j.category_id WHERE j.id = ?`, [jobId]);
  if (!j) throw notFound("The job");
  const s = await jobSums(c, jobId);
  return {
    id: j.id, jobNo: j.job_no, karigarId: j.karigar_id, karigarName: j.karigar_name, categoryId: j.category_id, categoryName: j.category_name,
    description: j.description, status: j.status, openedOn: j.opened_on, closedOn: j.closed_on, wastageBp: Number(j.wastage_bp),
    allowanceMg: j.allowance_mg === null ? null : Number(j.allowance_mg), lossMg: j.loss_mg === null ? null : Number(j.loss_mg),
    position: jobPosition({ issuedFineMg: s.issued, pieceFineMg: s.piece, scrapFineMg: s.scrap, filingsFineMg: s.filings, wastageBp: Number(j.wastage_bp) }),
  };
}

/* ───────── issue ───────── */

export interface IssueInput {
  karigarId: string; categoryId: string; jobId?: string | null; description?: string | null;
  grossMg: Mg; purityBp: Bp; weightReading?: ReadingRef | null; purityReading?: ReadingRef | null; note?: string | null; idempotencyKey: string;
}

export interface IssueResult {
  txnNo: string; slipNo: string; jobId: string; jobNo: string; grossMg: Mg; purityBp: Bp; fineMg: Mg;
  vaultAfterMg: Mg; karigarBalanceMg: Mg; job: JobView; replayed: boolean;
}

async function issueResult(t: Transaction, tx: Row, replayed: boolean): Promise<IssueResult> {
  const job = await jobView(t, tx.job_id);
  return {
    txnNo: tx.txn_no, slipNo: tx.slip_no, jobId: job.id, jobNo: job.jobNo, grossMg: Number(tx.gross_mg), purityBp: Number(tx.purity_bp), fineMg: Number(tx.fine_mg),
    vaultAfterMg: await accountBalance(t, A.VAULT), karigarBalanceMg: await accountBalance(t, karigarAccount(tx.karigar_id)), job, replayed,
  };
}

export async function issueGold(ctx: Ctx, i: IssueInput): Promise<IssueResult> {
  assertRole(ctx, ["CLERK", "FINANCE"]);
  return withTx(async (t) => {
    const prior = await one<Row>(t, "SELECT * FROM txns WHERE idempotency_key = ?", [i.idempotencyKey]);
    if (prior) return issueResult(t, prior, true);

    if (i.grossMg <= 0 || i.grossMg > MAX_MG) throw badRequest("Enter a gross weight between 0.001 g and 5,000.000 g.", { gross: "Check the weight" });
    const k = await one<Row>(t, "SELECT * FROM karigars WHERE id = ? AND active = 1", [i.karigarId]);
    if (!k) throw notFound("The karigar");

    let job: Row | null;
    if (i.jobId) {
      job = await one<Row>(t, "SELECT * FROM jobs WHERE id = ?", [i.jobId]);
      if (!job || job.karigar_id !== k.id) throw notFound("The job for this karigar");
      if (job.status !== "OPEN") throw conflict(`Job ${job.job_no} is already closed. Start a new job.`, "JOB_CLOSED");
    } else {
      const cat = await one(t, "SELECT id FROM categories WHERE id = ?", [i.categoryId]);
      if (!cat) throw notFound("The item category");
      const wastage = await wastageFor(t, k.id, i.categoryId);
      const id = newId();
      const jobNo = `JB-${await nextNo(t, "job", 4100)}`;
      await run(t, `INSERT INTO jobs(id, job_no, karigar_id, category_id, description, wastage_bp, status, opened_on, created_at) VALUES (?,?,?,?,?,?, 'OPEN', ?, ?)`,
        [id, jobNo, k.id, i.categoryId, i.description?.trim() || null, wastage, istDate(ctx.now), isoNow(ctx.now)]);
      job = await one<Row>(t, "SELECT * FROM jobs WHERE id = ?", [id]);
    }

    const fine = fineMg(i.grossMg, i.purityBp);
    if (fine <= 0) throw badRequest("The fine weight works out to zero. Check the weight and purity.");
    const w = await verifyReading(t, i.weightReading, "WEIGHT", i.grossMg, "weight");
    const p = await verifyReading(t, i.purityReading, "PURITY", i.purityBp, "purity");

    const vault = await accountBalance(t, A.VAULT);
    if (fine > vault) throw new ApiError(422, "VAULT_SHORT", `The vault holds ${formatGrams(vault)} g of fine gold, which is less than the ${formatGrams(fine)} g being issued.`);

    const slipNo = `SL-${await nextNo(t, "slip", 8100)}`;
    const tx = await postTxn(t, ctx, {
      kind: "ISSUE", jobId: job!.id, karigarId: k.id, slipNo, grossMg: i.grossMg, purityBp: i.purityBp, fineMg: fine,
      weightReadingId: w.readingId, purityReadingId: p.readingId, verification: verificationLabel(w.outcome, p.outcome),
      note: i.note?.trim() || null, idempotencyKey: i.idempotencyKey, from: A.VAULT, to: karigarAccount(k.id),
    });
    await markReadingsUsed(t, [w.readingId, p.readingId], tx.id);
    await audit(t, ctx, "ISSUE", "txn", tx.id, { txnNo: tx.txnNo, job: job!.job_no, fineMg: fine });
    const row = await one<Row>(t, "SELECT * FROM txns WHERE id = ?", [tx.id]);
    return issueResult(t, row!, false);
  });
}

/* ───────── receipt ───────── */

export interface ReceiptLineInput {
  subtype: "PIECE" | "SCRAP" | "FILINGS"; grossMg: Mg; purityBp: Bp; huid?: string | null; itemDesc?: string | null;
  weightReading?: ReadingRef | null; purityReading?: ReadingRef | null;
}
export interface ReceiveInput { jobId: string; lines: ReceiptLineInput[]; closeJob?: boolean; note?: string | null; idempotencyKey: string }
export interface ReceiveResult {
  slipNo: string; txnNos: string[]; job: JobView; karigarBalanceMg: Mg; closed: { allowanceMg: Mg; lossMg: Mg } | null; replayed: boolean;
}

async function closeJobTx(t: Transaction, ctx: Ctx, jobId: string) {
  const j = await one<Row>(t, "SELECT * FROM jobs WHERE id = ?", [jobId]);
  if (!j) throw notFound("The job");
  if (j.status !== "OPEN") throw conflict(`Job ${j.job_no} is already closed.`, "JOB_CLOSED");
  const s = await jobSums(t, jobId);
  if (s.issued <= 0) throw badRequest("Nothing was issued on this job.");
  const pos = jobPosition({ issuedFineMg: s.issued, pieceFineMg: s.piece, scrapFineMg: s.scrap, filingsFineMg: s.filings, wastageBp: Number(j.wastage_bp) });
  let st;
  try { st = settleJob(pos); } catch (e) { if (e instanceof SettlementError) throw new ApiError(422, "OVER_RETURN", e.message); throw e; }
  const acct = karigarAccount(j.karigar_id);
  if (st.allowanceMg > 0)
    await postTxn(t, ctx, { kind: "ALLOWANCE", jobId, karigarId: j.karigar_id, fineMg: st.allowanceMg, note: "Agreed wastage written off on closing the job", from: acct, to: A.ALLOWANCE });
  if (st.lossMg > 0)
    await postTxn(t, ctx, { kind: "LOSS", jobId, karigarId: j.karigar_id, fineMg: st.lossMg, note: "Beyond the agreed allowance. Recorded for review", from: acct, to: A.LOSS });
  await run(t, "UPDATE jobs SET status='CLOSED', closed_on=?, allowance_mg=?, loss_mg=?, closed_by=? WHERE id=?", [istDate(ctx.now), st.allowanceMg, st.lossMg, ctx.userId, jobId]);
  await audit(t, ctx, "JOB_CLOSED", "job", jobId, { jobNo: j.job_no, ...st });
  await evaluateAfterClose(t, ctx, { id: jobId, job_no: j.job_no, karigar_id: j.karigar_id }, st, s.issued, pos.allowedMg);
  return st;
}

export async function receiveGold(ctx: Ctx, i: ReceiveInput): Promise<ReceiveResult> {
  assertRole(ctx, ["CLERK", "FINANCE"]);
  if (!i.lines.length && !i.closeJob) throw badRequest("Add at least one item to receive.");
  return withTx(async (t) => {
    if (i.lines.length) {
      const prior = await all<Row>(t, "SELECT * FROM txns WHERE idempotency_key LIKE ? ORDER BY txn_no", [`${i.idempotencyKey}:%`]);
      if (prior.length) {
        const job = await jobView(t, prior[0].job_id);
        return { slipNo: prior[0].slip_no, txnNos: prior.map((p) => p.txn_no), job, karigarBalanceMg: await accountBalance(t, karigarAccount(job.karigarId)), closed: job.status === "CLOSED" ? { allowanceMg: job.allowanceMg ?? 0, lossMg: job.lossMg ?? 0 } : null, replayed: true };
      }
    }
    const job = await one<Row>(t, "SELECT * FROM jobs WHERE id = ?", [i.jobId]);
    if (!job) throw notFound("The job");
    if (job.status !== "OPEN") throw conflict(`Job ${job.job_no} is already closed.`, "JOB_CLOSED");

    const before = await jobSums(t, i.jobId);
    const prepared = i.lines.map((l, n) => {
      if (l.grossMg <= 0 || l.grossMg > MAX_MG) throw badRequest("Enter a weight between 0.001 g and 5,000.000 g.", { [`lines.${n}.gross`]: "Check the weight" });
      const fine = fineMg(l.grossMg, l.purityBp);
      if (fine <= 0) throw badRequest("The fine weight works out to zero. Check the weight and purity.", { [`lines.${n}.gross`]: "Check the weight" });
      const huid = l.subtype === "PIECE" ? (l.huid ?? "").trim().toUpperCase() : "";
      if (l.subtype === "PIECE" && !isHuid(huid)) throw badRequest("A finished piece needs its 6-character HUID, such as A1B2C3.", { [`lines.${n}.huid`]: "6 letters or digits" });
      return { ...l, fine, huid };
    });
    const dupes = prepared.filter((p) => p.huid).map((p) => p.huid);
    if (new Set(dupes).size !== dupes.length) throw badRequest("The same HUID appears twice on this slip.", {}, "HUID_DUPLICATE");

    const added = { piece: 0, scrap: 0, filings: 0 };
    for (const p of prepared) added[p.subtype.toLowerCase() as "piece" | "scrap" | "filings"] += p.fine;
    const recovered = before.piece + before.scrap + before.filings + added.piece + added.scrap + added.filings;
    if (recovered > before.issued)
      throw new ApiError(422, "OVER_RETURN", `This would return ${formatGrams(recovered - before.issued)} g more fine gold than was issued on ${job.job_no}. Check the weights and purity.`);

    const slipNo = i.lines.length ? `SL-${await nextNo(t, "slip", 8100)}` : "";
    const txnNos: string[] = [];
    for (const [n, p] of prepared.entries()) {
      const w = await verifyReading(t, p.weightReading, "WEIGHT", p.grossMg, "weight");
      const pr = await verifyReading(t, p.purityReading, "PURITY", p.purityBp, "purity");
      let tx;
      try {
        tx = await postTxn(t, ctx, {
          kind: "RECEIPT", subtype: p.subtype, jobId: i.jobId, karigarId: job.karigar_id, slipNo, grossMg: p.grossMg, purityBp: p.purityBp, fineMg: p.fine,
          huid: p.huid || null, itemDesc: p.itemDesc?.trim() || null, weightReadingId: w.readingId, purityReadingId: pr.readingId,
          verification: verificationLabel(w.outcome, pr.outcome), note: i.note?.trim() || null, idempotencyKey: `${i.idempotencyKey}:${n}`,
          from: karigarAccount(job.karigar_id), to: p.subtype === "PIECE" ? A.JEWELLERY : A.SCRAP,
        });
      } catch (e: any) {
        if (String(e?.message).includes("ux_txns_huid") || String(e?.message).includes("UNIQUE") && String(e?.message).includes("huid"))
          throw new ApiError(422, "HUID_DUPLICATE", `HUID ${p.huid} has already been recorded on another piece.`, { [`lines.${n}.huid`]: "Already recorded" });
        throw e;
      }
      await markReadingsUsed(t, [w.readingId, pr.readingId], tx.id);
      txnNos.push(tx.txnNo);
    }
    await audit(t, ctx, "RECEIPT", "job", i.jobId, { slipNo, txnNos });

    let closed: ReceiveResult["closed"] = null;
    if (i.closeJob) closed = await closeJobTx(t, ctx, i.jobId);
    const view = await jobView(t, i.jobId);
    return { slipNo, txnNos, job: view, karigarBalanceMg: await accountBalance(t, karigarAccount(job.karigar_id)), closed, replayed: false };
  });
}

export async function closeJob(ctx: Ctx, jobId: string) {
  assertRole(ctx, ["CLERK", "FINANCE"]);
  return withTx(async (t) => {
    const st = await closeJobTx(t, ctx, jobId);
    return { closed: st, job: await jobView(t, jobId) };
  });
}

/* ───────── reversal ───────── */

export async function reverseTxn(ctx: Ctx, txnId: string, reason: string) {
  assertRole(ctx, ["FINANCE"]);
  if (reason.trim().length < 5) throw badRequest("Give a reason of at least a few words.", { reason: "Add a reason" });
  return withTx(async (t) => {
    const tx = await one<Row>(t, "SELECT * FROM txns WHERE id = ?", [txnId]);
    if (!tx) throw notFound("The entry");
    if (tx.reversed_by) throw conflict("This entry has already been reversed.", "ALREADY_REVERSED");
    if (tx.kind !== "ISSUE" && tx.kind !== "RECEIPT") throw conflict("Only issues and receipts can be reversed here.", "NOT_REVERSIBLE");
    const job = await one<Row>(t, "SELECT * FROM jobs WHERE id = ?", [tx.job_id]);
    if (!job || job.status !== "OPEN") throw conflict("The job is closed. A closed job cannot be changed.", "JOB_CLOSED");
    const lines = await all<Row>(t, "SELECT account, fine_mg FROM ledger_lines WHERE txn_id = ?", [txnId]);
    const from = lines.find((l) => Number(l.fine_mg) < 0)!.account, to = lines.find((l) => Number(l.fine_mg) > 0)!.account;
    if (tx.kind === "ISSUE") {
      const s = await jobSums(t, tx.job_id);
      if (s.issued - Number(tx.fine_mg) < s.piece + s.scrap + s.filings)
        throw conflict("Gold has already been received back against this issue. Reverse those receipts first.", "HAS_RECEIPTS");
    }
    const rev = await postTxn(t, ctx, { kind: "REVERSAL", jobId: tx.job_id, karigarId: tx.karigar_id, fineMg: Number(tx.fine_mg), reverses: txnId, note: reason.trim(), from: to, to: from });
    await run(t, "UPDATE txns SET reversed_by = ? WHERE id = ?", [rev.id, txnId]);
    await audit(t, ctx, "REVERSED", "txn", txnId, { reason, reversal: rev.txnNo });
    return { reversalNo: rev.txnNo };
  });
}

/* ───────── gold into the vault ───────── */

/** Fine bullion received from the supplier (or the opening stock). The only way gold enters the vault from outside. */
export async function addBullion(ctx: Ctx, i: { fineMg: Mg; note?: string; idempotencyKey: string }) {
  assertRole(ctx, ["FINANCE"]);
  return withTx(async (t) => {
    const prior = await one<Row>(t, "SELECT txn_no FROM txns WHERE idempotency_key = ?", [i.idempotencyKey]);
    if (prior) return { txnNo: prior.txn_no as string, replayed: true };
    if (i.fineMg <= 0 || i.fineMg > 100_000_000) throw badRequest("Enter the fine weight received, up to 100,000.000 g.", { fine: "Check the weight" });
    const tx = await postTxn(t, ctx, { kind: "OPENING", fineMg: i.fineMg, note: i.note?.trim() || "Bullion received", idempotencyKey: i.idempotencyKey, from: A.EXTERNAL, to: A.VAULT });
    await audit(t, ctx, "BULLION_IN", "txn", tx.id, { fineMg: i.fineMg });
    return { txnNo: tx.txnNo, replayed: false };
  });
}
