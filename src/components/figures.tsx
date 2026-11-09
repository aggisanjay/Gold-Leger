import { formatGrams, formatPercentBp, formatPurity, formatRupees } from "@/domain/units";
import { cn } from "@/lib/cn";

/** A weight in grams, always three decimals. Negative values are red and carry a real minus sign. */
export function Gold({ mg, plus, bold, balance, className }: { mg: number | null | undefined; plus?: boolean; bold?: boolean; balance?: boolean; className?: string }) {
  if (mg === null || mg === undefined) return <span className={cn("fig text-mute", className)}>&ndash;</span>;
  return <span className={cn("fig", mg < 0 && "fig-neg", bold && "font-semibold", balance && "balance", className)}>{formatGrams(mg, { plus })}</span>;
}
export function Purity({ bp, className }: { bp: number | null | undefined; className?: string }) {
  return <span className={cn("fig", className)}>{bp === null || bp === undefined ? "–" : formatPurity(bp)}</span>;
}
export function Pct({ bp, className }: { bp: number; className?: string }) {
  return <span className={cn("fig", className)}>{formatPercentBp(bp)}%</span>;
}
export function Rupees({ paise, className, decimals }: { paise: number; className?: string; decimals?: boolean }) {
  return <span className={cn("fig", className)}>{formatRupees(paise, { decimals })}</span>;
}
