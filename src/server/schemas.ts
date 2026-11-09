import { z } from "zod";
import { parseGrams, parsePercent, parsePurity } from "@/domain/units";
import { PAYMENT_MODES } from "@/domain/oldgold";

/** Weights and purities arrive as the text the clerk typed, and are turned into exact integers here. */
const grams = z.string().trim().transform((s, ctx) => {
  try { return parseGrams(s); } catch (e) { ctx.addIssue({ code: "custom", message: (e as Error).message }); return z.NEVER; }
});
const gramsOrZero = z.string().trim().transform((s, ctx) => {
  if (s === "") return 0;
  try { return parseGrams(s); } catch (e) { ctx.addIssue({ code: "custom", message: (e as Error).message }); return z.NEVER; }
});
const purity = z.string().trim().transform((s, ctx) => {
  try { return parsePurity(s); } catch (e) { ctx.addIssue({ code: "custom", message: (e as Error).message }); return z.NEVER; }
});
const readingRef = z.object({ id: z.string().uuid(), confirmed: z.boolean().optional() }).nullish();
const key = z.string().uuid();
const text = (max: number) => z.string().trim().max(max);

export const loginSchema = z.object({ username: z.string().trim().min(1).max(60), password: z.string().min(1).max(100) });

export const issueSchema = z.object({
  karigarId: z.string().min(1), categoryId: z.string().min(1), jobId: z.string().nullish(), description: text(120).nullish(),
  gross: grams, purity, weightReading: readingRef, purityReading: readingRef, note: text(240).nullish(), idempotencyKey: key,
});

export const receiptLineSchema = z.object({
  subtype: z.enum(["PIECE", "SCRAP", "FILINGS"]), gross: grams, purity, huid: text(10).nullish(), itemDesc: text(120).nullish(),
  weightReading: readingRef, purityReading: readingRef,
});
export const receiveSchema = z.object({
  jobId: z.string().min(1), lines: z.array(receiptLineSchema).max(20), closeJob: z.boolean().optional(), note: text(240).nullish(), idempotencyKey: key,
});

export const karigarSchema = z.object({
  name: text(80).min(2), nameTa: text(80).nullish(), phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number").nullish().or(z.literal("")), bench: text(40).nullish(),
});
export const karigarPatchSchema = karigarSchema.partial().extend({ active: z.boolean().optional() });
export const wastageSchema = z.object({
  categoryId: z.string().min(1),
  wastage: z.string().trim().transform((s, ctx) => {
    try { return parsePercent(s); } catch (e) { ctx.addIssue({ code: "custom", message: (e as Error).message }); return z.NEVER; }
  }),
});
export const pinSchema = z.object({ pin: z.string().regex(/^\d{6}$/, "6 digits") });

export const oldGoldSchema = z.object({
  billNo: text(30).min(2), customerName: text(80).min(2), customerPhone: text(15).nullish(), gross: grams, deduction: gramsOrZero.optional().default(""), purity,
  paymentMode: z.enum(PAYMENT_MODES), pan: text(10).nullish(), weightReading: readingRef, purityReading: readingRef, idempotencyKey: key,
});
export const voidSchema = z.object({ reason: text(240).min(5) });
export const alertSchema = z.object({ status: z.enum(["REVIEWED", "EXPLAINED", "DISMISSED"]), note: text(300).default("") });
export const refinerSendSchema = z.object({ fine: grams, note: text(200).nullish(), idempotencyKey: key });
export const refinerReceiveSchema = z.object({ returned: grams, difference: gramsOrZero.optional().default(""), note: text(200).nullish(), idempotencyKey: key });
export const settingsSchema = z.object({ goldRate: z.string().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter the rate per gram in rupees") });
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
