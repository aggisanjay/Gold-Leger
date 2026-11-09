import { describe, expect, it } from "vitest";
import { parsePercent, allowedMg, fineMg, formatGrams, formatRupees, parseGrams, parsePurity, roundDiv, valuePaise } from "../src/domain/units";
import { jobPosition, settleJob, SettlementError } from "../src/domain/settlement";
import { detectDrift, type JobOutcome } from "../src/domain/drift";
import { assessOldGold } from "../src/domain/oldgold";
import { compareReading, purityFromText, weightFromText } from "../src/domain/reading";
import { buildStatement } from "../src/domain/stock";
import { movementsCsv, movementsTallyXml } from "../src/domain/tally";
import { isHuid, isPan } from "../src/domain/validators";

describe("exact gold arithmetic (the brief's sample rows)", () => {
  it("TX-30411: issue 120.000 g at 91.60% is 109.920 g fine", () => {
    expect(fineMg(parseGrams("120.000"), parsePurity("91.60"))).toBe(109920);
  });
  it("TX-30437: necklace 112.450 g at 91.60% is 103.004 g fine, balance 6.916", () => {
    const fine = fineMg(parseGrams("112.450"), parsePurity("91.60"));
    expect(formatGrams(fine)).toBe("103.004");
    expect(formatGrams(109920 - fine)).toBe("6.916");
  });
  it("TX-30438: scrap 3.300 g at 91.60% is 3.023 g fine, balance 3.893", () => {
    const scrap = fineMg(parseGrams("3.300"), parsePurity("91.60"));
    expect(formatGrams(scrap)).toBe("3.023");
    expect(formatGrams(109920 - 103004 - scrap)).toBe("3.893");
  });
  it("allowed wastage of 3.00% on 109.920 g is 3.298 g", () => {
    expect(formatGrams(allowedMg(109920, parsePurity("3.00")))).toBe("3.298");
  });
  it("rounds half up to the milligram and never drifts", () => {
    expect(roundDiv(5, 10)).toBe(1);
    expect(roundDiv(4, 10)).toBe(0);
    expect(roundDiv(-5, 10)).toBe(-1);
    // 0.001 g at 50% is 0.0005 g: half up gives 0.001
    expect(fineMg(1, 5000)).toBe(1);
  });
  it("rejects more than 3 decimals, negatives and junk", () => {
    expect(() => parseGrams("1.2345")).toThrow();
    expect(() => parseGrams("-1.000")).toThrow();
    expect(() => parseGrams("1e3")).toThrow();
    expect(() => parseGrams("")).toThrow();
    expect(() => parsePurity("100.01")).toThrow();
    expect(() => parsePurity("91.605")).toThrow();
  });
  it("formats with a real minus sign and Indian grouping", () => {
    expect(formatGrams(-3893)).toBe("\u22123.893");
    expect(formatGrams(20_000_000)).toBe("20,000.000");
    expect(formatGrams(123_456_789)).toBe("1,23,456.789");
    expect(formatRupees(12_500_00)).toBe("\u20B912,500.00");
  });
  it("values fine gold at a rate per gram", () => {
    expect(valuePaise(103004, 12_500_00)).toBe(128_755_000); // 103.004 g x Rs 12,500 = Rs 12,87,550.00
  });
});

describe("agreed wastage percentage", () => {
  it("parses 0.00 to 20.00", () => {
    expect(parsePercent("3.00")).toBe(300);
    expect(parsePercent("0")).toBe(0);
    expect(parsePercent("20")).toBe(2000);
    expect(() => parsePercent("20.01")).toThrow();
    expect(() => parsePercent("3.005")).toThrow();
    expect(() => parsePercent("-1")).toThrow();
  });
});

describe("job position and settlement", () => {
  const base = { issuedFineMg: 109920, pieceFineMg: 103004, scrapFineMg: 3023, filingsFineMg: 0, wastageBp: 300 };
  it("shows the live position after necklace and scrap", () => {
    const p = jobPosition(base);
    expect(p.recoveredFineMg).toBe(106027);
    expect(p.balanceMg).toBe(3893);
    expect(p.allowedMg).toBe(3298);
    expect(p.overAllowanceMg).toBe(595);
  });
  it("closing clears the balance: allowance first, remainder flagged", () => {
    expect(settleJob(jobPosition(base))).toEqual({ allowanceMg: 3298, lossMg: 595 });
  });
  it("a job returned with filings inside the allowance has no loss", () => {
    const s = settleJob(jobPosition({ ...base, filingsFineMg: 700 }));
    expect(s).toEqual({ allowanceMg: 3193, lossMg: 0 });
  });
  it("refuses to close when more came back than went out", () => {
    expect(() => settleJob(jobPosition({ ...base, filingsFineMg: 4000 }))).toThrow(SettlementError);
  });
  it("is exact: issued = pieces + scrap + filings + allowance + loss", () => {
    for (const filings of [0, 300, 900, 1500, 3893]) {
      const p = jobPosition({ ...base, filingsFineMg: filings });
      const s = settleJob(p);
      expect(p.pieceFineMg + p.scrapFineMg + p.filingsFineMg + s.allowanceMg + s.lossMg).toBe(p.issuedFineMg);
    }
  });
});

describe("loss drift against a karigar's own history", () => {
  const job = (n: number, use: number): JobOutcome => ({ jobNo: `J${n}`, closedOn: `2026-0${1 + Math.floor(n / 6)}-${String(10 + (n % 6)).padStart(2, "0")}`, allowedMg: 3000, actualMg: Math.round(3000 * use) });
  const steady = [0.55, 0.6, 0.5, 0.58, 0.62, 0.52, 0.57, 0.6].map((u, i) => job(i, u));
  it("says nothing when there is too little history", () => {
    expect(detectDrift(steady.slice(0, 4)).level).toBe("INSUFFICIENT");
  });
  it("stays quiet for a steady karigar", () => {
    expect(detectDrift([...steady, job(8, 0.6), job(9, 0.58), job(10, 0.61)]).level).toBe("NONE");
  });
  it("raises a review when recent jobs climb well above their own norm", () => {
    const r = detectDrift([...steady, job(8, 0.9), job(9, 1.0), job(10, 1.15)]);
    expect(r.level).toBe("REVIEW");
    expect(r.rising).toBe(true);
    expect(r.summary).toMatch(/earlier jobs/);
  });
  it("does not blame a naturally high-loss karigar for being high", () => {
    const high = [0.95, 1.0, 0.9, 1.05, 0.98, 1.0, 0.95, 1.02].map((u, i) => job(i, u));
    expect(detectDrift([...high, job(8, 1.0), job(9, 0.97), job(10, 1.02)]).level).toBe("NONE");
  });
  it("ignores a rise that stays small in absolute terms", () => {
    const low = [0.1, 0.12, 0.09, 0.11, 0.1, 0.1, 0.12, 0.1].map((u, i) => job(i, u));
    expect(detectDrift([...low, job(8, 0.3), job(9, 0.35), job(10, 0.3)]).level).toBe("NONE");
  });
});

describe("old gold desk", () => {
  const rules = { panThresholdPaise: 2_00_000_00, cashLimitPaise: 2_00_000_00 };
  it("computes net, fine and value", () => {
    const a = assessOldGold({ grossMg: 50_000, deductionMg: 1_500, purityBp: 9160, ratePaisePerGram: 12_500_00, paymentMode: "BANK_TRANSFER", pan: "", rules });
    expect(a.netMg).toBe(48_500);
    expect(a.fineMg).toBe(44_426);
    expect(a.valuePaise).toBe(55_532_500);
    expect(a.errors.map((e) => e.field)).toContain("pan");
  });
  it("blocks cash at the limit and accepts a valid PAN", () => {
    const cash = assessOldGold({ grossMg: 40_000, deductionMg: 0, purityBp: 9160, ratePaisePerGram: 12_500_00, paymentMode: "CASH", pan: "ABCDE1234F", rules });
    expect(cash.errors.map((e) => e.field)).toEqual(["paymentMode"]);
    const ok = assessOldGold({ grossMg: 40_000, deductionMg: 0, purityBp: 9160, ratePaisePerGram: 12_500_00, paymentMode: "UPI", pan: "ABCDE1234F", rules });
    expect(ok.errors).toEqual([]);
  });
  it("small purchases need no PAN", () => {
    const a = assessOldGold({ grossMg: 3_000, deductionMg: 0, purityBp: 9160, ratePaisePerGram: 12_500_00, paymentMode: "CASH", rules });
    expect(a.panRequired).toBe(false);
    expect(a.errors).toEqual([]);
  });
  it("validates PAN and HUID shapes", () => {
    expect(isPan("ABCDE1234F")).toBe(true);
    expect(isPan("ABCDE12345")).toBe(false);
    expect(isHuid("A1B2C3")).toBe(true);
    expect(isHuid("A1B2C")).toBe(false);
  });
});

describe("photo readings: when the AI is wrong or unsure", () => {
  it("a matching clear reading lets the entry save", () => {
    expect(compareReading(112450, { status: "READ", value: 112450 }, false).canSave).toBe(true);
  });
  it("a mismatch blocks saving even if the clerk says they checked", () => {
    const c = compareReading(112450, { status: "READ", value: 112540 }, true);
    expect(c.canSave).toBe(false);
    expect(c.outcome).toBe("MISMATCH");
  });
  it("an unsure reading cannot confirm anything: the clerk must confirm by eye", () => {
    expect(compareReading(112450, { status: "UNSURE", value: 112450 }, false).canSave).toBe(false);
    expect(compareReading(112450, { status: "UNSURE", value: 99999 }, true).canSave).toBe(true);
    expect(compareReading(112450, { status: "UNREADABLE", value: null }, true).outcome).toBe("MANUAL");
  });
  it("no photo is allowed and recorded as such", () => {
    expect(compareReading(1, null, false)).toMatchObject({ outcome: "NO_PHOTO", canSave: true });
  });
  it("parses scale and meter text, repairing display confusions", () => {
    expect(weightFromText("112.450 g STABLE")?.mg).toBe(112450);
    expect(weightFromText("l12.45O g")?.mg).toBe(112450);
    expect(weightFromText("no digits here")).toBeNull();
    expect(purityFromText("Au 22K")?.bp).toBe(9160);
    expect(purityFromText("PURITY 91.60 %")?.bp).toBe(9160);
    expect(purityFromText("916 HALLMARK")?.bp).toBe(9160);
  });
});

describe("daily stock statement and exports", () => {
  const rows = [
    { account: "EXTERNAL", fineMg: -500_000, businessDate: "2026-11-01" },
    { account: "VAULT", fineMg: 500_000, businessDate: "2026-11-01" },
    { account: "VAULT", fineMg: -109_920, businessDate: "2026-11-05" },
    { account: "KARIGAR:k1", fineMg: 109_920, businessDate: "2026-11-05" },
    { account: "KARIGAR:k1", fineMg: -103_004, businessDate: "2026-11-05" },
    { account: "JEWELLERY", fineMg: 103_004, businessDate: "2026-11-05" },
  ];
  it("opens, moves and closes, and the whole stays equal to what came in", () => {
    const s = buildStatement(rows, "2026-11-05", { k1: "Murugesan S" });
    expect(s.totalOpeningMg).toBe(500_000);
    expect(s.totalClosingMg).toBe(500_000);
    const vault = s.sections[0];
    expect(vault.rows[0]).toMatchObject({ openingMg: 500_000, outMg: 109_920, closingMg: 390_080 });
    expect(s.sections[1].rows[0]).toMatchObject({ label: "Murugesan S", closingMg: 6_916 });
  });
  it("shows yesterday's closing as today's opening", () => {
    const s = buildStatement(rows, "2026-11-04", {});
    expect(s.totalClosingMg).toBe(500_000);
    expect(s.sections[1].rows).toHaveLength(0);
  });
  it("exports CSV and Tally XML with escaped text", () => {
    const m = [{ voucherNo: "TX-30411", date: "2026-11-05", from: "Vault", to: "Karigar - Murugesan S", fineMg: 109_920, narration: "Issue, job R&D <1>" }];
    expect(movementsCsv(m)).toContain('2026-11-05,TX-30411,Vault,Karigar - Murugesan S,109.920,"Issue, job R&D <1>"');
    const xml = movementsTallyXml(m, "Company A");
    expect(xml).toContain("<VOUCHERNUMBER>TX-30411</VOUCHERNUMBER>");
    expect(xml).toContain("Issue, job R&amp;D &lt;1&gt;");
    expect(xml).toContain("109.920 g");
  });
});
