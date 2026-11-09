import sharp from "sharp";
import path from "node:path";
import { createWorker, PSM, type Worker } from "tesseract.js";

/** Text from a printed karat-meter slip. Uses Tesseract with the English model bundled in /tessdata. */
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      langPath: path.join(process.cwd(), "tessdata"),
      gzip: false,
      cachePath: path.join(process.env.TMPDIR ?? "/tmp", "gl-tess-cache"),
    }).then(async (w) => {
      await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "1" });
      return w;
    });
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

export interface PrintoutText { text: string; confidence: number }

export async function readPrintout(bytes: Buffer): Promise<PrintoutText | null> {
  const prepared = await sharp(bytes).rotate().resize({ width: 1500, withoutEnlargement: false }).greyscale().normalise().sharpen().png().toBuffer();
  const worker = await getWorker();
  const { data } = await worker.recognize(prepared);
  const text = data.text.trim();
  return text ? { text, confidence: Math.max(0, Math.min(1, data.confidence / 100)) } : null;
}

export async function shutdownOcr() {
  if (workerPromise) { const w = await workerPromise; await w.terminate(); workerPromise = null; }
}
