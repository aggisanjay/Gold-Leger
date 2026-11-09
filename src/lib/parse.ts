import { tryParseGrams, parsePurity } from "@/domain/units";
export const gramsOf = (s: string) => tryParseGrams(s.trim() || null);
export const purityOf = (s: string): number | null => { try { return parsePurity(s); } catch { return null; } };
