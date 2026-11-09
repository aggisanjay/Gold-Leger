/**
 * Loss drift: is this karigar losing more than they usually do?
 *
 * Deliberately a transparent statistical test, not a black box, because the finance head must be
 * able to see why an item was raised and the karigar must never be accused by a guess.
 *
 * Per closed job we take the share of the agreed allowance that was actually used:
 *      use = (allowance used + unexplained loss) / allowance
 * (so 1.00 = used exactly the agreed wastage, 0.60 = used 60% of it). This makes categories with
 * different agreed wastage directly comparable. For each karigar we compare the average of their
 * most recent jobs with their own earlier average.
 *
 * This is analytics, not accounting, so plain floats are fine here.
 */

export interface JobOutcome {
  jobNo: string;
  closedOn: string; // YYYY-MM-DD
  /** Fine gold actually lost in the job (allowance used + unexplained), in mg. */
  actualMg: number;
  /** Allowance for the job, in mg. */
  allowedMg: number;
}

export type DriftLevel = "NONE" | "WATCH" | "REVIEW" | "INSUFFICIENT";

export interface DriftResult {
  level: DriftLevel;
  jobsInBaseline: number;
  jobsInWindow: number;
  baselineUse: number;
  windowUse: number;
  /** Rise in allowance use, in percentage points of the allowance. */
  risePoints: number;
  z: number;
  rising: boolean;
  summary: string;
}

export interface DriftOptions {
  window: number; // most recent jobs compared against the rest
  minBaseline: number; // jobs needed in the baseline before we will say anything
  reviewZ: number;
  watchZ: number;
  reviewRise: number; // minimum rise (fraction of allowance) to REVIEW
  watchRise: number;
  /** Floor for the baseline spread so a very steady karigar does not make tiny moves look huge. */
  sdFloor: number;
  /** Do not raise anything unless recent use is at least this share of the allowance. */
  minWindowUse: number;
  maxBaseline: number;
}

export const DEFAULT_DRIFT: DriftOptions = {
  window: 3, minBaseline: 5, reviewZ: 2.5, watchZ: 1.5, reviewRise: 0.2, watchRise: 0.1,
  sdFloor: 0.08, minWindowUse: 0.6, maxBaseline: 12,
};

const use = (j: JobOutcome) => (j.allowedMg > 0 ? j.actualMg / j.allowedMg : 0);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

export function detectDrift(jobs: JobOutcome[], opts: Partial<DriftOptions> = {}): DriftResult {
  const o = { ...DEFAULT_DRIFT, ...opts };
  const sorted = [...jobs].filter((j) => j.allowedMg > 0).sort((a, b) => a.closedOn.localeCompare(b.closedOn) || a.jobNo.localeCompare(b.jobNo));
  const windowJobs = sorted.slice(-o.window);
  const baseline = sorted.slice(0, -o.window).slice(-o.maxBaseline);

  if (baseline.length < o.minBaseline || windowJobs.length < o.window) {
    return {
      level: "INSUFFICIENT", jobsInBaseline: baseline.length, jobsInWindow: windowJobs.length,
      baselineUse: baseline.length ? mean(baseline.map(use)) : 0, windowUse: windowJobs.length ? mean(windowJobs.map(use)) : 0,
      risePoints: 0, z: 0, rising: false,
      summary: `Not enough history yet: ${baseline.length} earlier closed jobs, ${o.minBaseline} needed.`,
    };
  }

  const b = baseline.map(use);
  const w = windowJobs.map(use);
  const baseMean = mean(b);
  const winMean = mean(w);
  const rise = winMean - baseMean;
  const se = Math.max(sd(b), o.sdFloor) / Math.sqrt(w.length);
  const z = rise / se;
  const rising = w.every((x, i) => i === 0 || x >= w[i - 1]);

  let level: DriftLevel = "NONE";
  if (winMean >= o.minWindowUse) {
    if (z >= o.reviewZ && rise >= o.reviewRise) level = "REVIEW";
    else if (z >= o.watchZ && rise >= o.watchRise) level = "WATCH";
  }

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const summary =
    level === "NONE"
      ? `Within their usual range: recent jobs used ${pct(winMean)} of the agreed allowance against ${pct(baseMean)} before.`
      : `Recent ${o.window} jobs used ${pct(winMean)} of the agreed allowance, against ${pct(baseMean)} over their ${baseline.length} earlier jobs` +
        `${rising ? ", and the figure has risen job after job" : ""}.`;

  return {
    level, jobsInBaseline: baseline.length, jobsInWindow: windowJobs.length, baselineUse: baseMean, windowUse: winMean,
    risePoints: Math.round(rise * 100), z: Math.round(z * 10) / 10, rising, summary,
  };
}
