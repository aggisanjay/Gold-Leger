import { allowedMg, ratioBp, type Bp, type Mg } from "./units";

/**
 * The position of one job: what went out, what has come back, and what is still unaccounted for.
 *
 * "Every gram that leaves the vault must come back as jewellery, scrap, filings or an agreed
 * allowance." The balance is gold still with the karigar for this job. The allowance is only
 * applied when the job is closed.
 */
export interface JobPosition {
  issuedFineMg: Mg;
  pieceFineMg: Mg;
  scrapFineMg: Mg;
  filingsFineMg: Mg;
  recoveredFineMg: Mg;
  /** issued - recovered. Gold still to be accounted for. */
  balanceMg: Mg;
  allowedMg: Mg;
  /** Balance above the allowance (what would be flagged if the job closed now). */
  overAllowanceMg: Mg;
  /** Balance as a share of issued, in basis points. */
  actualWastageBp: number;
}

export function jobPosition(input: {
  issuedFineMg: Mg; pieceFineMg: Mg; scrapFineMg: Mg; filingsFineMg: Mg; wastageBp: Bp;
}): JobPosition {
  const recovered = input.pieceFineMg + input.scrapFineMg + input.filingsFineMg;
  const balance = input.issuedFineMg - recovered;
  const allowed = allowedMg(input.issuedFineMg, input.wastageBp);
  return {
    issuedFineMg: input.issuedFineMg,
    pieceFineMg: input.pieceFineMg,
    scrapFineMg: input.scrapFineMg,
    filingsFineMg: input.filingsFineMg,
    recoveredFineMg: recovered,
    balanceMg: balance,
    allowedMg: allowed,
    overAllowanceMg: Math.max(0, balance - allowed),
    actualWastageBp: ratioBp(Math.max(0, balance), input.issuedFineMg),
  };
}

export interface Settlement {
  /** Written off against the agreed allowance. */
  allowanceMg: Mg;
  /** Beyond the allowance: recorded as unexplained loss for review. */
  lossMg: Mg;
}

export class SettlementError extends Error {}

/** Closing a job clears its balance: first into the allowance, any remainder into flagged loss. */
export function settleJob(p: JobPosition): Settlement {
  if (p.balanceMg < 0) {
    throw new SettlementError(
      "More fine gold has been returned than was issued for this job. Check the receipts before closing.",
    );
  }
  return {
    allowanceMg: Math.min(p.balanceMg, p.allowedMg),
    lossMg: Math.max(0, p.balanceMg - p.allowedMg),
  };
}
