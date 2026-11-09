/**
 * Loads realistic, deterministic sample data: staff, karigars, agreed wastage, ~120 days of jobs,
 * old-gold purchases, refiner batches, and today's activity that includes the brief's sample rows
 * (TX-30411, TX-30437, TX-30438 for Murugesan S).
 *
 *   npm run seed          adds the data (stops if the database already has data)
 *   npm run reset         deletes the local database file, then adds the data
 *
 * Every person here is invented. Phone numbers are placeholders (900000xxxx), PAN numbers are random.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { all, one, run, withTx } from "../src/server/db";
import { ensureSchema } from "../src/server/db";
import { hashPassword, setKarigarPin } from "../src/server/auth";
import { addDays, istDate } from "../src/server/clock";
import { newId, setSetting, nextNo, type Ctx } from "../src/server/services/core";
import { addBullion, closeJob, createKarigar, issueGold, receiveGold, setWastage } from "../src/server/services/work";
import { receiveFromRefiner, recordOldGold, sendToRefiner } from "../src/server/services/oldgold";
import { createReading } from "../src/server/services/readings";
import { shutdownOcr } from "../src/server/ocr/printout";
import { assessOldGold, type PaymentMode } from "../src/domain/oldgold";
import { allowedMg, fineMg, formatGrams, parseGrams, parsePercent, parsePurity } from "../src/domain/units";
import { randomUUID } from "node:crypto";

// ───────── config
for (const f of [".env.local", ".env"]) {
  if (existsSync(f)) for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const url = process.env.DATABASE_URL || "file:data/goldledger.db";
if (process.argv.includes("--reset")) {
  if (!url.startsWith("file:")) { console.error("--reset only works with a local file database."); process.exit(1); }
  const p = url.slice(5);
  try {
    for (const s of ["", "-wal", "-shm", "-journal"]) if (existsSync(p + s)) rmSync(p + s);
    console.log("Deleted", p);
  } catch {
    console.log("File is open by active process, will drop tables via SQL during reset...");
  }
}

const STAFF_PASSWORD = "Demo@2026";
const KARIGAR_PIN = "123456";
const HISTORY_DAYS = 120;
const today = istDate();

// ───────── deterministic randomness
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry32(2611);
const between = (a: number, b: number) => a + rnd() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const normal = (mean: number, sd: number) => mean + sd * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const at = (date: string, h: number, m: number) => new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`);
const isSunday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
const nextWorkday = (date: string) => { let d = date; while (isSunday(d)) d = addDays(d, 1); return d; };
const mgRound = (x: number) => Math.max(1, Math.round(x));

// ───────── reference data
const CATEGORIES = [
  { name: "Chain", ta: "சங்கிலி", bp: 120, min: 150, max: 420 },
  { name: "Bangle", ta: "வளையல்", bp: 200, min: 200, max: 480 },
  { name: "Ring", ta: "மோதிரம்", bp: 180, min: 40, max: 120 },
  { name: "Earrings", ta: "காதணி", bp: 250, min: 30, max: 100 },
  { name: "Necklace", ta: "நெக்லஸ்", bp: 300, min: 100, max: 300 },
  { name: "Pendant", ta: "பதக்கம்", bp: 220, min: 40, max: 120 },
  { name: "Temple jewellery", ta: "கோயில் நகை", bp: 400, min: 200, max: 560 },
];
const KARIGARS = [
  { name: "Murugesan S", ta: "முருகேசன் எஸ்", bench: "Bench 1", cats: ["Necklace", "Pendant", "Temple jewellery"], use: 0.55 },
  { name: "Selvam R", ta: "செல்வம் ஆர்", bench: "Bench 1", cats: ["Chain", "Bangle"], use: 0.97 },
  { name: "Palanisamy K", ta: "பழனிசாமி கே", bench: "Bench 2", cats: ["Bangle", "Ring"], use: 0.58 },
  { name: "Ganesan M", ta: "கணேசன் எம்", bench: "Bench 2", cats: ["Chain", "Pendant"], use: 0.52 },
  { name: "Karthikeyan V", ta: "கார்த்திகேயன் வி", bench: "Bench 3", cats: ["Earrings", "Ring"], use: 0.63 },
  { name: "Arumugam P", ta: "அறுமுகம் பி", bench: "Bench 3", cats: ["Temple jewellery", "Necklace"], use: 0.6 },
  { name: "Senthil Kumar T", ta: "செந்தில் குமார் டி", bench: "Bench 4", cats: ["Chain", "Bangle", "Ring"], use: 0.5 },
  { name: "Rajendran N", ta: "ராஜேந்திரன் என்", bench: "Bench 4", cats: ["Necklace", "Earrings"], use: 0.66 },
  { name: "Velusamy B", ta: "வேலுசாமி பி", bench: "Bench 5", cats: ["Bangle", "Pendant"], use: 0.57 },
  { name: "Sathish A", ta: "சதீஷ் ஏ", bench: "Bench 5", cats: ["Ring", "Earrings", "Pendant"], use: 0.61 },
  { name: "Manikandan G", ta: "மணிகண்டன் ஜி", bench: "Bench 6", cats: ["Chain", "Necklace"], use: 0.54 },
  { name: "Dhanapal J", ta: "தனபால் ஜே", bench: "Bench 6", cats: ["Temple jewellery", "Bangle"], use: 0.59 },
  { name: "Kumaravel S", ta: "குமரவேல் எஸ்", bench: "Bench 7", cats: ["Earrings", "Pendant"], use: 0.64 },
  { name: "Prabhu D", ta: "பிரபு டி", bench: "Bench 7", cats: ["Chain", "Ring"], use: 0.56 },
];
const CUSTOMERS = ["Kavitha R", "Suresh Babu", "Anitha M", "Ramya S", "Mohan Raj", "Geetha K", "Vignesh P", "Saranya T", "Balamurugan C", "Deepa N", "Ilango V", "Revathi G"];

// ───────── bookkeeping
const HUIDS = new Set<string>();
const huid = () => { for (;;) { const h = Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[int(0, 31)]).join(""); if (!HUIDS.has(h)) { HUIDS.add(h); return h; } } };
const pan = () => `${Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[int(0, 23)]).join("")}${String(int(1000, 9999))}${"ABCDEFGHJKLMNPQRSTUVWXYZ"[int(0, 23)]}`;
const gramsToText = (mg: number) => formatGrams(mg, { grouping: false });
const purityText = (bp: number) => `${Math.floor(bp / 100)}.${String(bp % 100).padStart(2, "0")}`;
const grossForFine = (fine: number, purityBp: number) => Math.max(1, Math.round((fine * 10000) / purityBp));

async function main() {
  const dbModule = await import("../src/server/db");
  const rawDb = dbModule.db();
  const isLocal = dbModule.dbUrl().startsWith("file:");

  if (isLocal) {
    await rawDb.execute("PRAGMA busy_timeout = 10000");
    await rawDb.execute("PRAGMA journal_mode = WAL");
    await rawDb.execute("PRAGMA synchronous = OFF");
  }

  if (process.argv.includes("--reset")) {
    const tables = await rawDb.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    if (isLocal) await rawDb.execute("PRAGMA foreign_keys = OFF");
    for (const t of tables.rows) {
      await rawDb.execute(`DROP TABLE IF EXISTS "${t.name}"`);
    }
    if (isLocal) await rawDb.execute("PRAGMA foreign_keys = ON");
    console.log("Reset existing database tables.");
  }

  await ensureSchema();
  if ((await one<{ n: number }>(rawDb, "SELECT COUNT(*) AS n FROM karigars"))!.n > 0) {
    console.log("The database already has data. Run `npm run reset` to start again.");
    return;
  }
  console.log(`Seeding up to ${today} ...`);

  // ── staff
  const staff = {
    finance: { id: newId(), name: "Ramesh Krishnan", username: "finance", role: "FINANCE" },
    clerk: { id: newId(), name: "Lakshmi Priya", username: "clerk", role: "CLERK" },
    partner: { id: newId(), name: "Vijayalakshmi Annamalai", username: "partner", role: "PARTNER" },
  };
  const pw = await hashPassword(STAFF_PASSWORD);
  for (const u of Object.values(staff))
    await run((await import("../src/server/db")).db(), "INSERT INTO users(id, name, username, role, password_hash, karigar_id, active, created_at) VALUES (?,?,?,?,?,NULL,1,?)", [u.id, u.name, u.username, u.role, pw, new Date().toISOString()]);
  const ctxAt = (u: { id: string; role: string }, date: string, h = 10, m = 0): Ctx => ({ userId: u.id, role: u.role as Ctx["role"], now: at(date, h, m) });
  const fin = (d: string, h = 9, m = 0) => ctxAt(staff.finance, d, h, m);
  const clk = (d: string, h = 10, m = 0) => ctxAt(staff.clerk, d, h, m);

  // ── settings, categories
  const c = (await import("../src/server/db")).db();
  await withTx(async (t) => {
    await setSetting(t, "company_name", "Company A");
    await setSetting(t, "gold_rate_paise", "1250000");
    for (const k of CATEGORIES) await run(t, "INSERT INTO categories(id, name, name_ta, default_wastage_bp) VALUES (?,?,?,?)", [newId(), k.name, k.ta, k.bp]);
  });
  const cats = Object.fromEntries((await all<{ id: string; name: string }>(c, "SELECT id, name FROM categories")).map((x) => [x.name, x.id]));

  // ── karigars with agreed wastage per category (their own specialties differ a little from the default)
  const kar: { id: string; name: string; cats: string[]; use: number; idx: number; wastage: Record<string, number> }[] = [];
  for (const [idx, k] of KARIGARS.entries()) {
    const r = await createKarigar(fin(addDays(today, -HISTORY_DAYS - 1)), { name: k.name, nameTa: k.ta, phone: `900000${String(idx + 1).padStart(4, "0")}`, bench: k.bench });
    const wastage: Record<string, number> = {};
    for (const cn of k.cats) {
      const def = CATEGORIES.find((x) => x.name === cn)!.bp;
      const bp = k.name === "Murugesan S" && cn === "Necklace" ? 300 : Math.max(50, def + pick([-30, -20, 0, 0, 20, 30]));
      wastage[cn] = bp;
      await setWastage(fin(addDays(today, -HISTORY_DAYS - 1)), r.id, cats[cn], bp);
    }
    kar.push({ id: r.id, name: k.name, cats: k.cats, use: k.use, idx, wastage });
    await setKarigarPin(fin(addDays(today, -HISTORY_DAYS - 1)), r.id, KARIGAR_PIN);
  }
  const murugesan = kar[0], selvam = kar[1], arumugam = kar[5];

  // ── plan the history
  type Plan = { k: typeof kar[number]; issueOn: string; closeOn: string; cat: string; grossMg: number; purityBp: number; use: number; extraMg: number; keepOpen: boolean };
  const plans: Plan[] = [];
  const start = addDays(today, -HISTORY_DAYS);
  for (const k of kar) {
    const step = k === murugesan ? 6 : int(5, 8);
    const anchor = k === murugesan ? addDays(today, -4) : addDays(today, -int(3, 9));
    const issueDays: string[] = [];
    for (let d = anchor; d >= start; d = addDays(d, -(step + (k === murugesan ? 0 : int(-1, 1))))) issueDays.unshift(nextWorkday(d));
    issueDays.forEach((issueOn, i) => {
      const cat = k === murugesan && i >= issueDays.length - 3 ? "Necklace" : pick(k.cats);
      const def = CATEGORIES.find((x) => x.name === cat)!;
      const grossMg = Math.round(between(def.min, def.max) * 100) * 10;
      const purityBp = rnd() < 0.8 ? 9160 : rnd() < 0.75 ? 7500 : 5850;
      let use = Math.max(0.15, normal(k.use, k === selvam ? 0.05 : 0.09)), extraMg = 0;
      const fromEnd = issueDays.length - 1 - i;
      if (k === murugesan && fromEnd < 3) use = [1.22, 1.05, 0.92][fromEnd];   // the rising pattern the alert should catch
      if (k === arumugam && fromEnd === 1) { use = 1; extraMg = 320; }          // one job 0.320 g beyond the allowance
      plans.push({ k, issueOn, closeOn: nextWorkday(addDays(issueOn, int(2, 4))), cat, grossMg, purityBp, use, extraMg, keepOpen: false });
    });
  }
  // a few karigars hold a job that is still open today
  for (const k of [kar[6], kar[7], kar[8], kar[9], kar[10], kar[11]]) {
    const cat = pick(k.cats), def = CATEGORIES.find((x) => x.name === cat)!;
    plans.push({ k, issueOn: nextWorkday(addDays(today, -2)), closeOn: addDays(today, 3), cat, grossMg: Math.round(between(def.min, def.max) * 100) * 10, purityBp: 9160, use: 0.6, extraMg: 0, keepOpen: true });
  }
  plans.sort((a, b) => a.issueOn.localeCompare(b.issueOn));

  // ── run history day by day
  const jobIds = new Map<Plan, string>();
  const refinerSends: { on: string; fine: number; back: string }[] = [];
  let lastSend = addDays(start, 14);
  const ogDates = Array.from({ length: 26 }, () => nextWorkday(addDays(start, int(5, HISTORY_DAYS - 1)))).sort();
  let ogN = 0;

  await addBullion(fin(start), { fineMg: 40_000_000, note: "Opening stock in the vault", idempotencyKey: randomUUID() });

  let dayCount = 0;
  for (let day = start; day < today; day = addDays(day, 1)) {
    if (isSunday(day)) continue;
    dayCount++;
    if (dayCount % 20 === 0) console.log(`  Seeding day: ${day} ...`);
    // supplier bullion when the vault runs low
    const vaultNow = (await one<{ v: number }>(c, "SELECT COALESCE(SUM(fine_mg),0) AS v FROM ledger_lines WHERE account='VAULT'"))!.v;
    if (vaultNow < 6_000_000) await addBullion(fin(day, 9, 30), { fineMg: 12_000_000, note: "Bullion received from supplier", idempotencyKey: randomUUID() });

    // closures first
    for (const p of plans.filter((x) => !x.keepOpen && x.closeOn === day && jobIds.has(x))) {
      const jobId = jobIds.get(p)!;
      const F = fineMg(p.grossMg, p.purityBp);
      const allowed = allowedMg(F, p.k.wastage[p.cat]);
      const waste = Math.min(F - 500, Math.max(60, Math.round(allowed * p.use) + p.extraMg));
      const scrap = Math.round(F * 0.012), filings = Math.round(F * 0.004);
      const piecesFine = F - waste - scrap - filings;
      const n = int(1, 3), w = Array.from({ length: n }, () => between(0.6, 1.4)), ws = w.reduce((a, b) => a + b, 0);
      const lines = w.map((x) => {
        const gross = grossForFine(Math.round((piecesFine * x) / ws), p.purityBp);
        return { subtype: "PIECE" as const, gross: gramsToText(gross), purity: purityText(p.purityBp), huid: huid(), itemDesc: p.cat };
      });
      lines.push({ subtype: "SCRAP" as never, gross: gramsToText(grossForFine(scrap, p.purityBp)), purity: purityText(p.purityBp), huid: "", itemDesc: "Scrap" });
      lines.push({ subtype: "FILINGS" as never, gross: gramsToText(grossForFine(filings, p.purityBp)), purity: purityText(p.purityBp), huid: "", itemDesc: "Filings" });
      await receiveGold(clk(day, 16, int(0, 40)), {
        jobId, closeJob: true, idempotencyKey: randomUUID(),
        lines: lines.map((l) => ({ subtype: l.subtype, grossMg: parseGrams(l.gross), purityBp: parsePurity(l.purity), huid: l.huid || null, itemDesc: l.itemDesc })),
      });
    }
    // issues
    for (const p of plans.filter((x) => x.issueOn === day)) {
      const r = await issueGold(clk(day, int(10, 12), int(0, 55)), {
        karigarId: p.k.id, categoryId: cats[p.cat], grossMg: p.grossMg, purityBp: p.purityBp, description: p.cat, idempotencyKey: randomUUID(),
      });
      jobIds.set(p, r.jobId);
    }
    // old gold across the counter
    while (ogN < ogDates.length && ogDates[ogN] === day) {
      const gross = Math.round(between(5, 80) * 100) * 10, ded = Math.round(gross * between(0, 0.05) / 10) * 10;
      const purityBp = pick([9162, 8745, 7610, 9160, 5900]);
      let mode = pick<PaymentMode>(["CASH", "UPI", "BANK_TRANSFER", "ADJUSTED_IN_BILL", "ADJUSTED_IN_BILL"]);
      const a = assessOldGold({ grossMg: gross, deductionMg: ded, purityBp, ratePaisePerGram: 1250000, paymentMode: mode, rules: { panThresholdPaise: 20000000, cashLimitPaise: 20000000 } });
      if (a.errors.some((e) => e.field === "paymentMode")) mode = "UPI";
      await recordOldGold(clk(day, 14, int(0, 50)), {
        billNo: `EX-${day.slice(2, 4)}${day.slice(5, 7)}-${String(100 + ogN * 7).padStart(4, "0")}`, customerName: pick(CUSTOMERS), customerPhone: `900001${String(ogN).padStart(4, "0")}`,
        grossMg: gross, deductionMg: ded, purityBp, paymentMode: mode, pan: a.panRequired ? pan() : null, idempotencyKey: randomUUID(),
      });
      ogN++;
    }
    // refiner batches every three weeks: send most of the scrap, receive it back ten days later
    if (day >= addDays(lastSend, 21) && addDays(day, 0) <= addDays(today, -6)) {
      const scrap = (await one<{ v: number }>(c, "SELECT COALESCE(SUM(fine_mg),0) AS v FROM ledger_lines WHERE account='SCRAP'"))!.v;
      const send = Math.floor((scrap * 0.92) / 1000) * 1000;
      if (send > 0) { await sendToRefiner(fin(day, 11), { fineMg: send, note: "Batch for refining", idempotencyKey: randomUUID() }); refinerSends.push({ on: day, fine: send, back: addDays(day, 10) }); lastSend = day; }
    }
    for (const s of refinerSends.filter((x) => x.back === day)) {
      const diff = Math.round(s.fine * 0.0008);
      await receiveFromRefiner(fin(day, 15), { returnedMg: s.fine - diff - 0, differenceMg: diff, note: "Refined gold received", idempotencyKey: randomUUID() });
    }
  }

  // one more batch sent a few days ago and still at the refiner
  {
    const scrap = (await one<{ v: number }>(c, "SELECT COALESCE(SUM(fine_mg),0) AS v FROM ledger_lines WHERE account='SCRAP'"))!.v;
    const send = Math.floor((scrap * 0.85) / 1000) * 1000;
    if (send > 0) await sendToRefiner(fin(addDays(today, -3), 11), { fineMg: send, note: "Batch for refining", idempotencyKey: randomUUID() });
  }

  // ── today: the brief's sample rows, with the numbering exactly as given
  console.log("Posting today's sample rows ...");
  const photo = (n: string) => readFileSync(`public/samples/${n}.jpg`);
  // Number the history so it ends at TX-30410, like a ledger that has been running for a while.
  // Today then continues at TX-30411, exactly as in the brief's sample rows.
  await withTx(async (t) => {
    const rows = await all<{ id: string }>(t, "SELECT id FROM txns ORDER BY created_at, rowid");
    await run(t, "UPDATE txns SET txn_no = 'TMP-' || id");
    const first = 30410 - rows.length + 1;
    for (const [i, r] of rows.entries()) await run(t, "UPDATE txns SET txn_no = ? WHERE id = ?", [`TX-${first + i}`, r.id]);
    await run(t, "INSERT INTO sequences(name, value) VALUES('txn', 30410) ON CONFLICT(name) DO UPDATE SET value = 30410");
    console.log(`History: ${rows.length} transactions, TX-${first} to TX-30410`);
  });

  const wr = await createReading(clk(today, 9, 40), "WEIGHT", photo("scale-120-000"));
  const first = await issueGold(clk(today, 9, 42), {
    karigarId: murugesan.id, categoryId: cats["Necklace"], grossMg: parseGrams("120.000"), purityBp: parsePurity("91.60"), description: "Necklace, temple set",
    weightReading: { id: wr.id }, idempotencyKey: randomUUID(),
  });
  if (first.txnNo !== "TX-30411") throw new Error(`Expected TX-30411, got ${first.txnNo}`);

  // 25 single-entry transactions from the rest of the workshop, so the next sample row is TX-30437
  const openToday = await all<{ id: string; karigar_id: string }>(c, "SELECT j.id, j.karigar_id FROM jobs j WHERE j.status='OPEN' AND j.karigar_id <> ?", [murugesan.id]);
  let made = 0;
  for (const j of openToday.slice(0, 6)) {
    const jv = await one<{ issued: number }>(c, "SELECT COALESCE(SUM(fine_mg),0) AS issued FROM txns WHERE job_id = ? AND kind='ISSUE'", [j.id]);
    const fine = Math.round(jv!.issued * 0.55);
    await receiveGold(clk(today, 11, int(0, 50)), {
      jobId: j.id, idempotencyKey: randomUUID(),
      lines: [{ subtype: "PIECE", grossMg: grossForFine(fine, 9160), purityBp: 9160, huid: huid(), itemDesc: "First piece" }],
    });
    made++;
  }
  const todayKar = kar.filter((k) => k !== murugesan && !openToday.some((j) => j.karigar_id === k.id)).concat(kar.filter((k) => openToday.some((j) => j.karigar_id === k.id)));
  let ki = 0;
  while (made < 25) {
    const k = todayKar[ki++ % todayKar.length];
    const cat = pick(k.cats), def = CATEGORIES.find((x) => x.name === cat)!;
    await issueGold(clk(today, int(10, 15), int(0, 55)), {
      karigarId: k.id, categoryId: cats[cat], grossMg: Math.round(between(def.min, def.max) * 100) * 10, purityBp: 9160, description: cat, idempotencyKey: randomUUID(),
    });
    made++;
  }

  const wr2 = await createReading(clk(today, 15, 5), "WEIGHT", photo("scale-112-450"));
  const necklace = await receiveGold(clk(today, 15, 10), {
    jobId: first.jobId, idempotencyKey: randomUUID(),
    lines: [{ subtype: "PIECE", grossMg: parseGrams("112.450"), purityBp: parsePurity("91.60"), huid: huid(), itemDesc: "Necklace", weightReading: { id: wr2.id } }],
  });
  const wr3 = await createReading(clk(today, 15, 20), "WEIGHT", photo("scale-3-300"));
  const scrap = await receiveGold(clk(today, 15, 24), {
    jobId: first.jobId, idempotencyKey: randomUUID(),
    lines: [{ subtype: "SCRAP", grossMg: parseGrams("3.300"), purityBp: parsePurity("91.60"), itemDesc: "Scrap", weightReading: { id: wr3.id } }],
  });
  if (necklace.txnNos[0] !== "TX-30437" || scrap.txnNos[0] !== "TX-30438") throw new Error(`Sample numbering off: ${necklace.txnNos[0]}, ${scrap.txnNos[0]}`);

  // one old-gold purchase today, with both photos and a PAN (the value is above the threshold)
  const ow = await createReading(clk(today, 16, 0), "WEIGHT", photo("scale-24-870"));
  const op = await createReading(clk(today, 16, 1), "PURITY", photo("karat-916"));
  await recordOldGold(clk(today, 16, 5), {
    billNo: `EX-${today.slice(2, 4)}${today.slice(5, 7)}-0801`, customerName: "Kavitha R", customerPhone: "9000019999", grossMg: parseGrams("24.870"), deductionMg: parseGrams("0.350"),
    purityBp: parsePurity("91.62"), paymentMode: "UPI", pan: "ABCPK1234L", weightReading: { id: ow.id }, purityReading: { id: op.id }, idempotencyKey: randomUUID(),
  });

  // ── checks
  if (isLocal) {
    await rawDb.execute("PRAGMA synchronous = NORMAL");
  }
  const sum = await one<{ s: number }>(c, "SELECT COALESCE(SUM(fine_mg),0) AS s FROM ledger_lines");
  if (sum!.s !== 0) throw new Error(`Ledger does not balance: ${sum!.s}`);
  const counts = await one<Record<string, number>>(c, `SELECT (SELECT COUNT(*) FROM karigars) AS karigars, (SELECT COUNT(*) FROM jobs) AS jobs, (SELECT COUNT(*) FROM jobs WHERE status='OPEN') AS open_jobs,
      (SELECT COUNT(*) FROM txns) AS txns, (SELECT COUNT(*) FROM old_gold) AS old_gold, (SELECT COUNT(*) FROM alerts WHERE status='OPEN') AS open_alerts`);
  console.log("Done:", counts);
  const bal = await one<{ v: number }>(c, "SELECT COALESCE(SUM(fine_mg),0) AS v FROM ledger_lines WHERE account = ?", [`KARIGAR:${murugesan.id}`]);
  console.log(`Murugesan S fine balance today: ${formatGrams(bal!.v)} g (expected 3.893)`);
  console.log(`\nSign in (staff password ${STAFF_PASSWORD}):  clerk / finance / partner     Karigar: phone 9000000001, PIN ${KARIGAR_PIN}`);
  await shutdownOcr();
}

main().then(() => process.exit(0)).catch((e) => { console.log("FATAL ERROR IN MAIN:", e); console.error(e); process.exit(1); });
