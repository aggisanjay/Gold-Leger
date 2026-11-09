import { api } from "@/server/api";
import { ApiError } from "@/server/errors";
import { createReading } from "@/server/services/readings";
import { MAX_UPLOAD_BYTES } from "@/server/ocr";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Upload a photo of a scale display (kind=WEIGHT) or a karat-meter slip (kind=PURITY). Returns the reading to show beside the photo. */
export const POST = api(["CLERK", "FINANCE"], async ({ req, ctx }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || (kind !== "WEIGHT" && kind !== "PURITY")) throw new ApiError(422, "INVALID", "Attach a photo and say whether it shows a weight or a purity.");
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(422, "BAD_PHOTO", "The photo must be under 6 MB.");
  return { reading: await createReading(ctx, kind, Buffer.from(await file.arrayBuffer())) };
});
