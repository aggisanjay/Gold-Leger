import { fineMg, valuePaise, type Bp, type Mg, type Paise } from "./units";
import { isPan } from "./validators";

export const PAYMENT_MODES = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "ADJUSTED_IN_BILL"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface OldGoldRules {
  /** Purchases at or above this value must carry the customer's PAN. */
  panThresholdPaise: Paise;
  /** Cash payment at or above this value is not accepted. */
  cashLimitPaise: Paise;
}

export interface OldGoldAssessment {
  netMg: Mg;
  fineMg: Mg;
  valuePaise: Paise;
  panRequired: boolean;
  errors: { field: string; message: string }[];
}

export function assessOldGold(input: {
  grossMg: Mg; deductionMg: Mg; purityBp: Bp; ratePaisePerGram: Paise;
  paymentMode: PaymentMode; pan?: string | null; rules: OldGoldRules;
}): OldGoldAssessment {
  const errors: OldGoldAssessment["errors"] = [];
  const { grossMg, deductionMg, purityBp, ratePaisePerGram, paymentMode, rules } = input;
  if (deductionMg > grossMg) errors.push({ field: "deduction", message: "Deductions cannot be more than the gross weight." });
  const netMg = Math.max(0, grossMg - deductionMg);
  const fine = fineMg(netMg, purityBp);
  const value = valuePaise(fine, ratePaisePerGram);
  const panRequired = value >= rules.panThresholdPaise;
  const pan = (input.pan ?? "").trim().toUpperCase();
  if (panRequired && !pan) errors.push({ field: "pan", message: "PAN is required for a purchase of this value." });
  if (pan && !isPan(pan)) errors.push({ field: "pan", message: "PAN should look like ABCDE1234F." });
  if (paymentMode === "CASH" && value >= rules.cashLimitPaise)
    errors.push({ field: "paymentMode", message: "Cash is not accepted at this value. Choose UPI, bank transfer, cheque or adjust it in the bill." });
  return { netMg, fineMg: fine, valuePaise: value, panRequired, errors };
}
