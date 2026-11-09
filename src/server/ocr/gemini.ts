/**
 * Optional second reader. Only used when GEMINI_API_KEY is set. A failure here never blocks work:
 * the local reader still runs and the clerk can always confirm by eye.
 */
export interface GeminiReading { text: string | null; legible: boolean; confidence: number }

export async function readWithGemini(photo: Buffer, kind: "WEIGHT" | "PURITY"): Promise<GeminiReading | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const ask =
    kind === "WEIGHT"
      ? 'This is a photo of a jewellery weighing scale display showing a weight in grams. Return JSON {"text": string, "legible": boolean, "confidence": number}. "text" is exactly the digits shown, including the decimal point, e.g. "112.450". If any digit is unclear, set legible=false and text=null. Do not guess. confidence is 0 to 1.'
      : 'This is a photo of a karat meter printout. Return JSON {"text": string, "legible": boolean, "confidence": number}. "text" is the gold (Au) purity percentage exactly as printed, e.g. "91.62". If unclear, set legible=false and text=null. Do not guess. confidence is 0 to 1.';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(9000),
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: photo.toString("base64") } }, { text: ask }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(String(raw));
    const text = typeof parsed.text === "string" ? parsed.text.trim() : null;
    const conf = Number(parsed.confidence);
    return { text, legible: parsed.legible === true && !!text, confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0 };
  } catch {
    return null;
  }
}
