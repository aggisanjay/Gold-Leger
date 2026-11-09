import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { all, closeDb, db, one, resetDbForTests, run, withTx } from "../src/server/db";
import { hashPassword } from "../src/server/auth";
import { newId, setSetting, type Ctx } from "../src/server/services/core";
import { addBullion, closeJob, createKarigar, issueGold, receiveGold, reverseTxn, setWastage } from "../src/server/services/work";
import { recordOldGold, receiveFromRefiner, sendToRefiner, voidOldGold } from "../src/server/services/oldgold";
import { createReading } from "../src/server/services/readings";
import { karigarLedger, statementFor, karigarDetail, listKarigars, movementsFor } from "../src/server/services/queries";
import { listAlerts, resolveAlert } from "../src/server/services/alerts";
import { shutdownOcr } from "../src/server/ocr/printout";
import { parseGrams, parsePurity } from "../src/domain/units";
import { ApiError } from "../src/server/errors";

const DB = `/tmp/gl-flows-${process.pid}.db`;
const fin: Ctx = { userId: "u-fin", role: "FINANCE", now: new Date("2026-11-05T09:00:00+05:30") };
const clerk: Ctx = { userId: "u-clerk", role: "CLERK", now: new Date("2026-11-05T10:00:00+05:30") };
const partner: Ctx = { userId: "u-partner", role: "PARTNER", now: new Date("2026-11-05T10:00:00+05:30") };
const at = (d: string, h = 10): Ctx => ({ ...clerk, now: new Date(`${d}T${String(h).padStart(2, "0")}:00:00+05:30`) });
const G = parseGrams, P = parsePurity;
let k1 = "", necklace = "", chain = "";

async function expectApi(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}
const sumAll = async () => Number((await one<{ s: number }>(db(), "SELECT COALESCE(SUM(fine_mg),0) AS s FROM ledger_lines"))!.s);

beforeAll(async () => {
  resetDbForTests(`file:${DB}`);
  await withTx(async (t) => {
    necklace = newId(); chain = newId();
    await run(t, "INSERT INTO categories(id,name,default_wastage_bp) VALUES (?,?,300)", [necklace, "Necklace"]);
    await run(t, "INSERT INTO categories(id,name,default_wastage_bp) VALUES (?,?,120)", [chain, "Chain"]);
    for (const u of ["u-fin", "u-clerk", "u-partner"]) await run(t, "INSERT INTO users(id,name,username,role,password_hash,active,created_at) VALUES (?,?,?,?,?,1,?)", [u, u, u, "CLERK", "x", "2026-01-01"]);
    await setSetting(t, "gold_rate_paise", "1250000");
  });
  k1 = (await createKarigar(fin, { name: "Murugesan S", phone: "9000000001" })).id;
  await addBullion(fin, { fineMg: G("5000.000"), idempotencyKey: randomUUID() });
});
afterAll(async () => {
  await shutdownOcr();
  closeDb();
  for (const s of ["", "-wal", "-shm"]) {
    try { rmSync(DB + s, { force: true }); } catch {}
  }
});

describe("the brief's worked example, end to end", () => {
  let jobId = "";
  it("issue 120.000 g at 91.60% gives a 109.920 g fine balance and a slip", async () => {
    const r = await issueGold(clerk, { karigarId: k1, categoryId: necklace, grossMg: G("120.000"), purityBp: P("91.60"), idempotencyKey: randomUUID() });
    jobId = r.jobId;
    expect(r.fineMg).toBe(109920);
    expect(r.karigarBalanceMg).toBe(109920);
    expect(r.slipNo).toMatch(/^SL-\d+$/);
    expect(r.job.wastageBp).toBe(300);
  });
  it("receipts show allowed against actual wastage as they are entered", async () => {
    await receiveGold(clerk, { jobId, idempotencyKey: randomUUID(), lines: [{ subtype: "PIECE", grossMg: G("112.450"), purityBp: P("91.60"), huid: "A1B2C3" }] });
    const r = await receiveGold(clerk, { jobId, idempotencyKey: randomUUID(), lines: [{ subtype: "SCRAP", grossMg: G("3.300"), purityBp: P("91.60") }] });
    expect(r.karigarBalanceMg).toBe(3893);
    expect(r.job.position).toMatchObject({ balanceMg: 3893, allowedMg: 3298, overAllowanceMg: 595 });
  });
  it("closing clears the karigar's balance: allowance first, the rest is flagged", async () => {
    const r = await closeJob(clerk, jobId);
    expect(r.closed).toEqual({ allowanceMg: 3298, lossMg: 595 });
    const l = await karigarLedger(db(), k1, "2026-11-05");
    expect(l.balanceMg).toBe(0);
    expect((await listAlerts(db(), fin)).some((a) => a.kind === "JOB_EXCESS")).toBe(true);
  });
  it("the whole ledger still sums to exactly zero", async () => { expect(await sumAll()).toBe(0); });
});

describe("exactness and the vault", () => {
  it("every gram is somewhere: on hand plus written off equals everything that came in", async () => {
    const s = await statementFor(db(), fin, "2026-11-05");
    expect(s.writtenOff).toEqual({ allowanceMg: 3298, lossMg: 595 });
    expect(s.totalClosingMg + s.writtenOff.allowanceMg + s.writtenOff.lossMg).toBe(G("5000.000"));
    expect(s.sections[0].rows[1].closingMg).toBe(103004); // finished jewellery
  });
  it("cannot issue more fine gold than the vault holds, and a refused issue changes nothing", async () => {
    // 5,000 g gross at 91.60% is 4,580 g fine. The vault holds about 4,890 g, so the first is fine...
    const big = await issueGold(clerk, { karigarId: k1, categoryId: chain, grossMg: G("5000.000"), purityBp: P("91.60"), idempotencyKey: randomUUID() });
    const txnsBefore = Number((await one<{ n: number }>(db(), "SELECT COUNT(*) AS n FROM txns"))!.n);
    const jobsBefore = Number((await one<{ n: number }>(db(), "SELECT COUNT(*) AS n FROM jobs"))!.n);
    // ...and the second would take the vault below zero
    await expectApi(issueGold(clerk, { karigarId: k1, categoryId: chain, grossMg: G("5000.000"), purityBp: P("91.60"), idempotencyKey: randomUUID() }), "VAULT_SHORT");
    expect(Number((await one<{ n: number }>(db(), "SELECT COUNT(*) AS n FROM txns"))!.n)).toBe(txnsBefore);
    expect(Number((await one<{ n: number }>(db(), "SELECT COUNT(*) AS n FROM jobs"))!.n)).toBe(jobsBefore); // the job opened inside the failed transaction was rolled back
    expect(await sumAll()).toBe(0);
    const tx = await one<{ id: string }>(db(), "SELECT id FROM txns WHERE txn_no = ?", [big.txnNo]);
    await reverseTxn(fin, tx!.id, "Test issue taken back"); // give the gold back to the vault for the tests that follow
  });
});

describe("safe to retry: tablets lose network and power", () => {
  it("the same idempotency key never posts twice", async () => {
    const key = randomUUID();
    const a = await issueGold(clerk, { karigarId: k1, categoryId: chain, grossMg: G("50.000"), purityBp: P("91.60"), idempotencyKey: key });
    const b = await issueGold(clerk, { karigarId: k1, categoryId: chain, grossMg: G("50.000"), purityBp: P("91.60"), idempotencyKey: key });
    expect(b.replayed).toBe(true);
    expect(b.txnNo).toBe(a.txnNo);
    expect(b.karigarBalanceMg).toBe(a.karigarBalanceMg);
  });
});

describe("receipt rules", () => {
  let job = "";
  beforeAll(async () => { job = (await issueGold(at("2026-11-06"), { karigarId: k1, categoryId: chain, grossMg: G("100.000"), purityBp: P("91.60"), idempotencyKey: randomUUID() })).jobId; });
  it("a finished piece needs a valid, unique HUID", async () => {
    await expectApi(receiveGold(clerk, { jobId: job, idempotencyKey: randomUUID(), lines: [{ subtype: "PIECE", grossMg: G("10.000"), purityBp: P("91.60"), huid: "bad" }] }), "INVALID");
    await expectApi(receiveGold(clerk, { jobId: job, idempotencyKey: randomUUID(), lines: [{ subtype: "PIECE", grossMg: G("10.000"), purityBp: P("91.60"), huid: "A1B2C3" }] }), "HUID_DUPLICATE");
  });
  it("cannot return more fine gold than was issued", async () => {
    await expectApi(receiveGold(clerk, { jobId: job, idempotencyKey: randomUUID(), lines: [{ subtype: "PIECE", grossMg: G("200.000"), purityBp: P("91.60"), huid: "Z9Y8X7" }] }), "OVER_RETURN");
  });
  it("closing a job that has nothing back flags the whole shortfall beyond allowance", async () => {
    const r = await closeJob(clerk, job);
    expect(r.closed.allowanceMg).toBe(1099); // 1.20% of 91.600 g
    expect(r.closed.lossMg).toBe(91600 - 1099);
  });
  it("a closed job cannot take more receipts", async () => {
    await expectApi(receiveGold(clerk, { jobId: job, idempotencyKey: randomUUID(), lines: [{ subtype: "SCRAP", grossMg: G("1.000"), purityBp: P("91.60") }] }), "JOB_CLOSED");
  });
});

describe("corrections are reversals, never edits", () => {
  it("finance can reverse a mistaken issue on an open job; the ledger keeps both lines", async () => {
    const balance = async () => Number((await one<{ b: number }>(db(), "SELECT COALESCE(SUM(fine_mg),0) AS b FROM ledger_lines WHERE account = ?", [`KARIGAR:${k1}`]))!.b);
    const start = await balance();
    const r = await issueGold(at("2026-11-07"), { karigarId: k1, categoryId: chain, grossMg: G("20.000"), purityBp: P("91.60"), idempotencyKey: randomUUID() });
    expect(await balance()).toBe(start + 18320);
    const tx = await one<{ id: string }>(db(), "SELECT id FROM txns WHERE txn_no = ?", [r.txnNo]);
    await expectApi(reverseTxn(clerk, tx!.id, "typed wrong weight"), "FORBIDDEN");
    await reverseTxn(fin, tx!.id, "Typed the wrong weight");
    expect(await balance()).toBe(start);
    await expectApi(reverseTxn(fin, tx!.id, "again please"), "ALREADY_REVERSED");
    expect(await sumAll()).toBe(0);
  });
});

describe("access control by role", () => {
  it("partners cannot post, clerks cannot see stock or alerts, karigars cannot post", async () => {
    await expectApi(issueGold(partner, { karigarId: k1, categoryId: chain, grossMg: 1000, purityBp: 9160, idempotencyKey: randomUUID() }), "FORBIDDEN");
    await expect(statementFor(db(), clerk, "2026-11-05")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listAlerts(db(), clerk)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createKarigar(clerk, { name: "X Y" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(setWastage(clerk, k1, chain, 100)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const kar: Ctx = { userId: "k", role: "KARIGAR", now: new Date(), karigarId: k1 };
    await expect(listKarigars(db(), kar)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("clerks do not see drift levels, finance does", async () => {
    expect((await listKarigars(db(), clerk))[0].driftLevel).toBeNull();
    expect((await listKarigars(db(), fin))[0].driftLevel).not.toBeNull();
  });
  it("alerts can be reviewed by finance, with a note required to explain or dismiss", async () => {
    const a = (await listAlerts(db(), fin))[0];
    await expect(withTx((t) => resolveAlert(fin, t, a.id, "DISMISSED", ""))).rejects.toMatchObject({ code: "NOTE_REQUIRED" });
    await withTx((t) => resolveAlert(partner, t, a.id, "EXPLAINED", "Casting defect confirmed with the bench"));
    expect((await listAlerts(db(), fin, "OPEN")).find((x) => x.id === a.id)).toBeUndefined();
  });
});

describe("old gold desk", () => {
  const base = { customerName: "Kavitha R", gross: 0, grossMg: G("24.870"), deductionMg: G("0.350"), purityBp: P("91.62"), paymentMode: "UPI" as const };
  it("records once per bill, with PAN above the threshold", async () => {
    await expectApi(recordOldGold(clerk, { ...base, billNo: "EX-2611-0001", pan: "", idempotencyKey: randomUUID() }), "OLD_GOLD_RULE");
    const r = await recordOldGold(clerk, { ...base, billNo: "ex-2611-0001", pan: "ABCPK1234L", idempotencyKey: randomUUID() });
    expect(r.fineMg).toBe(22465);
    expect(r.valuePaise).toBe(28_081_250); // 22.465 g x Rs 12,500 = Rs 2,80,812.50
    expect(r.billNo).toBe("EX-2611-0001");
    await expectApi(recordOldGold(clerk, { ...base, billNo: "EX-2611-0001", pan: "ABCPK1234L", idempotencyKey: randomUUID() }), "BILL_ALREADY_RECORDED");
  });
  it("cash at or above the limit is refused", async () => {
    await expectApi(recordOldGold(clerk, { ...base, billNo: "EX-2611-0002", paymentMode: "CASH", pan: "ABCPK1234L", idempotencyKey: randomUUID() }), "OLD_GOLD_RULE");
  });
  it("finance can void it (freeing the bill) and the gold leaves scrap stock again", async () => {
    const rec = await one<{ id: string }>(db(), "SELECT id FROM old_gold WHERE bill_no = 'EX-2611-0001'");
    await voidOldGold(fin, rec!.id, "Entered against the wrong bill");
    await recordOldGold(clerk, { ...base, billNo: "EX-2611-0001", pan: "ABCPK1234L", idempotencyKey: randomUUID() });
    expect(await sumAll()).toBe(0);
  });
  it("scrap and old gold go to the refiner and come back as fine gold, any difference flagged", async () => {
    const before = (await statementFor(db(), fin, "2026-11-08")).sections[0].rows[2].closingMg;
    await sendToRefiner(fin, { fineMg: before, idempotencyKey: randomUUID() });
    await expectApi(receiveFromRefiner(fin, { returnedMg: before + 1, idempotencyKey: randomUUID() }), "REFINER_SHORT");
    await receiveFromRefiner(fin, { returnedMg: before - 20, differenceMg: 20, idempotencyKey: randomUUID() });
    const s = await statementFor(db(), fin, "2026-11-08");
    expect(s.sections[2].closingMg).toBe(0);
    expect(s.writtenOff.lossMg).toBe(595 + 91600 - 1099 + 20);
    expect(await sumAll()).toBe(0);
  });
});

describe("photo readings: the AI part, including when it is wrong", () => {
  const photo = (n: string) => readFileSync(`public/samples/${n}.jpg`);
  let job = "";
  beforeAll(async () => { job = (await issueGold(at("2026-11-09"), { karigarId: k1, categoryId: chain, grossMg: G("30.000"), purityBp: P("91.60"), idempotencyKey: randomUUID() })).jobId; });

  it("reads a scale photo with the built-in reader and no API key", async () => {
    const r = await createReading(clerk, "WEIGHT", photo("scale-112-450"));
    expect(r).toMatchObject({ status: "READ", value: 112450 });
    expect(r.confidence).toBeGreaterThan(0.85);
  });
  it("a typed weight that differs from a clear photo reading blocks saving", async () => {
    const r = await createReading(clerk, "WEIGHT", photo("scale-24-870"));
    expect(r.value).toBe(24870);
    await expectApi(receiveGold(clerk, { jobId: job, idempotencyKey: randomUUID(), lines: [{ subtype: "SCRAP", grossMg: G("24.780"), purityBp: P("91.60"), weightReading: { id: r.id, confirmed: true } }] }), "READING_MISMATCH");
  });
  it("a matching reading saves, and records that the photo matched", async () => {
    const r = await createReading(clerk, "WEIGHT", photo("scale-3-300"));
    await receiveGold(clerk, { jobId: job, idempotencyKey: randomUUID(), lines: [{ subtype: "SCRAP", grossMg: G("3.300"), purityBp: P("91.60"), weightReading: { id: r.id } }] });
    const row = await one<{ verification: string }>(db(), "SELECT verification FROM txns WHERE weight_reading_id = ?", [r.id]);
    expect(row!.verification).toBe("weight:MATCH;purity:NO_PHOTO");
  });
  it("one photo cannot back two entries", async () => {
    await expectApi(createReading(clerk, "WEIGHT", photo("scale-3-300")), "READING_REUSED");
  });
  it("a badly glared photo is unreadable, and the clerk must confirm by eye", async () => {
    const r = await createReading(clerk, "WEIGHT", photo("scale-glare-unreadable"));
    expect(r.status).not.toBe("READ");
    const line = { subtype: "SCRAP" as const, grossMg: G("2.000"), purityBp: P("91.60") };
    await expectApi(receiveGold(clerk, { jobId: job, idempotencyKey: randomUUID(), lines: [{ ...line, weightReading: { id: r.id } }] }), "READING_NEEDS_CONFIRMATION");
    const ok = await receiveGold(clerk, { jobId: job, idempotencyKey: randomUUID(), lines: [{ ...line, weightReading: { id: r.id, confirmed: true } }] });
    expect(ok.txnNos).toHaveLength(1);
    const row = await one<{ verification: string }>(db(), "SELECT verification FROM txns WHERE weight_reading_id = ?", [r.id]);
    expect(row!.verification).toBe("weight:MANUAL;purity:NO_PHOTO");
  });
  it("reads the purity off a karat-meter printout", async () => {
    const r = await createReading(clerk, "PURITY", photo("karat-916"));
    expect(r).toMatchObject({ status: "READ", value: 9162 });
  });
  it("rejects files that are not photos", async () => {
    await expectApi(createReading(clerk, "WEIGHT", Buffer.from("not an image at all")), "BAD_PHOTO");
  });
});

describe("daily stock statement for any day, and Tally export", () => {
  it("shows what the karigar held at the end of an earlier day", async () => {
    const d = await karigarDetail(db(), fin, k1, "2026-11-05");
    expect(d.asOf).toBe("2026-11-05");
    expect(d.ledger.entries.length).toBeGreaterThan(3);
  });
  it("exports every movement of the day with voucher numbers", async () => {
    const m = await movementsFor(db(), fin, "2026-11-05");
    expect(m.length).toBeGreaterThan(3);
    expect(m.find((x) => x.to.startsWith("Karigar - Murugesan"))).toBeDefined();
    expect(m.reduce((a, x) => a + x.fineMg, 0)).toBeGreaterThan(0);
  });
});
