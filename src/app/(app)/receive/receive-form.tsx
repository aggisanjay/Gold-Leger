"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Plus, Printer, X } from "lucide-react";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { Tape, type TapeRow } from "@/components/tape";
import { NO_PHOTO, PhotoCheck, type PhotoState } from "@/components/photo-check";
import { Gold } from "@/components/figures";
import { fineMg, formatGrams, formatPercentBp } from "@/domain/units";
import { jobPosition, settleJob, SettlementError } from "@/domain/settlement";
import { isHuid } from "@/domain/validators";
import { gramsOf, purityOf } from "@/lib/parse";
import { sendEntry } from "@/lib/offline";
import { useDraft } from "@/lib/draft";

interface JobLite { id: string; jobNo: string; karigarId: string; karigarName: string; categoryName: string; wastageBp: number; purityBp: number; issuedMg: number; pieceMg: number; scrapMg: number; filingsMg: number }
type Sub = "PIECE" | "SCRAP" | "FILINGS";
interface Line { key: string; subtype: Sub; gross: string; purity: string; huid: string; itemDesc: string }
const newLine = (purity = "91.60", subtype: Sub = "PIECE"): Line => ({ key: Math.random().toString(36).slice(2), subtype, gross: "", purity, huid: "", itemDesc: "" });
const LABEL: Record<Sub, string> = { PIECE: "Finished piece", SCRAP: "Scrap", FILINGS: "Filings" };

export function ReceiveForm({ jobs, initialJob }: { jobs: JobLite[]; initialJob?: string }) {
  const [s, setS, clearDraft, restored] = useDraft("receive", { jobId: initialJob ?? "", lines: [newLine()], close: false });
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const [busy, setBusy] = useState(false), [errors, setErrors] = useState<Record<string, string>>({}), [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<null | { slipNo: string; balanceMg: number; closed: { allowanceMg: number; lossMg: number } | null; jobNo: string } | { queued: true }>(null);
  const key = useRef("");
  useEffect(() => { key.current = crypto.randomUUID(); }, [done]);
  useEffect(() => { if (initialJob && !s.jobId) setS((p) => ({ ...p, jobId: initialJob })); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [initialJob]);

  const job = jobs.find((j) => j.id === s.jobId);
  const parsed = s.lines.map((l) => {
    const g = gramsOf(l.gross), p = purityOf(l.purity);
    const fine = g && p ? fineMg(g, p) : null;
    return { ...l, g, p, fine, huidOk: l.subtype !== "PIECE" || isHuid(l.huid) };
  });
  const added = { PIECE: 0, SCRAP: 0, FILINGS: 0 };
  for (const l of parsed) if (l.fine) added[l.subtype] += l.fine;
  const pos = job ? jobPosition({ issuedFineMg: job.issuedMg, pieceFineMg: job.pieceMg + added.PIECE, scrapFineMg: job.scrapMg + added.SCRAP, filingsFineMg: job.filingsMg + added.FILINGS, wastageBp: job.wastageBp }) : null;
  const over = !!pos && pos.balanceMg < 0;
  let settle: { allowanceMg: number; lossMg: number } | null = null;
  if (pos && s.close) { try { settle = settleJob(pos); } catch (e) { if (!(e instanceof SettlementError)) throw e; } }
  const anyBlocking = Object.values(photos).some((p) => p.blocking);
  const linesOk = parsed.every((l) => l.fine && l.fine > 0 && l.huidOk) && parsed.length > 0;
  const ready = !!job && (linesOk || (s.close && parsed.every((l) => !l.gross))) && !over && !anyBlocking;

  const setLine = (k: string, patch: Partial<Line>) => setS((p) => ({ ...p, lines: p.lines.map((l) => (l.key === k ? { ...l, ...patch } : l)) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !key.current || !job) return;
    setBusy(true); setErrors({}); setMsg(null);
    const lines = parsed.filter((l) => l.gross).map((l) => ({
      subtype: l.subtype, gross: l.gross, purity: l.purity, huid: l.subtype === "PIECE" ? l.huid : null, itemDesc: l.itemDesc || null,
      weightReading: photos[l.key]?.ref ?? null, purityReading: null,
    }));
    const r = await sendEntry("/api/receipts", { idempotencyKey: key.current, jobId: job.id, lines, closeJob: s.close }, `Receipt from ${job.karigarName}`);
    setBusy(false);
    if (r.ok) { clearDraft(); setDone({ slipNo: r.data.slipNo, balanceMg: r.data.karigarBalanceMg, closed: r.data.closed, jobNo: job.jobNo }); }
    else if (r.queued) { clearDraft(); setDone({ queued: true }); }
    else { setErrors(r.fields ?? {}); setMsg(r.message); }
  }

  if (done) {
    return (
      <div className="rise max-w-xl">
        <div className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-ok-soft text-ok"><Check className="h-5 w-5" /></div>
        {"queued" in done ? <><h2 className="text-[24px]">Saved on this tablet</h2><p className="mt-2 text-ink-2">It will be recorded as soon as the network returns, and cannot be recorded twice.</p></> : (
          <>
            <h2 className="text-[24px]">{done.closed ? `${done.jobNo} closed` : "Received"}{done.slipNo ? `, slip ${done.slipNo}` : ""}</h2>
            {done.closed ? (
              <div className="mt-5"><Tape rows={[{ label: "Written off as agreed wastage", mg: done.closed.allowanceMg }, { label: "Beyond the allowance, for review", mg: done.closed.lossMg, tone: done.closed.lossMg > 0 ? "review" : undefined }, { label: "Still with the karigar from this job", mg: 0, op: "=", rule: true, total: true }]} /></div>
            ) : <p className="mt-2 text-ink-2">Gold still with the karigar for this job: <Gold mg={done.balanceMg} balance /> g.</p>}
            {done.slipNo && <Link href={`/slips/${done.slipNo}`} className="mt-5 inline-flex h-12 items-center gap-2 rounded-lg bg-ink px-5 font-medium text-white"><Printer className="h-4 w-4" />Open slip</Link>}
          </>
        )}
        <div className="mt-3"><Button variant="secondary" size="lg" onClick={() => { setS({ jobId: "", lines: [newLine()], close: false }); setPhotos({}); setDone(null); }}>Receive more</Button></div>
      </div>
    );
  }

  const rows: TapeRow[] = pos ? [
    { label: "Issued on this job, fine", mg: pos.issuedFineMg },
    { label: "Finished pieces", mg: pos.pieceFineMg, op: "−" }, { label: "Scrap", mg: pos.scrapFineMg, op: "−" }, { label: "Filings", mg: pos.filingsFineMg, op: "−" },
    { label: "Still with the karigar", mg: pos.balanceMg, op: "=", rule: true, total: true, balance: true },
    { label: <>Allowed wastage <span className="fig">{formatPercentBp(job!.wastageBp)}%</span></>, mg: pos.allowedMg, rule: true, muted: true },
    pos.balanceMg > pos.allowedMg
      ? { label: "Above the allowance so far", mg: pos.overAllowanceMg, tone: "review", note: "Filings still to come may bring this down." }
      : { label: "Within the allowance", mg: pos.allowedMg - Math.max(0, pos.balanceMg), tone: "ok", note: "Allowance remaining." },
  ] : [];

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="grid content-start gap-6">
        {restored && <Notice tone="watch">Your half-finished entry from before was restored.</Notice>}
        <Field label="Job"><Select value={s.jobId} onChange={(e) => { const j = jobs.find((x) => x.id === e.target.value); setS((p) => ({ ...p, jobId: e.target.value, lines: p.lines.map((l) => ({ ...l, purity: j ? (j.purityBp / 100).toFixed(2) : l.purity })) })); }}>
          <option value="">Choose the job coming back…</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.karigarName}, {j.jobNo}, {j.categoryName}</option>)}</Select></Field>

        {job && s.lines.map((l, i) => {
          const p = parsed[i];
          return (
            <fieldset key={l.key} className="grid gap-4 rounded-xl border border-line p-4 sm:p-5">
              <legend className="sr-only">Item {i + 1}</legend>
              <div className="flex items-center justify-between">
                <div role="radiogroup" aria-label="What is coming back" className="inline-flex overflow-hidden rounded-lg border border-line-strong">
                  {(["PIECE", "SCRAP", "FILINGS"] as Sub[]).map((t) => <button key={t} type="button" role="radio" aria-checked={l.subtype === t} onClick={() => setLine(l.key, { subtype: t })} className={`h-10 px-3.5 text-[14px] ${l.subtype === t ? "bg-ink text-white" : "text-ink-2 hover:bg-sunk"}`}>{LABEL[t]}</button>)}
                </div>
                {s.lines.length > 1 && <button type="button" aria-label="Remove this item" onClick={() => setS((x) => ({ ...x, lines: x.lines.filter((y) => y.key !== l.key) }))} className="grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-sunk"><X className="h-4 w-4" /></button>}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={l.subtype === "PIECE" ? "Net weight (g)" : "Weight (g)"} error={errors[`lines.${i}.gross`]}><Input figure inputMode="decimal" placeholder="0.000" value={l.gross} onChange={(e) => setLine(l.key, { gross: e.target.value })} /></Field>
                <Field label="Purity (%)"><Input figure inputMode="decimal" value={l.purity} onChange={(e) => setLine(l.key, { purity: e.target.value })} /></Field>
                {l.subtype === "PIECE" && <Field label="HUID" error={errors[`lines.${i}.huid`] ?? (l.huid && !p.huidOk ? "6 letters or digits" : null)}><Input value={l.huid} maxLength={6} autoCapitalize="characters" className="fig uppercase" placeholder="A1B2C3" onChange={(e) => setLine(l.key, { huid: e.target.value.toUpperCase() })} /></Field>}
              </div>
              {l.subtype === "PIECE" && <Field label="Piece (optional)"><Input value={l.itemDesc} maxLength={120} onChange={(e) => setLine(l.key, { itemDesc: e.target.value })} placeholder="e.g. necklace" /></Field>}
              <PhotoCheck kind="WEIGHT" typed={p.g} onState={(st) => setPhotos((x) => ({ ...x, [l.key]: st }))} onUse={(v) => setLine(l.key, { gross: (v / 1000).toFixed(3) })} />
              {p.fine !== null && <p className="text-[13.5px] text-mute">Fine gold in this {LABEL[l.subtype].toLowerCase()}: <Gold mg={p.fine} bold className="text-ink" /> g</p>}
            </fieldset>
          );
        })}
        {job && <Button type="button" variant="secondary" className="self-start" onClick={() => setS((p) => ({ ...p, lines: [...p.lines, newLine(job ? (job.purityBp / 100).toFixed(2) : "91.60", "SCRAP")] }))}><Plus className="h-4 w-4" />Add another item</Button>}

        {job && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={s.close} onChange={(e) => setS((p) => ({ ...p, close: e.target.checked }))} />
            <span><span className="block font-medium">This is everything. Close the job and settle it.</span><span className="block text-[13.5px] text-mute">The agreed wastage is written off, and anything beyond it is recorded for review. A closed job cannot be changed.</span></span>
          </label>
        )}
      </div>

      <aside className="lg:sticky lg:top-[90px] lg:self-start">
        {job ? <Tape title={`${job.karigarName}, ${job.jobNo}`} rows={rows} footer={s.close ? (settle ? <>On closing, <Gold mg={settle.allowanceMg} bold /> g is written off as agreed wastage{settle.lossMg > 0 ? <>, and <Gold mg={settle.lossMg} bold className="text-review" /> g beyond it goes to the finance head for review</> : ", and nothing is beyond the allowance"}.</> : <span className="text-bad">This job cannot be closed yet.</span>) : undefined} />
          : <div className="tape text-[14px] text-mute">Choose a job to see what is still out, and the allowed and actual wastage.</div>}
        {over && <Notice tone="bad" className="mt-4" title="More fine gold than was issued">That would return {formatGrams(-pos!.balanceMg)} g more than went out. Check the weights and purity.</Notice>}
        {msg && <Notice tone="bad" className="mt-4">{msg}</Notice>}
        <Button type="submit" size="lg" busy={busy} disabled={!ready} className="mt-4 w-full">{s.close ? "Save and close job" : "Save receipt"}</Button>
        {anyBlocking && <p className="mt-2 text-[13px] text-mute">Resolve the photo check above to continue.</p>}
      </aside>
    </form>
  );
}
