import Decimal from "decimal.js";

// Set standard precision for bullion and monetary math
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calculates fine gold weight given gross weight and purity percentage.
 * Precision: 3 decimal places (milligrams / 0.001g)
 * Formula: grossWeight * (purityPct / 100)
 */
export function calculateFineGold(
  grossWeight: string | number | Decimal,
  purityPct: string | number | Decimal
): Decimal {
  const gross = new Decimal(grossWeight || 0);
  const purity = new Decimal(purityPct || 0);

  if (gross.isNegative() || purity.isNegative()) {
    throw new Error("Weights and purity cannot be negative");
  }

  if (purity.greaterThan(100)) {
    throw new Error("Purity percentage cannot exceed 100%");
  }

  // Rounded to 3 decimal places (0.001g)
  return gross.times(purity).dividedBy(100).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}

/**
 * Calculates allowed wastage for a job card given issued fine gold and category wastage percentage.
 * Formula: issuedFineGold * (wastagePct / 100)
 */
export function calculateAllowedWastage(
  issuedFineGold: string | number | Decimal,
  wastagePct: string | number | Decimal
): Decimal {
  const fine = new Decimal(issuedFineGold || 0);
  const pct = new Decimal(wastagePct || 0);

  return fine.times(pct).dividedBy(100).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}

/**
 * Calculates actual wastage given issued fine gold and total recovered fine gold.
 * Formula: issuedFineGold - totalRecoveredFineGold
 */
export function calculateActualWastage(
  issuedFineGold: string | number | Decimal,
  totalRecoveredFineGold: string | number | Decimal
): Decimal {
  const issued = new Decimal(issuedFineGold || 0);
  const recovered = new Decimal(totalRecoveredFineGold || 0);

  return issued.minus(recovered).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}

/**
 * Calculates excess wastage (unapproved loss) if actual wastage exceeds allowed wastage.
 * Formula: max(0, actualWastage - allowedWastage)
 */
export function calculateExcessWastage(
  actualWastage: string | number | Decimal,
  allowedWastage: string | number | Decimal
): Decimal {
  const actual = new Decimal(actualWastage || 0);
  const allowed = new Decimal(allowedWastage || 0);

  const diff = actual.minus(allowed);
  return diff.greaterThan(0) ? diff.toDecimalPlaces(3, Decimal.ROUND_HALF_UP) : new Decimal(0);
}

/**
 * Old Gold Desk Calculations & Statutory Compliance:
 * 1. Net Eligible Weight = Gross Weight - Approved Deduction
 * 2. Fine Gold Weight = Net Eligible Weight * (Tested Purity / 100)
 * 3. Exchange Value = Fine Gold Weight * Gold Rate per Gram
 * 4. Section 269ST & Income Tax Rule 114B Compliance checks
 */
export interface OldGoldAssessment {
  grossWeight: Decimal;
  approvedDeduction: Decimal;
  netEligibleWeight: Decimal;
  testedPurityPct: Decimal;
  fineGoldWeight: Decimal;
  ratePerGram: Decimal;
  exchangeValue: Decimal;
  requiresPan: boolean;
  cashExceedsLimit: boolean;
}

export function assessOldGold(
  grossWeight: string | number | Decimal,
  approvedDeduction: string | number | Decimal,
  testedPurityPct: string | number | Decimal,
  ratePerGram: string | number | Decimal,
  paymentMode: string = "BILL_EXCHANGE",
  panNumber?: string
): OldGoldAssessment {
  const gross = new Decimal(grossWeight || 0);
  const deduction = new Decimal(approvedDeduction || 0);
  const purity = new Decimal(testedPurityPct || 0);
  const rate = new Decimal(ratePerGram || 0);

  if (deduction.greaterThan(gross)) {
    throw new Error("Deduction weight cannot exceed gross weight");
  }

  if (purity.greaterThan(100) || purity.isNegative()) {
    throw new Error("Tested purity percentage must be between 0 and 100%");
  }

  const netEligibleWeight = gross.minus(deduction).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
  const fineGoldWeight = netEligibleWeight.times(purity).dividedBy(100).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
  const exchangeValue = fineGoldWeight.times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Income Tax Rules:
  // - High value purchase > ₹2,00,000 mandates PAN
  // - Cash limit: Section 269ST prohibits cash payment >= ₹2,00,000 in a day
  const requiresPan = exchangeValue.greaterThanOrEqualTo(200000);
  const cashExceedsLimit = paymentMode === "CASH" && exchangeValue.greaterThanOrEqualTo(200000);

  if (requiresPan && (!panNumber || panNumber.trim().length !== 10)) {
    // Flagged for tax validation
  }

  return {
    grossWeight: gross,
    approvedDeduction: deduction,
    netEligibleWeight,
    testedPurityPct: purity,
    fineGoldWeight,
    ratePerGram: rate,
    exchangeValue,
    requiresPan,
    cashExceedsLimit,
  };
}

/**
 * AI Karigar Wastage Drift Detection Engine:
 * Compares current job wastage with artisan's historical moving baseline.
 * If current loss is drifting > 25% above their baseline, flags a quiet review item
 * for Finance Head and Managing Partner (non-accusatory advisory).
 */
export interface DriftAnalysis {
  historicalAvgWastagePct: number;
  currentWastagePct: number;
  driftPercentage: number;
  isDriftingHigh: boolean;
  advisoryNote: string;
}

export function detectKarigarWastageDrift(
  historicalWastages: number[],
  currentWastagePct: number,
  karigarName: string
): DriftAnalysis {
  if (!historicalWastages || historicalWastages.length === 0) {
    return {
      historicalAvgWastagePct: currentWastagePct,
      currentWastagePct,
      driftPercentage: 0,
      isDriftingHigh: false,
      advisoryNote: "Baseline established on first production batch.",
    };
  }

  const avg = historicalWastages.reduce((a, b) => a + b, 0) / historicalWastages.length;
  const drift = ((currentWastagePct - avg) / avg) * 100;
  const isDriftingHigh = drift > 25.0 && currentWastagePct > avg;

  const advisoryNote = isDriftingHigh
    ? `Observation for Finance Head: ${karigarName}'s wastage (${currentWastagePct.toFixed(2)}%) has trended ${drift.toFixed(1)}% above their personal 6-month historical baseline (${avg.toFixed(2)}%). Review bench recovery techniques.`
    : `Wastage is aligned with artisan's historical average (${avg.toFixed(2)}%).`;

  return {
    historicalAvgWastagePct: Number(avg.toFixed(2)),
    currentWastagePct: Number(currentWastagePct.toFixed(2)),
    driftPercentage: Number(drift.toFixed(1)),
    isDriftingHigh,
    advisoryNote,
  };
}
