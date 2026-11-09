import sharp from "sharp";

/**
 * A seven-segment display reader (computer vision, no model, no network).
 *
 * 1. find the LCD glass (the biggest bright block),
 * 2. find the band of rows the digits occupy and split it into digit cells,
 * 3. for each cell, measure how filled each of the 7 segments is,
 * 4. turn the lit pattern into a digit, and score how decisive every segment was.
 *
 * It reports low confidence, or nothing, when the photo is glared, blurred or tilted too far.
 * It never guesses a digit from an ambiguous pattern.
 */

export interface SevenSegResult {
  text: string; // e.g. "112.450" (digits and at most one point)
  confidence: number; // 0..1
  notes: string[];
}

/** A segment counts as lit when this share of its box is ink (lit segments measure ~0.45-0.95, unlit ~0-0.15). */
const LIT = 0.33;

const PATTERNS: Record<string, string> = {
  abcdef: "0", bc: "1", abdeg: "2", abcdg: "3", bcfg: "4", acdfg: "5", acdefg: "6", abc: "7", abcdefg: "8", abcdfg: "9",
};
// extra common variants (6 and 9 without tails, 7 with the f segment)
const ALT: Record<string, string> = { cdefg: "6", abcfg: "9", abcf: "7" };

// segment boxes as fractions of the digit cell: [x0, y0, x1, y1]
const SEGMENTS: Record<string, [number, number, number, number]> = {
  a: [0.22, 0.0, 0.78, 0.14], d: [0.22, 0.86, 0.78, 1.0], g: [0.22, 0.43, 0.78, 0.57],
  f: [0.0, 0.13, 0.22, 0.47], e: [0.0, 0.53, 0.22, 0.87], b: [0.78, 0.13, 1.0, 0.47], c: [0.78, 0.53, 1.0, 0.87],
};

function otsu(hist: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sB += t * hist[t];
    const mB = sB / wB, mF = (sum - sB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = t; }
  }
  return thr;
}
const histOf = (px: Uint8Array | number[]) => { const h = new Array(256).fill(0); for (const v of px) h[v]++; return h; };

/** Biggest 4-connected block of `true` cells, as a bounding box. */
function largestBlock(mask: Uint8Array, w: number, h: number) {
  const seen = new Uint8Array(w * h);
  let best = { n: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack.push(s); seen[s] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || seen[q] || !mask[q]) continue;
        const qx = q % w;
        if ((q === p - 1 && qx === w - 1) || (q === p + 1 && qx === 0)) continue;
        seen[q] = 1; stack.push(q);
      }
    }
    if (n > best.n) best = { n, x0, y0, x1, y1 };
  }
  return best;
}

export async function readSevenSegment(bytes: Buffer): Promise<SevenSegResult | null> {
  const notes: string[] = [];
  const { data, info } = await sharp(bytes).rotate().resize({ width: 960 }).greyscale().normalise().blur(0.9).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const gray = new Uint8Array(data);

  // 1. LCD glass: biggest bright block, found on a coarse grid
  const S = 4, gw = Math.floor(W / S), gh = Math.floor(H / S);
  const coarse = new Uint8Array(gw * gh);
  const tBright = otsu(histOf(gray), W * H);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    let s = 0;
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) s += gray[(y * S + dy) * W + x * S + dx];
    coarse[y * gw + x] = s / (S * S) > tBright ? 1 : 0;
  }
  const glass = largestBlock(coarse, gw, gh);
  if (glass.n < gw * gh * 0.04) return null;
  const mx = Math.round((glass.x1 - glass.x0) * 0.03), my = Math.round((glass.y1 - glass.y0) * 0.04);
  const gx0 = (glass.x0 + mx) * S, gx1 = (glass.x1 - mx) * S, gy0 = (glass.y0 + my) * S, gy1 = (glass.y1 - my) * S;
  const gwid = gx1 - gx0, ghei = gy1 - gy0;
  if (gwid < 120 || ghei < 60) return null;

  // 2. digits are the ink inside the glass. Use a LOCAL threshold (each pixel against its own
  //    neighbourhood) so smooth glare and vignetting do not hide part of a digit.
  const integral = new Float64Array((gwid + 1) * (ghei + 1));
  for (let y = 0; y < ghei; y++) {
    let row = 0;
    for (let x = 0; x < gwid; x++) {
      row += gray[(gy0 + y) * W + gx0 + x];
      integral[(y + 1) * (gwid + 1) + x + 1] = integral[y * (gwid + 1) + x + 1] + row;
    }
  }
  const R = Math.max(12, Math.round(ghei * 0.14));
  const localMean = (x: number, y: number) => {
    const x0 = Math.max(0, x - R), x1 = Math.min(gwid, x + R + 1), y0 = Math.max(0, y - R), y1 = Math.min(ghei, y + R + 1);
    const sum = integral[y1 * (gwid + 1) + x1] - integral[y0 * (gwid + 1) + x1] - integral[y1 * (gwid + 1) + x0] + integral[y0 * (gwid + 1) + x0];
    return sum / ((x1 - x0) * (y1 - y0));
  };
  const DELTA = 14;
  let ink = new Array<number>(gwid * ghei);
  let inkCount = 0;
  for (let y = 0; y < ghei; y++) for (let x = 0; x < gwid; x++) {
    const on = gray[(gy0 + y) * W + gx0 + x] < localMean(x, y) - DELTA ? 1 : 0;
    ink[y * gwid + x] = on; inkCount += on;
  }
  if (inkCount / ink.length > 0.4) {
    notes.push("light digits on dark glass");
    inkCount = 0;
    for (let y = 0; y < ghei; y++) for (let x = 0; x < gwid; x++) {
      const on = gray[(gy0 + y) * W + gx0 + x] > localMean(x, y) + DELTA ? 1 : 0;
      ink[y * gwid + x] = on; inkCount += on;
    }
  }
  // the threshold is unreliable right at the glass border: ignore a thin margin
  const EDGE = Math.max(8, Math.round(gwid * 0.026));
  for (let y = 0; y < ghei; y++) for (let x = 0; x < gwid; x++) if (x < EDGE || x >= gwid - EDGE || y < EDGE || y >= ghei - EDGE) ink[y * gwid + x] = 0;
  const at = (x: number, y: number) => ink[y * gwid + x];

  // rows occupied by the digits: tall, dense run of rows
  const rowDen = Array.from({ length: ghei }, (_, y) => { let c = 0; for (let x = 0; x < gwid; x++) c += at(x, y); return c / gwid; });
  const maxRow = Math.max(...rowDen);
  if (maxRow < 0.04) return null;
  let bestRun: [number, number] = [0, 0], runStart = -1;
  for (let y = 0; y <= ghei; y++) {
    const on = y < ghei && rowDen[y] >= maxRow * 0.2;
    if (on && runStart < 0) runStart = y;
    if (!on && runStart >= 0) { if (y - runStart > bestRun[1] - bestRun[0]) bestRun = [runStart, y]; runStart = -1; }
  }
  const [by0, by1] = bestRun;
  const bandH = by1 - by0;
  if (bandH < ghei * 0.35) return null;

  // 3. split the band into digit cells by column gaps
  const colHas = Array.from({ length: gwid }, (_, x) => { let c = 0; for (let y = by0; y < by1; y++) c += at(x, y); return c; });
  const minCol = Math.max(2, bandH * 0.04);
  const runs: { x0: number; x1: number; ink: number }[] = [];
  let cur: { x0: number; x1: number; ink: number } | null = null, gap = 0;
  const maxGap = Math.max(3, bandH * 0.035);
  for (let x = 0; x < gwid; x++) {
    if (colHas[x] >= minCol) {
      if (!cur) cur = { x0: x, x1: x, ink: 0 };
      cur.x1 = x; cur.ink += colHas[x]; gap = 0;
    } else if (cur && ++gap > maxGap) { runs.push(cur); cur = null; gap = 0; }
  }
  if (cur) runs.push(cur);
  if (runs.length < 2) return null;

  if (process.env.SEG_DEBUG) console.log('glass',{gx0,gx1,gy0,gy1},'band',{by0,by1,bandH},'runs',runs.map((r)=>[r.x0,r.x1,r.x1-r.x0+1]));
  // vertical extent of every run: digits are tall, a point is a small blob near the baseline
  const shape = runs.map((r) => {
    let top = by1, bot = by0;
    for (let y = by0; y < by1; y++) for (let x = r.x0; x <= r.x1; x++) if (at(x, y)) { if (y < top) top = y; if (y > bot) bot = y; }
    return { ...r, w: r.x1 - r.x0 + 1, top, bot, h: Math.max(0, bot - top + 1) };
  });
  if (process.env.SEG_DEBUG) console.log('shape', shape.map((r) => [r.x0, r.x1, r.w, r.top, r.bot, r.h]), 'band', by0, by1);
  // a real digit is at least as wide as a "1" (~12% of its height): thinner slivers are glass-edge artefacts
  for (let i = shape.length - 1; i >= 0; i--) if (shape[i].h >= bandH * 0.6 && shape[i].w < bandH * 0.08) shape.splice(i, 1);
  const digitsRuns = shape.filter((r) => r.h >= bandH * 0.6);
  if (digitsRuns.length < 2) return null;
  const maxW = Math.max(...digitsRuns.map((r) => r.w));
  const fullWs = digitsRuns.filter((r) => r.w >= maxW * 0.7).map((r) => r.w).sort((a, b) => a - b);
  const fullW = fullWs[Math.floor(fullWs.length / 2)];

  // 4. classify each run, left to right
  let text = "";
  let marginSum = 0, marginN = 0, ambiguous = 0, dots = 0;
  for (const r of shape) {
    if (r.h < bandH * 0.3 && r.bot > by0 + bandH * 0.6 && r.w < bandH * 0.3) { text += "."; dots++; continue; }
    if (r.h < bandH * 0.6) continue; // a label or the unit, not a digit
    // every digit has ink on its right edge (b or c), while 1 and 7 have none on the left, so anchor
    // the cell on the right. A run much wider than a cell has the unit label fused on: anchor left.
    const x1 = r.w > fullW * 1.25 ? r.x0 + fullW - 1 : r.x1;
    const x0 = x1 - fullW + 1;
    const lit: string[] = [];
    for (const [name, [fx0, fy0, fx1, fy1]] of Object.entries(SEGMENTS)) {
      let on = 0, tot = 0;
      for (let y = Math.round(r.top + fy0 * (r.h - 1)); y <= Math.round(r.top + fy1 * (r.h - 1)); y++)
        for (let x = Math.round(x0 + fx0 * (fullW - 1)); x <= Math.round(x0 + fx1 * (fullW - 1)); x++) {
          if (x < 0 || x >= gwid) continue;
          on += at(x, y); tot++;
        }
      const fill = tot ? on / tot : 0;
      if (process.env.SEG_DEBUG) process.stdout.write(`${name}:${fill.toFixed(2)} `);
      if (fill >= LIT) lit.push(name);
      marginSum += Math.min(1, Math.abs(fill - LIT) / LIT); marginN++;
    }
    const key = lit.sort().join("");
    if (process.env.SEG_DEBUG) console.log("-> lit", key);
    const digit = PATTERNS[key] ?? ALT[key];
    if (digit === undefined) { text += "?"; ambiguous++; } else text += digit;
  }

  // a point before the first digit or after the last one is the unit label, not a decimal point
  text = text.replace(/^\.+|\.+$/g, "");
  dots = (text.match(/\./g) ?? []).length;
  if (!marginN) return null;
  let confidence = marginSum / marginN;
  if (ambiguous) { confidence *= 0.3; notes.push(`${ambiguous} unreadable digit(s)`); }
  if (dots !== 1) { confidence *= 0.6; notes.push(dots === 0 ? "no decimal point found" : "more than one decimal point"); }
  const digitCount = text.replace(".", "").length;
  if (digitCount < 3 || digitCount > 8) confidence *= 0.5;
  return { text, confidence: Math.round(confidence * 100) / 100, notes };
}

/** Camera tilt is the commonest problem, so try a few small counter-rotations and keep the most decisive read. */
export async function readSevenSegmentDeskewed(bytes: Buffer): Promise<SevenSegResult | null> {
  let best: SevenSegResult | null = null;
  for (const deg of [0, -3, 3, -6, 6, -9, 9]) {
    const img = deg === 0 ? bytes : await sharp(bytes).rotate().rotate(deg, { background: "#808080" }).toBuffer();
    const r = await readSevenSegment(img);
    if (r && (!best || r.confidence > best.confidence)) best = r;
    if (best && best.confidence >= 0.9) break;
  }
  return best;
}
