const TZ = "Asia/Kolkata";
export const fmtDate = (d: string | Date) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(typeof d === "string" ? new Date(`${d.length === 10 ? d + "T12:00:00+05:30" : d}`) : d);
export const fmtDay = (d: string) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${d}T12:00:00+05:30`));
export const fmtTime = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(iso));
export const fmtMonth = (ym: string) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, month: "short" }).format(new Date(`${ym}-15T12:00:00+05:30`));
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const KIND_LABEL: Record<string, string> = {
  ISSUE: "Issue", RECEIPT: "Receipt", ALLOWANCE: "Agreed wastage", LOSS: "Beyond allowance", OLD_GOLD: "Old gold", TO_REFINER: "To refiner", FROM_REFINER: "From refiner", REVERSAL: "Reversal", OPENING: "Gold received",
};
export const SUBTYPE_LABEL: Record<string, string> = { PIECE: "Finished piece", SCRAP: "Scrap", FILINGS: "Filings" };
