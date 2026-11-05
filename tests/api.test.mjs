import test from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";

// Verify end-to-end business rules
import {
  calculateFineGold,
  calculateAllowedWastage,
  calculateActualWastage,
  calculateExcessWastage,
  assessOldGold,
} from "../src/lib/calculations.ts";

test("API Simulation: Gold Issue -> Finished Receipt -> Wastage Audit", () => {
  // Step 1: Issue 100g 22K (91.6%) gold to Karigar Ramesh for Chains (1.0% allowed wastage)
  const grossIssued = 100.0;
  const purityPct = 91.6;
  const agreedWastagePct = 1.0;

  const fineGoldIssued = calculateFineGold(grossIssued, purityPct);
  assert.equal(fineGoldIssued.toString(), "91.6");

  // Step 2: Karigar returns finished jewellery (89.0g fine), scrap (1.0g fine), filings (0.8g fine)
  const finishedFine = new Decimal("89.0");
  const scrapFine = new Decimal("1.0");
  const filingsFine = new Decimal("0.8");
  const totalRecoveredFine = finishedFine.plus(scrapFine).plus(filingsFine);
  assert.equal(totalRecoveredFine.toString(), "90.8");

  // Step 3: Wastage calculations
  const actualWastage = calculateActualWastage(fineGoldIssued, totalRecoveredFine);
  const allowedWastage = calculateAllowedWastage(fineGoldIssued, agreedWastagePct);
  const excessWastage = calculateExcessWastage(actualWastage, allowedWastage);

  assert.equal(actualWastage.toString(), "0.8");
  assert.equal(allowedWastage.toString(), "0.916");
  assert.equal(excessWastage.toString(), "0"); // Within tolerance, no excess loss
});

test("API Simulation: Excess Wastage Breached -> Alert Created", () => {
  // Karigar issues 120g gross 22K -> 109.920g fine
  const fineGoldIssued = calculateFineGold(120.0, 91.6);
  assert.equal(fineGoldIssued.toString(), "109.92");

  // Returned: 105.0g finished + 1.0g scrap + 0.5g filings = 106.500g fine
  const totalRecoveredFine = new Decimal("106.5");

  const actualWastage = calculateActualWastage(fineGoldIssued, totalRecoveredFine);
  assert.equal(actualWastage.toString(), "3.42");

  const allowedWastage = calculateAllowedWastage(fineGoldIssued, "1.2");
  assert.equal(allowedWastage.toString(), "1.319");

  const excessWastage = calculateExcessWastage(actualWastage, allowedWastage);
  assert.equal(excessWastage.toString(), "2.101");
  assert.ok(excessWastage.toNumber() > 0, "Critical excess wastage flag must be active");
});

test("API Simulation: Old Gold Exchange Valuation", () => {
  const assessment = assessOldGold("48.650", "3.150", "89.20", "7350.00");
  assert.equal(assessment.netEligibleWeight.toString(), "45.5");
  assert.equal(assessment.fineGoldWeight.toString(), "40.586");
  assert.equal(assessment.exchangeValue.toString(), "298307.1");
});

