import sharp from "sharp";
import { createHash } from "node:crypto";
import { parseGrams, parsePurity } from "@/domain/units";
import { MIN_CONFIDENCE, purityFromText, type ReadingKind, type ReadingResult } from "@/domain/reading";
import { readSevenSegmentDeskewed } from "./sevenseg";
import { readPrintout } from "./printout";
import { readWithGemini } from "./gemini";

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export class PhotoError extends Error {}

/** Accept only real images, strip metadata and bound the size, so a stored photo is always safe to show. */
export async function normalisePhoto(bytes: Buffer): Promise<{ bytes: Buffer; mime: string; sha256: string }> {
  if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) throw new PhotoError("The photo must be under 6 MB.");
  let meta;
  try { meta = await sharp(bytes).metadata(); } catch { throw new PhotoError("That file is not a photo."); }
  if (!meta.format || !["jpeg", "png", "webp", "heif"].includes(meta.format)) throw new PhotoError("Use a JPEG, PNG or WebP photo.");
  if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 120) throw new PhotoError("The photo is too small to read. Move closer and try again.");
  const out = await sharp(bytes).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return { bytes: out, mime: "image/jpeg", sha256: createHash("sha256").update(out).digest("hex") };
}

function weightResult(text: string | null, confidence: number, engine: string, why: string): ReadingResult {
  const base = { kind: "WEIGHT" as const, rawText: text ?? "", engine };
  if (!text) return { ...base, status: "UNREADABLE", value: null, confidence: 0, reason: why || "No display was found in the photo." };
  if (!/^\d{1,4}\.\d{3}$/.test(text)) return { ...base, status: "UNSURE", value: null, confidence, reason: why || `Could not read every digit (saw "${text}").` };
  const mg = parseGrams(text);
  if (confidence < MIN_CONFIDENCE) return { ...base, status: "UNSURE", value: mg, confidence, reason: why || "The reading is not clear enough to rely on." };
  return { ...base, status: "READ", value: mg, confidence, reason: "" };
}

/** Read a scale display. Local computer vision always runs; Gemini adds a second opinion when a key is set. */
async function readWeight(photo: Buffer): Promise<ReadingResult> {
  const local = await readSevenSegmentDeskewed(photo).catch(() => null);
  const a = local ? weightResult(local.text, local.confidence, "local seven-segment reader", local.notes.join("; ")) : weightResult(null, 0, "local seven-segment reader", "");
  const g = await readWithGemini(photo, "WEIGHT");
  if (!g) return a;
  const b = weightResult(g.text, g.confidence, "gemini", g.legible ? "" : "Gemini could not read the display.");
  if (a.status === "READ" && b.status === "READ") {
    return a.value === b.value
      ? { ...a, confidence: Math.max(a.confidence, b.confidence), engine: "local reader + gemini (agree)", reason: "" }
      : { ...a, status: "UNSURE", engine: "local reader + gemini (disagree)", reason: `Two readers disagree: ${a.rawText} and ${b.rawText}. Check the display yourself.` };
  }
  if (b.status === "READ") return { ...b, engine: "gemini" };
  if (a.status === "READ") return a;
  return a.status === "UNSURE" ? a : b;
}

async function readPurity(photo: Buffer): Promise<ReadingResult> {
  const base = { kind: "PURITY" as const, engine: "tesseract (printout)" };
  const pr = await readPrintout(photo).catch(() => null);
  const found = pr ? purityFromText(pr.text) : null;
  let result: ReadingResult;
  if (!pr || !found) {
    result = { ...base, status: "UNREADABLE", value: null, rawText: pr?.text.slice(0, 200) ?? "", confidence: 0, reason: "No purity figure was found on the slip." };
  } else {
    const bp = Math.round(found.bp);
    const ok = pr.confidence >= MIN_CONFIDENCE && bp > 0 && bp <= 10000;
    result = { ...base, status: ok ? "READ" : "UNSURE", value: bp, rawText: found.shown, confidence: Math.round(pr.confidence * 100) / 100, reason: ok ? "" : "The slip is not clear enough to rely on." };
  }
  const g = await readWithGemini(photo, "PURITY");
  if (g && g.text) {
    let gb: number | null = null;
    try { gb = parsePurity(g.text); } catch { gb = null; }
    if (gb !== null && result.status === "READ" && result.value !== gb)
      return { ...result, status: "UNSURE", engine: "tesseract + gemini (disagree)", reason: `Two readers disagree: ${result.rawText} and ${g.text}. Check the slip yourself.` };
    if (gb !== null && result.status !== "READ" && g.legible && g.confidence >= MIN_CONFIDENCE)
      return { ...base, engine: "gemini", status: "READ", value: gb, rawText: g.text, confidence: g.confidence, reason: "" };
  }
  return result;
}

export async function analysePhoto(bytes: Buffer, kind: ReadingKind): Promise<ReadingResult> {
  return kind === "WEIGHT" ? readWeight(bytes) : readPurity(bytes);
}
