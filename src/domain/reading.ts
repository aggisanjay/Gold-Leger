import { tryParseGrams, type Mg } from "./units";

/**
 * Photo readings of a scale display or karat-meter printout.
 *
 *   READ        a clear, plausible value was found with good confidence
 *   UNSURE      something was found but we would not stake a ledger entry on it
 *   UNREADABLE  nothing usable in the photo
 *
 * A reading is only ever a second pair of eyes. It never writes a value by itself.
 */
export type ReadingStatus = "READ" | "UNSURE" | "UNREADABLE";
export type ReadingKind = "WEIGHT" | "PURITY";

export interface ReadingResult {
  status: ReadingStatus;
  kind: ReadingKind;
  /** Weight in mg, or purity in basis points. */
  value: number | null;
  /** Text as shown on the display. */
  rawText: string;
  confidence: number; // 0..1
  reason: string;
  engine: string;
}

export const MIN_CONFIDENCE = 0.8;
export const MAX_PLAUSIBLE_MG = 5_000_000; // 5 kg on a single pan

/** All decimal numbers in OCR text, with common seven-segment confusions repaired. */
export function numbersFromText(text: string): string[] {
  const cleaned = text
    .replace(/[Oo]/g, "0").replace(/[Il|]/g, "1").replace(/S/g, "5").replace(/B/g, "8")
    .replace(/,/g, ".");
  return cleaned.match(/\d+\.\d{1,3}|\d{1,4}/g) ?? [];
}

/** Best weight candidate in grams: prefer values that show three decimals, as a scale does. */
export function weightFromText(text: string): { mg: Mg; shown: string } | null {
  const nums = numbersFromText(text).filter((n) => /\.\d{3}$/.test(n));
  for (const n of nums) {
    const mg = tryParseGrams(n);
    if (mg !== null && mg > 0 && mg <= MAX_PLAUSIBLE_MG) return { mg, shown: n };
  }
  return null;
}

const KARAT_PURITY_BP: Record<number, number> = { 24: 9990, 22: 9160, 21: 8750, 20: 8330, 18: 7500, 14: 5850, 10: 4170, 9: 3750 };

/** Purity from a printout: "91.60", "916", "22K" or "22 KT". Returns basis points. */
export function purityFromText(text: string): { bp: number; shown: string } | null {
  const t = text.toUpperCase();
  const k = t.match(/\b(\d{1,2})\s*K(?:T|ARAT)?\b/);
  if (k && KARAT_PURITY_BP[Number(k[1])]) return { bp: KARAT_PURITY_BP[Number(k[1])], shown: `${k[1]}K` };
  const pct = t.match(/\b(\d{2}\.\d{1,2})\b/);
  if (pct) {
    const bp = Math.round(Number(pct[1]) * 100);
    if (bp >= 1000 && bp <= 10000) return { bp, shown: pct[1] };
  }
  const fineness = t.match(/\b(9[0-9]{2}|[5-8][0-9]{2})\b/);
  if (fineness) return { bp: Number(fineness[1]) * 10, shown: fineness[1] };
  return null;
}

export type ComparisonOutcome = "MATCH" | "MISMATCH" | "MANUAL" | "NO_PHOTO";

export interface Comparison {
  outcome: ComparisonOutcome;
  /** True when the entry may be saved. */
  canSave: boolean;
  message: string;
}

/**
 * The save rule, enforced on the server:
 *  - a clear reading must equal the typed value, to the last digit, or saving is blocked;
 *  - an unsure or unreadable photo cannot confirm anything, so the clerk must say they checked
 *    the display themselves (recorded against the entry);
 *  - no photo at all is allowed, and recorded as such.
 */
export function compareReading(
  typed: number,
  reading: Pick<ReadingResult, "status" | "value"> | null,
  manuallyConfirmed: boolean,
  unit: "g" | "%" = "g",
): Comparison {
  if (!reading) return { outcome: "NO_PHOTO", canSave: true, message: "No photo attached. Saved without a second check." };
  if (reading.status === "READ" && reading.value !== null) {
    if (reading.value === typed) return { outcome: "MATCH", canSave: true, message: "The photo matches what you typed." };
    return {
      outcome: "MISMATCH", canSave: false,
      message: unit === "g"
        ? "The photo and the typed weight do not match. Check the display, then correct the weight or take the photo again."
        : "The photo and the typed purity do not match. Check the printout, then correct the purity or take the photo again.",
    };
  }
  if (manuallyConfirmed) return { outcome: "MANUAL", canSave: true, message: "Photo could not be read. Confirmed by eye and recorded." };
  return { outcome: "MANUAL", canSave: false, message: "The photo could not be read reliably. Look at the display yourself and confirm it matches before saving." };
}
