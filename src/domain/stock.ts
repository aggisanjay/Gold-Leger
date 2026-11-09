import type { Mg } from "./units";

/**
 * Accounts of the gold ledger. Every transaction is a set of lines that sum to zero, so gold can
 * only ever move, never appear or vanish. EXTERNAL stands for the world outside the business.
 */
export const ACCOUNTS = {
  VAULT: "VAULT", // fine bullion in the vault
  JEWELLERY: "JEWELLERY", // finished pieces received from karigars
  SCRAP: "SCRAP", // scrap, filings and old gold waiting for the refiner
  REFINER: "REFINER",
  ALLOWANCE: "ALLOWANCE", // agreed wastage written off
  LOSS: "LOSS", // wastage beyond the allowance, recorded for review
  EXTERNAL: "EXTERNAL",
} as const;

export const karigarAccount = (id: string) => `KARIGAR:${id}`;
export const isKarigarAccount = (a: string) => a.startsWith("KARIGAR:");
export const karigarIdOf = (a: string) => a.slice("KARIGAR:".length);

export interface LedgerRow { account: string; fineMg: Mg; businessDate: string }

export interface StatementRow { key: string; label: string; openingMg: Mg; inMg: Mg; outMg: Mg; closingMg: Mg }
export interface StatementSection { title: string; rows: StatementRow[]; openingMg: Mg; inMg: Mg; outMg: Mg; closingMg: Mg }
export interface Statement {
  date: string;
  sections: StatementSection[];
  totalOpeningMg: Mg;
  totalClosingMg: Mg;
  writtenOff: { allowanceMg: Mg; lossMg: Mg };
}

/** Daily stock statement as at the end of `date`. Rows are the whole ledger up to that date. */
export function buildStatement(rows: LedgerRow[], date: string, karigarNames: Record<string, string>): Statement {
  const acc = new Map<string, { opening: Mg; inn: Mg; out: Mg; closing: Mg }>();
  const slot = (a: string) => {
    let s = acc.get(a);
    if (!s) acc.set(a, (s = { opening: 0, inn: 0, out: 0, closing: 0 }));
    return s;
  };
  for (const r of rows) {
    if (r.businessDate > date || r.account === ACCOUNTS.EXTERNAL) continue;
    const s = slot(r.account);
    s.closing += r.fineMg;
    if (r.businessDate < date) s.opening += r.fineMg;
    else if (r.fineMg >= 0) s.inn += r.fineMg;
    else s.out += -r.fineMg;
  }
  const row = (key: string, label: string): StatementRow => {
    const s = acc.get(key) ?? { opening: 0, inn: 0, out: 0, closing: 0 };
    return { key, label, openingMg: s.opening, inMg: s.inn, outMg: s.out, closingMg: s.closing };
  };
  const section = (title: string, rs: StatementRow[]): StatementSection => ({
    title, rows: rs,
    openingMg: rs.reduce((a, r) => a + r.openingMg, 0), inMg: rs.reduce((a, r) => a + r.inMg, 0),
    outMg: rs.reduce((a, r) => a + r.outMg, 0), closingMg: rs.reduce((a, r) => a + r.closingMg, 0),
  });

  const karigarRows = [...acc.keys()]
    .filter(isKarigarAccount)
    .map((k) => row(k, karigarNames[karigarIdOf(k)] ?? karigarIdOf(k)))
    .filter((r) => r.closingMg !== 0 || r.inMg !== 0 || r.outMg !== 0 || r.openingMg !== 0)
    .sort((a, b) => b.closingMg - a.closingMg || a.label.localeCompare(b.label));

  const sections = [
    section("In the vault", [
      row(ACCOUNTS.VAULT, "Fine gold"), row(ACCOUNTS.JEWELLERY, "Finished jewellery"), row(ACCOUNTS.SCRAP, "Scrap, filings and old gold"),
    ]),
    section("With karigars", karigarRows),
    section("At the refiner", [row(ACCOUNTS.REFINER, "Sent for refining")]),
  ];
  return {
    date, sections,
    totalOpeningMg: sections.reduce((a, s) => a + s.openingMg, 0),
    totalClosingMg: sections.reduce((a, s) => a + s.closingMg, 0),
    writtenOff: { allowanceMg: acc.get(ACCOUNTS.ALLOWANCE)?.closing ?? 0, lossMg: acc.get(ACCOUNTS.LOSS)?.closing ?? 0 },
  };
}
