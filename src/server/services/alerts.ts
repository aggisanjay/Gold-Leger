import type { Transaction } from "@libsql/client";
import { all, one, run } from "../db";
import { isoNow } from "../clock";
import { ApiError, notFound } from "../errors";
import { assertRole, audit, getSettingNum, newId, type Ctx } from "./core";
import { detectDrift, type JobOutcome } from "@/domain/drift";
import { allowedMg, formatGrams, ratioBp, formatPercentBp } from "@/domain/units";

/** Closed jobs for one karigar as the drift detector sees them. */
export async function closedOutcomes(c: Transaction | import("@libsql/client").Client, karigarId: string): Promise<JobOutcome[]> {
  const rows = await all<{ job_no: string; closed_on: string; allowance_mg: number; loss_mg: number; wastage_bp: number; issued: number }>(
    c,
    `SELECT j.job_no, j.closed_on, j.allowance_mg, j.loss_mg, j.wastage_bp,
            (SELECT COALESCE(SUM(fine_mg),0) FROM txns x WHERE x.job_id = j.id AND x.kind='ISSUE' AND x.reversed_by IS NULL) AS issued
       FROM jobs j WHERE j.karigar_id = ? AND j.status = 'CLOSED' ORDER BY j.closed_on, j.job_no`,
    [karigarId],
  );
  return rows.map((r) => ({
    jobNo: r.job_no, closedOn: r.closed_on,
    actualMg: Number(r.allowance_mg) + Number(r.loss_mg),
    allowedMg: allowedMg(Number(r.issued), Number(r.wastage_bp)),
  }));
}

/** A small overshoot is something to watch; a large one is worth a proper look. */
export function excessLevel(lossMg: number, allowedMg: number): "WATCH" | "REVIEW" {
  return lossMg >= 300 || lossMg * 10 >= allowedMg ? "REVIEW" : "WATCH";
}

/** Called inside the transaction that closes a job. Raises items for review, never accusations. */
export async function evaluateAfterClose(
  t: Transaction, ctx: Ctx,
  job: { id: string; job_no: string; karigar_id: string },
  settlement: { allowanceMg: number; lossMg: number }, issuedMg: number, allowedForJobMg: number,
) {
  const k = await one<{ name: string }>(t, "SELECT name FROM karigars WHERE id = ?", [job.karigar_id]);
  const name = k?.name ?? "A karigar";
  const now = isoNow(ctx.now);

  // 1. this job ended with gold beyond the agreed allowance
  const minMg = await getSettingNum(t, "job_excess_min_mg");
  if (settlement.lossMg >= minMg) {
    const evidence = {
      jobNo: job.job_no, issuedMg, allowedMg: allowedForJobMg, allowanceMg: settlement.allowanceMg, lossMg: settlement.lossMg,
      lossPctBp: ratioBp(settlement.lossMg, issuedMg),
    };
    await run(t,
      `INSERT INTO alerts (id, kind, level, karigar_id, job_id, title, summary, evidence, status, created_at, updated_at)
       VALUES (?, 'JOB_EXCESS', ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`,
      [newId(), excessLevel(settlement.lossMg, allowedForJobMg), job.karigar_id, job.id,
        `${name}: ${formatGrams(settlement.lossMg)} g not accounted for on ${job.job_no}`,
        `After the agreed allowance of ${formatGrams(allowedForJobMg)} g, ${formatGrams(settlement.lossMg)} g of fine gold (${formatPercentBp(ratioBp(settlement.lossMg, issuedMg))}% of the issue) is not explained by the receipts. The receipts for this job may be worth a look.`,
        JSON.stringify(evidence), now, now]);
  }

  // 2. is this karigar's loss rising against their own history?
  const outcomes = await closedOutcomes(t, job.karigar_id);
  const d = detectDrift(outcomes);
  const open = await one<{ id: string }>(t, "SELECT id FROM alerts WHERE kind='DRIFT' AND karigar_id = ? AND status = 'OPEN'", [job.karigar_id]);
  if (d.level === "WATCH" || d.level === "REVIEW") {
    const recent = outcomes.slice(-d.jobsInWindow).map((o) => ({ jobNo: o.jobNo, closedOn: o.closedOn, use: o.allowedMg ? o.actualMg / o.allowedMg : 0 }));
    const earlier = outcomes.slice(0, -d.jobsInWindow).slice(-12).map((o) => ({ jobNo: o.jobNo, closedOn: o.closedOn, use: o.allowedMg ? o.actualMg / o.allowedMg : 0 }));
    const evidence = { ...d, recent, earlier };
    const title = `${name}: recent jobs are using more of the agreed allowance than usual`;
    if (open) {
      await run(t, "UPDATE alerts SET level = ?, title = ?, summary = ?, evidence = ?, updated_at = ? WHERE id = ?", [d.level, title, d.summary, JSON.stringify(evidence), now, open.id]);
    } else {
      await run(t,
        `INSERT INTO alerts (id, kind, level, karigar_id, job_id, title, summary, evidence, status, created_at, updated_at)
         VALUES (?, 'DRIFT', ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`,
        [newId(), d.level, job.karigar_id, job.id, title, d.summary, JSON.stringify(evidence), now, now]);
    }
  } else if (open && d.level === "NONE") {
    await run(t, "UPDATE alerts SET status = 'DISMISSED', note = ?, resolved_at = ?, updated_at = ? WHERE id = ?", ["Back within their usual range (closed automatically).", now, now, open.id]);
  }
}

export interface AlertRow {
  id: string; kind: "DRIFT" | "JOB_EXCESS"; level: "WATCH" | "REVIEW"; karigar_id: string; karigar_name: string; job_id: string | null;
  title: string; summary: string; evidence: any; status: "OPEN" | "REVIEWED" | "EXPLAINED" | "DISMISSED"; note: string | null;
  resolved_by_name: string | null; resolved_at: string | null; created_at: string;
}

export async function listAlerts(c: import("@libsql/client").Client, ctx: Ctx, status: "OPEN" | "CLOSED" | "ALL" = "OPEN"): Promise<AlertRow[]> {
  assertRole(ctx, ["FINANCE", "PARTNER"]);
  const where = status === "OPEN" ? "WHERE a.status = 'OPEN'" : status === "CLOSED" ? "WHERE a.status <> 'OPEN'" : "";
  const rows = await all<any>(c,
    `SELECT a.*, k.name AS karigar_name, u.name AS resolved_by_name FROM alerts a JOIN karigars k ON k.id = a.karigar_id
       LEFT JOIN users u ON u.id = a.resolved_by ${where}
       ORDER BY CASE a.level WHEN 'REVIEW' THEN 0 ELSE 1 END, a.created_at DESC`);
  return rows.map((r) => ({ ...r, evidence: JSON.parse(r.evidence) }));
}

export async function resolveAlert(ctx: Ctx, t: Transaction, id: string, status: "REVIEWED" | "EXPLAINED" | "DISMISSED", note: string) {
  assertRole(ctx, ["FINANCE", "PARTNER"]);
  if ((status === "EXPLAINED" || status === "DISMISSED") && note.trim().length < 3)
    throw new ApiError(422, "NOTE_REQUIRED", "Add a short note so the reason is on record.", { note: "Add a short note." });
  const a = await one<{ status: string }>(t, "SELECT status FROM alerts WHERE id = ?", [id]);
  if (!a) throw notFound("The alert");
  if (a.status !== "OPEN") throw new ApiError(409, "ALREADY_RESOLVED", "This item has already been reviewed.");
  const now = isoNow(ctx.now);
  await run(t, "UPDATE alerts SET status = ?, note = ?, resolved_by = ?, resolved_at = ?, updated_at = ? WHERE id = ?", [status, note.trim(), ctx.userId, now, now, id]);
  await audit(t, ctx, `ALERT_${status}`, "alert", id, { note });
}
