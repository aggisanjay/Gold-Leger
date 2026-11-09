/**
 * Exact gold arithmetic.
 *
 * Every weight is an integer number of MILLIGRAMS (3 decimals of a gram), every purity an integer
 * number of BASIS POINTS of a percent (2 decimals: 91.60% = 9160), every rupee amount an integer
 * number of PAISE. No floating point is ever used for money or gold, so sums are exact and
 * a ledger can be audited to the milligram.
 */

export type Mg = number;
export type Bp = number;
export type Paise = number;

/** Round-half-up integer division (half away from zero for negatives). d must be > 0. */
export function roundDiv(n: number, d: number): number {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d <= 0) throw new RangeError("roundDiv: unsafe input");
  const sign = n < 0 ? -1 : 1;
  const a = Math.abs(n);
  return sign * Math.floor((2 * a + d) / (2 * d));
}

const DECIMAL = /^\d{1,7}(\.\d{1,3})?$/;

/** "112.450" -> 112450. Rejects more than 3 decimals, negatives, exponents and junk. */
export function parseGrams(input: string | number): Mg {
  const s = String(input).trim();
  if (!DECIMAL.test(s)) throw new RangeError("Weight must be a number with at most 3 decimals, e.g. 112.450");
  const [i, f = ""] = s.split(".");
  return Number(i) * 1000 + Number(f.padEnd(3, "0"));
}

export function tryParseGrams(input: string | number | null | undefined): Mg | null {
  if (input === null || input === undefined || input === "") return null;
  try { return parseGrams(input); } catch { return null; }
}

const PURITY = /^\d{1,3}(\.\d{1,2})?$/;

/** "91.60" -> 9160. Purity is 0.01 to 100.00 percent. */
export function parsePurity(input: string | number): Bp {
  const s = String(input).trim();
  if (!PURITY.test(s)) throw new RangeError("Purity must be a percentage with at most 2 decimals, e.g. 91.60");
  const [i, f = ""] = s.split(".");
  const bp = Number(i) * 100 + Number(f.padEnd(2, "0"));
  if (bp < 1 || bp > 10000) throw new RangeError("Purity must be between 0.01 and 100.00");
  return bp;
}

/** Agreed wastage "3.00" -> 300 basis points. Allowed range 0.00 to 20.00 percent. */
export function parsePercent(input: string | number): Bp {
  const s = String(input).trim();
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) throw new RangeError("Enter a percentage with at most 2 decimals, e.g. 3.00");
  const [i, f = ""] = s.split(".");
  const bp = Number(i) * 100 + Number(f.padEnd(2, "0"));
  if (bp > 2000) throw new RangeError("Wastage cannot be more than 20.00%");
  return bp;
}

/** Fine gold in a piece: gross x purity, rounded half-up to the milligram. */
export function fineMg(grossMg: Mg, purityBp: Bp): Mg {
  return roundDiv(grossMg * purityBp, 10000);
}

/** Wastage allowed on an issue of fine gold at an agreed percentage (basis points). */
export function allowedMg(issuedFineMg: Mg, wastageBp: Bp): Mg {
  return roundDiv(issuedFineMg * wastageBp, 10000);
}

/** Value in paise of fine gold at a rate per gram (in paise). */
export function valuePaise(fine: Mg, ratePaisePerGram: Paise): Paise {
  return roundDiv(fine * ratePaisePerGram, 1000);
}

/** Percentage of `part` in `whole`, as basis points, rounded (for display only). */
export function ratioBp(part: Mg, whole: Mg): number {
  return whole === 0 ? 0 : roundDiv(part * 10000, whole);
}

const MINUS = "\u2212";

function group(intPart: string): string {
  // Indian digit grouping: 12,34,567
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/** 109920 -> "109.920"; negatives use a real minus sign. */
export function formatGrams(mg: Mg, opts: { plus?: boolean; grouping?: boolean } = {}): string {
  const neg = mg < 0;
  const a = Math.abs(mg);
  const i = Math.floor(a / 1000);
  const f = String(a % 1000).padStart(3, "0");
  const ip = opts.grouping === false ? String(i) : group(String(i));
  return `${neg ? MINUS : opts.plus && a > 0 ? "+" : ""}${ip}.${f}`;
}

export function formatPurity(bp: Bp): string {
  return `${Math.floor(bp / 100)}.${String(bp % 100).padStart(2, "0")}`;
}

export function formatPercentBp(bp: number): string {
  return formatPurity(Math.round(bp));
}

export function formatRupees(paise: Paise, opts: { decimals?: boolean } = {}): string {
  const neg = paise < 0;
  const a = Math.abs(paise);
  const rupees = Math.floor(a / 100);
  const p = String(a % 100).padStart(2, "0");
  return `${neg ? MINUS : ""}\u20B9${group(String(rupees))}${opts.decimals === false ? "" : "." + p}`;
}

/** Common hallmark purities offered as one-tap presets. */
export const PURITY_PRESETS: { label: string; bp: Bp }[] = [
  { label: "24K", bp: 9990 },
  { label: "22K", bp: 9160 },
  { label: "20K", bp: 8330 },
  { label: "18K", bp: 7500 },
  { label: "14K", bp: 5850 },
];
