import { all, one, run, withTx, type Row } from "../db";
import { ApiError, badRequest, conflict, notFound } from "../errors";
import { isoNow } from "../clock";
import { ACCOUNTS as A } from "@/domain/stock";
import { accountBalance, assertRole, audit, getSettingNum, markReadingsUsed, newId, nextNo, postTxn, verificationLabel, verifyReading, type Ctx, type ReadingRef } from "./core";
import { assessOldGold, type PaymentMode } from "@/domain/oldgold";
import { formatGrams, type Bp, type Mg } from "@/domain/units";

export interface OldGoldInput {
  billNo: string; customerName: string; customerPhone?: string | null; grossMg: Mg; deductionMg: Mg; purityBp: Bp;
  paymentMode: PaymentMode; pan?: string | null; weightReading?: ReadingRef | null; purityReading?: ReadingRef | null; idempotencyKey: string;
}

const publicRow = (r: Row) => ({
  id: r.id, purchaseNo: r.purchase_no, txnNo: r.txn_no, billNo: r.bill_no, customerName: r.customer_name, customerPhone: r.customer_phone,
  grossMg: Number(r.gross_mg), deductionMg: Number(r.deduction_mg), netMg: Number(r.net_mg), purityBp: Number(r.purity_bp), fineMg: Number(r.fine_mg),
  ratePaise: Number(r.rate_paise), valuePaise: Number(r.value_paise), paymentMode: r.payment_mode as PaymentMode, pan: r.pan, verification: r.verification,
  status: r.status as "ACTIVE" | "VOID", voidReason: r.void_reason, businessDate: r.business_date, createdAt: r.created_at, createdByName: r.created_by_name,
});
export type OldGoldRecord = ReturnType<typeof publicRow>;

const SELECT = `SELECT o.*, t.txn_no, u.name AS created_by_name FROM old_gold o JOIN txns t ON t.id = o.txn_id LEFT JOIN users u ON u.id = o.created_by`;

export async function recordOldGold(ctx: Ctx, i: OldGoldInput): Promise<OldGoldRecord & { replayed: boolean }> {
  assertRole(ctx, ["CLERK", "FINANCE"]);
  return withTx(async (t) => {
    const prior = await one<Row>(t, `${SELECT} WHERE t.idempotency_key = ?`, [i.idempotencyKey]);
    if (prior) return { ...publicRow(prior), replayed: true };

    const billNo = i.billNo.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9\/\-]{1,29}$/.test(billNo)) throw badRequest("Enter the exchange bill number, such as EX-2611-0417.", { billNo: "Check the bill number" });
    if (i.customerName.trim().length < 2) throw badRequest("Enter the customer's name.", { customerName: "Required" });
    const dup = await one<Row>(t, "SELECT purchase_no FROM old_gold WHERE bill_no = ? AND status = 'ACTIVE'", [billNo]);
    if (dup) throw conflict(`Old gold for bill ${billNo} is already recorded as ${dup.purchase_no}. It is recorded once per bill.`, "BILL_ALREADY_RECORDED");
    if (i.grossMg <= 0) throw badRequest("Enter the gross weight.", { gross: "Required" });

    const rate = await getSettingNum(t, "gold_rate_paise");
    const a = assessOldGold({
      grossMg: i.grossMg, deductionMg: i.deductionMg, purityBp: i.purityBp, ratePaisePerGram: rate, paymentMode: i.paymentMode, pan: i.pan,
      rules: { panThresholdPaise: await getSettingNum(t, "pan_threshold_paise"), cashLimitPaise: await getSettingNum(t, "cash_limit_paise") },
    });
    if (a.errors.length) throw new ApiError(422, "OLD_GOLD_RULE", a.errors[0].message, Object.fromEntries(a.errors.map((e) => [e.field, e.message])));
    if (a.fineMg <= 0) throw badRequest("The fine weight works out to zero.");

    const w = await verifyReading(t, i.weightReading, "WEIGHT", i.grossMg, "weight");
    const p = await verifyReading(t, i.purityReading, "PURITY", i.purityBp, "purity");

    const tx = await postTxn(t, ctx, {
      kind: "OLD_GOLD", grossMg: i.grossMg, purityBp: i.purityBp, fineMg: a.fineMg, itemDesc: `Old gold, bill ${billNo}`, weightReadingId: w.readingId,
      purityReadingId: p.readingId, verification: verificationLabel(w.outcome, p.outcome), idempotencyKey: i.idempotencyKey, from: A.EXTERNAL, to: A.SCRAP,
    });
    const id = newId();
    const purchaseNo = `OG-${await nextNo(t, "oldgold", 2100)}`;
    await run(t,
      `INSERT INTO old_gold (id, purchase_no, txn_id, bill_no, customer_name, customer_phone, gross_mg, deduction_mg, net_mg, purity_bp, fine_mg, rate_paise, value_paise,
         payment_mode, pan, weight_reading_id, purity_reading_id, verification, status, business_date, created_at, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'ACTIVE', ?,?,?)`,
      [id, purchaseNo, tx.id, billNo, i.customerName.trim(), i.customerPhone?.trim() || null, i.grossMg, i.deductionMg, a.netMg, i.purityBp, a.fineMg, rate, a.valuePaise,
        i.paymentMode, (i.pan ?? "").trim().toUpperCase() || null, w.readingId, p.readingId, verificationLabel(w.outcome, p.outcome), tx.businessDate, isoNow(ctx.now), ctx.userId]);
    await markReadingsUsed(t, [w.readingId, p.readingId], tx.id);
    await audit(t, ctx, "OLD_GOLD", "old_gold", id, { purchaseNo, billNo, fineMg: a.fineMg, valuePaise: a.valuePaise });
    return { ...publicRow((await one<Row>(t, `${SELECT} WHERE o.id = ?`, [id]))!), replayed: false };
  });
}

export async function voidOldGold(ctx: Ctx, id: string, reason: string) {
  assertRole(ctx, ["FINANCE"]);
  if (reason.trim().length < 5) throw badRequest("Give a reason of at least a few words.", { reason: "Add a reason" });
  return withTx(async (t) => {
    const o = await one<Row>(t, "SELECT * FROM old_gold WHERE id = ?", [id]);
    if (!o) throw notFound("The old gold record");
    if (o.status !== "ACTIVE") throw conflict("This record is already void.", "ALREADY_VOID");
    const scrap = await accountBalance(t, A.SCRAP);
    if (scrap < Number(o.fine_mg)) throw conflict(`This gold has already left the scrap stock (only ${formatGrams(scrap)} g is there now). Record the correction with the refiner first.`, "ALREADY_MOVED");
    const rev = await postTxn(t, ctx, { kind: "REVERSAL", fineMg: Number(o.fine_mg), reverses: o.txn_id, note: reason.trim(), from: A.SCRAP, to: A.EXTERNAL });
    await run(t, "UPDATE txns SET reversed_by = ? WHERE id = ?", [rev.id, o.txn_id]);
    await run(t, "UPDATE old_gold SET status = 'VOID', void_reason = ?, voided_by = ? WHERE id = ?", [reason.trim(), ctx.userId, id]);
    await audit(t, ctx, "OLD_GOLD_VOID", "old_gold", id, { reason });
  });
}

export async function listOldGold(c: import("@libsql/client").Client, ctx: Ctx, limit = 60): Promise<OldGoldRecord[]> {
  assertRole(ctx, ["CLERK", "FINANCE", "PARTNER"]);
  return (await all<Row>(c, `${SELECT} ORDER BY o.created_at DESC LIMIT ?`, [limit])).map(publicRow);
}

/* ───────── refiner ───────── */

export async function sendToRefiner(ctx: Ctx, i: { fineMg: Mg; note?: string; idempotencyKey: string }) {
  assertRole(ctx, ["FINANCE"]);
  return withTx(async (t) => {
    const prior = await one<Row>(t, "SELECT txn_no FROM txns WHERE idempotency_key = ?", [i.idempotencyKey]);
    if (prior) return { txnNo: prior.txn_no, replayed: true };
    if (i.fineMg <= 0) throw badRequest("Enter the fine weight being sent.", { fine: "Required" });
    const scrap = await accountBalance(t, A.SCRAP);
    if (i.fineMg > scrap) throw new ApiError(422, "SCRAP_SHORT", `Only ${formatGrams(scrap)} g of scrap and old gold is in the vault.`);
    const tx = await postTxn(t, ctx, { kind: "TO_REFINER", fineMg: i.fineMg, note: i.note?.trim() || "Sent to refiner", idempotencyKey: i.idempotencyKey, from: A.SCRAP, to: A.REFINER });
    await audit(t, ctx, "TO_REFINER", "txn", tx.id, { fineMg: i.fineMg });
    return { txnNo: tx.txnNo, replayed: false };
  });
}

/** Refined gold comes back as fine bullion; anything not returned is recorded as a refining difference for review. */
export async function receiveFromRefiner(ctx: Ctx, i: { returnedMg: Mg; differenceMg?: Mg; note?: string; idempotencyKey: string }) {
  assertRole(ctx, ["FINANCE"]);
  return withTx(async (t) => {
    const prior = await one<Row>(t, "SELECT txn_no FROM txns WHERE idempotency_key = ?", [i.idempotencyKey]);
    if (prior) return { txnNos: [prior.txn_no], replayed: true };
    const diff = i.differenceMg ?? 0;
    if (i.returnedMg <= 0 || diff < 0) throw badRequest("Enter the fine gold returned.", { returned: "Required" });
    const atRefiner = await accountBalance(t, A.REFINER);
    if (i.returnedMg + diff > atRefiner) throw new ApiError(422, "REFINER_SHORT", `Only ${formatGrams(atRefiner)} g is recorded at the refiner.`);
    const txnNos: string[] = [];
    const a = await postTxn(t, ctx, { kind: "FROM_REFINER", fineMg: i.returnedMg, note: i.note?.trim() || "Refined gold received", idempotencyKey: i.idempotencyKey, from: A.REFINER, to: A.VAULT });
    txnNos.push(a.txnNo);
    if (diff > 0) {
      const b = await postTxn(t, ctx, { kind: "LOSS", fineMg: diff, note: "Refining difference, recorded for review", from: A.REFINER, to: A.LOSS });
      txnNos.push(b.txnNo);
    }
    await audit(t, ctx, "FROM_REFINER", "txn", a.id, { returnedMg: i.returnedMg, differenceMg: diff });
    return { txnNos, replayed: false };
  });
}
