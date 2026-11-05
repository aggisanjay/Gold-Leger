import test from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";

// Set standard precision for bullion and monetary math
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function calculateFineGold(grossWeight, purityPct) {
  const gross = new Decimal(grossWeight || 0);
  const purity = new Decimal(purityPct || 0);
  if (gross.isNegative() || purity.isNegative()) {
    throw new Error("Weights and purity cannot be negative");
  }
  if (purity.greaterThan(100)) {
    throw new Error("Purity percentage cannot exceed 100%");
  }
  return gross.times(purity).dividedBy(100).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}

function assessOldGold(grossWeight, approvedDeduction, testedPurityPct, ratePerGram, paymentMode = "BILL_EXCHANGE", panNumber) {
  const gross = new Decimal(grossWeight || 0);
  const deduction = new Decimal(approvedDeduction || 0);
  const purity = new Decimal(testedPurityPct || 0);
  const rate = new Decimal(ratePerGram || 0);

  if (deduction.greaterThan(gross)) {
    throw new Error("Deduction weight cannot exceed gross weight");
  }

  const netEligibleWeight = gross.minus(deduction).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
  const fineGoldWeight = netEligibleWeight.times(purity).dividedBy(100).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
  const exchangeValue = fineGoldWeight.times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const requiresPan = exchangeValue.greaterThanOrEqualTo(200000);
  const cashExceedsLimit = paymentMode === "CASH" && exchangeValue.greaterThanOrEqualTo(200000);

  return {
    netEligibleWeight,
    fineGoldWeight,
    exchangeValue,
    requiresPan,
    cashExceedsLimit,
  };
}

function detectKarigarWastageDrift(historicalWastages, currentWastagePct) {
  const avg = historicalWastages.reduce((a, b) => a + b, 0) / historicalWastages.length;
  const drift = ((currentWastagePct - avg) / avg) * 100;
  const isDriftingHigh = drift > 25.0 && currentWastagePct > avg;
  return { avg, drift, isDriftingHigh };
}

// 1. Exact Sample Transactions from Client Specification (Company A, Coimbatore)
test("Sample Data TX-30411 — Issue to Murugesan S", () => {
  // TX-30411 | Murugesan S | Issue | 120.000g Gross | 91.60% Purity -> 109.920g Fine
  const fine = calculateFineGold("120.000", "91.60");
  assert.equal(fine.toString(), "109.92");
});

test("Sample Data TX-30437 — Receipt Necklace (112.450g) and running balance", () => {
  // TX-30437 | Murugesan S | Receipt, necklace | 112.450g Gross | 91.60% Purity -> 103.004g Fine
  // Running Fine Balance = 109.920 - 103.004 = 6.916g
  const initialFine = new Decimal("109.920");
  const necklaceFine = calculateFineGold("112.450", "91.60");
  assert.equal(necklaceFine.toString(), "103.004");

  const runningBalance = initialFine.minus(necklaceFine);
  assert.equal(runningBalance.toString(), "6.916");
});

test("Sample Data TX-30438 — Receipt Scrap (3.300g) and remaining balance", () => {
  // TX-30438 | Murugesan S | Receipt, scrap | 3.300g Gross | 91.60% Purity -> 3.023g Fine
  // Running Fine Balance = 6.916 - 3.023 = 3.893g
  const balanceBefore = new Decimal("6.916");
  const scrapFine = calculateFineGold("3.300", "91.60");
  assert.equal(scrapFine.toString(), "3.023");

  const finalBalance = balanceBefore.minus(scrapFine);
  assert.equal(finalBalance.toString(), "3.893");
});

test("Income Tax Compliance — PAN mandatory for > ₹2 Lakhs Old-Gold", () => {
  // 54.200g gross - 2.200g deduction = 52.000g net @ 89.5% purity = 46.540g fine
  // At ₹12,500/g = ₹5,81,750 (Exceeds ₹2 Lakhs)
  const assessment = assessOldGold("54.200", "2.200", "89.50", "12500.00", "BILL_EXCHANGE");
  assert.equal(assessment.requiresPan, true, "Transactions above ₹2 Lakhs must require PAN under Rule 114B");
  assert.equal(assessment.cashExceedsLimit, false);
});

test("Section 269ST Compliance — Prohibits Cash payment >= ₹2 Lakhs", () => {
  const assessment = assessOldGold("54.200", "2.200", "89.50", "12500.00", "CASH");
  assert.equal(assessment.cashExceedsLimit, true, "Cash payment >= ₹2L must violate Section 269ST limit");
});

test("AI Karigar Loss Drift Detection", () => {
  // Murugesan's historical average is 2.95%. Current job is 3.85% (30.5% drift!)
  const drift = detectKarigarWastageDrift([2.90, 2.95, 3.00], 3.85);
  assert.equal(drift.isDriftingHigh, true, "Drift above 25% must flag advisory review item");
});
