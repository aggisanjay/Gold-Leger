"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Printer } from "lucide-react";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { Tape } from "@/components/tape";
import { NO_PHOTO, PhotoCheck, type PhotoState } from "@/components/photo-check";
import { Gold } from "@/components/figures";
import { allowedMg, fineMg, formatPercentBp, PURITY_PRESETS } from "@/domain/units";
import { gramsOf, purityOf } from "@/lib/parse";
import { sendEntry } from "@/lib/offline";
import { useDraft } from "@/lib/draft";

interface Props {
  initialKarigar?: string;
  karigars: { id: string; name: string; balanceMg: number }[]; cats: { id: string; name: string; defaultBp: number }[];
  jobs: { id: string; jobNo: string; karigarId: string; categoryId: string; categoryName: string; balanceMg: number; wastageBp: number }[];
  wastage: Record<string, number>;
}
const EMPTY = { karigarId: "", categoryId: "", jobId: "", description: "", gross: "", purity: "91.60", note: "" };

export function IssueForm({ initialKarigar, karigars, cats, jobs, wastage }: Props) {
  const [f, setF, clearDraft, restored] = useDraft("issue", { ...EMPTY, karigarId: initialKarigar ?? "" });
  const [wp, setWp] = useState<PhotoState>(NO_PHOTO), [pp, setPp] = useState<PhotoState>(NO_PHOTO);
  const [busy, setBusy] = useState(false), [errors, setErrors] = useState<Record<string, string>>({}), [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<null | { slipNo: string; jobNo: string; fineMg: number; balanceMg: number } | { queued: true }>(null);
  const key = useRef("");
  useEffect(() => { key.current = crypto.randomUUID(); }, [done]);

  const k = karigars.find((x) => x.id === f.karigarId);
  const myJobs = jobs.filter((j) => j.karigarId === f.karigarId);
  const job = myJobs.find((j) => j.id === f.jobId);
  const catId = job?.categoryId ?? f.categoryId;
  const cat = cats.find((c) => c.id === catId);
  const wastageBp = job ? job.wastageBp : cat ? wastage[`${f.karigarId}:${cat.id}`] ?? cat.defaultBp : null;
  const grossMg = gramsOf(f.gross), purityBp = purityOf(f.purity);
  const fine = grossMg !== null && purityBp !== null && grossMg > 0 ? fineMg(grossMg, purityBp) : null;
  const ready = !!k && !!catId && fine !== null && fine > 0 && !wp.blocking && !pp.blocking;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !key.current) return;
    setBusy(true); setErrors({}); setMsg(null);
    const r = await sendEntry("/api/issues", {
      idempotencyKey: key.current, karigarId: f.karigarId, categoryId: catId, jobId: f.jobId || null, description: f.description || null, gross: f.gross, purity: f.purity,
      weightReading: wp.ref, purityReading: pp.ref, note: f.note || null,
    }, `Issue to ${k!.name}`);
    setBusy(false);
    if (r.ok) { clearDraft(); setDone({ slipNo: r.data.slipNo, jobNo: r.data.jobNo, fineMg: r.data.fineMg, balanceMg: r.data.karigarBalanceMg }); }
    else if (r.queued) { clearDraft(); setDone({ queued: true }); }
    else { setErrors(r.fields ?? {}); setMsg(r.message); }
  }

  if (done) {
    return (
      <div className="rise max-w-xl">
        <div className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-ok-soft text-ok"><Check className="h-5 w-5" /></div>
        {"queued" in done ? (
          <><h2 className="text-[24px]">Saved on this tablet</h2><p className="mt-2 text-ink-2">The network is down, so this issue is parked safely and will be recorded, with its slip number, as soon as the connection returns. It cannot be recorded twice.</p></>
        ) : (
          <>
            <h2 className="text-[24px]">Issued, slip {done.slipNo}</h2>
            <div className="mt-5"><Tape rows={[{ label: `Fine gold issued on ${done.jobNo}`, mg: done.fineMg }, { label: `Now with ${k?.name}`, mg: done.balanceMg, rule: true, total: true, balance: true, op: "=" }]} /></div>
            <div className="mt-5 flex flex-wrap gap-3"><Link href={`/slips/${done.slipNo}`} className="inline-flex h-12 items-center gap-2 rounded-lg bg-ink px-5 font-medium text-white"><Printer className="h-4 w-4" />Open slip</Link></div>
          </>
        )}
        <Button variant="secondary" size="lg" className="mt-3" onClick={() => { setF({ ...EMPTY }); setWp(NO_PHOTO); setPp(NO_PHOTO); setDone(null); }}>Issue more gold</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="grid content-start gap-6">
        {restored && <Notice tone="watch">Your half-finished entry from before was restored.</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Karigar" error={errors.karigarId}><Select value={f.karigarId} onChange={(e) => setF({ ...f, karigarId: e.target.value, jobId: "" })}><option value="">Choose…</option>{karigars.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
          <Field label="Job" hint="Add to an open job, or start a new one.">
            <Select value={f.jobId} onChange={(e) => setF({ ...f, jobId: e.target.value })} disabled={!k}><option value="">New job</option>{myJobs.map((j) => <option key={j.id} value={j.id}>{j.jobNo}, {j.categoryName}</option>)}</Select>
          </Field>
          {!job && <Field label="Item" hint={cat && wastageBp !== null ? <>Agreed wastage with this karigar: <span className="fig">{formatPercentBp(wastageBp)}%</span></> : undefined} error={errors.categoryId}>
            <Select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}><option value="">Choose…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
          {!job && <Field label="Description (optional)"><Input value={f.description} maxLength={120} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. temple necklace set" /></Field>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gross weight (g)" error={errors.gross} hint="Up to three decimals, as the scale shows."><Input figure inputMode="decimal" placeholder="0.000" value={f.gross} onChange={(e) => setF({ ...f, gross: e.target.value })} invalid={!!errors.gross} /></Field>
          <Field label="Purity (%)" error={errors.purity}><Input figure inputMode="decimal" placeholder="91.60" value={f.purity} onChange={(e) => setF({ ...f, purity: e.target.value })} invalid={!!errors.purity} /></Field>
        </div>
        <div className="-mt-3 flex flex-wrap gap-2" role="group" aria-label="Common purities">
          {PURITY_PRESETS.map((p) => <button type="button" key={p.label} onClick={() => setF({ ...f, purity: (p.bp / 100).toFixed(2) })} className={`h-10 rounded-full border px-4 text-[13.5px] ${purityOf(f.purity) === p.bp ? "border-ink bg-ink text-white" : "border-line-strong text-ink-2 hover:bg-sunk"}`}>{p.label} <span className="fig opacity-70">{(p.bp / 100).toFixed(2)}</span></button>)}
        </div>
        <PhotoCheck kind="WEIGHT" typed={grossMg} onState={setWp} onUse={(v) => setF({ ...f, gross: (v / 1000).toFixed(3) })} />
        <PhotoCheck kind="PURITY" typed={purityBp} onState={setPp} onUse={(v) => setF({ ...f, purity: (v / 100).toFixed(2) })} />
        <Field label="Note (optional)"><Textarea value={f.note} maxLength={240} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </div>

      <aside className="lg:sticky lg:top-[90px] lg:self-start">
        <Tape title="The working" rows={[
          { label: "Gross weight", mg: grossMg },
          { label: <>Purity <span className="fig">{f.purity || "–"}%</span></>, op: "×", value: <span className="fig text-mute">{purityBp ? "÷ 100" : ""}</span>, unit: "" },
          { label: "Fine gold to issue", mg: fine, op: "=", rule: true, total: true },
          { label: k ? `With ${k.name.split(" ")[0]} now` : "With the karigar now", mg: k?.balanceMg ?? null, rule: true, muted: true },
          { label: "This issue", mg: fine, op: "+" },
          { label: k ? `With ${k.name.split(" ")[0]} after` : "With the karigar after", mg: k && fine !== null ? k.balanceMg + fine : null, op: "=", rule: true, total: true, balance: true },
        ]} footer={wastageBp !== null && fine ? <>Agreed wastage <span className="fig">{formatPercentBp(wastageBp)}%</span> of <Gold mg={fine} /> g is <Gold mg={allowedMg(fine, wastageBp)} bold /> g.</> : "The agreed wastage appears once you choose the item."} />
        {msg && <Notice tone="bad" className="mt-4">{msg}</Notice>}
        <Button type="submit" size="lg" busy={busy} disabled={!ready} className="mt-4 w-full">Issue gold</Button>
        {!ready && <p className="mt-2 text-[13px] text-mute">{wp.blocking || pp.blocking ? "Resolve the photo check above to continue." : "Choose a karigar and item, then enter the weight and purity."}</p>}
      </aside>
    </form>
  );
}
