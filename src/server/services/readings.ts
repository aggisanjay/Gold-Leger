import { one, run, withTx } from "../db";
import { ApiError } from "../errors";
import { isoNow } from "../clock";
import { newId, type Ctx } from "./core";
import { analysePhoto, normalisePhoto, PhotoError } from "../ocr";
import type { ReadingKind, ReadingResult } from "@/domain/reading";

export interface ReadingSummary {
  id: string; kind: ReadingKind; status: ReadingResult["status"]; value: number | null; rawText: string; confidence: number; reason: string; engine: string;
}

/** Read a photo, keep it with its reading, and return the reading to show beside the photo. */
export async function createReading(ctx: Ctx, kind: ReadingKind, bytes: Buffer): Promise<ReadingSummary> {
  let photo;
  try { photo = await normalisePhoto(bytes); } catch (e) { if (e instanceof PhotoError) throw new ApiError(422, "BAD_PHOTO", e.message); throw e; }
  const result = await analysePhoto(photo.bytes, kind);
  return withTx(async (t) => {
    const reused = await one<{ id: string }>(t, "SELECT id FROM readings WHERE sha256 = ? AND kind = ? AND used_by IS NOT NULL", [photo.sha256, kind]);
    if (reused) throw new ApiError(422, "READING_REUSED", "This exact photo has already been used for another entry. Take a new photo.");
    const id = newId();
    await run(t,
      `INSERT INTO readings (id, sha256, kind, engine, status, value, raw_text, confidence, reason, mime, photo, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, photo.sha256, kind, result.engine, result.status, result.value, result.rawText, result.confidence, result.reason, photo.mime, photo.bytes, ctx.userId, isoNow(ctx.now)]);
    return { id, kind, status: result.status, value: result.value, rawText: result.rawText, confidence: result.confidence, reason: result.reason, engine: result.engine };
  });
}

export async function readingPhoto(c: import("@libsql/client").Client, id: string) {
  const r = await one<{ photo: ArrayBuffer; mime: string }>(c, "SELECT photo, mime FROM readings WHERE id = ?", [id]);
  return r ? { bytes: Buffer.from(r.photo), mime: r.mime } : null;
}
