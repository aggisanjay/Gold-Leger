"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { Tape } from "@/components/tape";
import { NO_PHOTO, PhotoCheck, type PhotoState } from "@/components/photo-check";
import { assessOldGold, PAYMENT_MODES, type PaymentMode } from "@/domain/oldgold";
import { formatPurity, formatRupees } from "@/domain/units";
import { gramsOf, purityOf } from "@/lib/parse";
import { sendEntry } from "@/lib/offline";
import { callApi } from "@/lib/api-client";
import { useDraft } from "@/lib/draft";
import { Rupees } from "@/components/figures";

const MODE: Record<PaymentMode, string> = { CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque", ADJUSTED_IN_BILL: "Adjusted in the bill" };
const EMPTY = { billNo: "", customerName: "", customerPhone: "", gross: "", deduction: "", purity: "", paymentMode: "UPI" as PaymentMode, pan: "" };

export function OldGoldForm({ ratePaise, panThresholdPaise, cashLimitPaise }: { ratePaise: number; panThresholdPaise: number; cashLimitPaise: number }) {
  const router = useRouter();
  const [f, setF, clear, restored] = useDraft("oldgold", EMPTY);
  const [wp, setWp] = useState<PhotoState>(NO_PHOTO), [pp, setPp] = useState<PhotoState>(NO_PHOTO);
  const [busy, setBusy] = useState(false), [errors, setErrors] = useState<Record<string, string>>({}), [msg, setMsg] = useState<string | null>(null), [ok, setOk] = useState<string | null>(null);
  const key = useRef("");
  useEffect(() => { key.current = crypto.randomUUID(); }, [ok]);

  const gross = gramsOf(f.gross), ded = gramsOf(f.deduction) ?? 0, purity = purityOf(f.purity);
  const a = gross && purity ? assessOldGold({ grossMg: gross, deductionMg: ded, purityBp: purity, ratePaisePerGram: ratePaise, paymentMode: f.paymentMode, pan: f.pan, rules: { panThresholdPaise, cashLimitPaise } }) : null;
  const ruleErr = (field: string) => a?.errors.find((e) => e.field === field)?.message;
  const ready = !!a && a.fineMg > 0 && a.errors.length === 0 && f.billNo.trim().length >= 2 && f.customerName.trim().length >= 2 && !wp.blocking && !pp.blocking;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!ready) return;
    setBusy(true); setErrors({}); setMsg(null);
    const r = await sendEntry("/api/old-gold", { idempotencyKey: key.current, billNo: f.billNo, customerName: f.customerName, customerPhone: f.customerPhone || null, gross: f.gross, deduction: f.deduction, purity: f.purity, paymentMode: f.paymentMode, pan: f.pan || null, weightReading: wp.ref, purityReading: pp.ref }, `Old gold, bill ${f.billNo}`);
    setBusy(false);
    if (r.ok) { clear(); setOk(`Recorded as ${r.data.purchaseNo} against bill ${r.data.billNo}.`); setF(EMPTY); setWp(NO_PHOTO); setPp(NO_PHOTO); router.refresh(); }
    else if (r.queued) { clear(); setOk("Saved on this tablet. It will be recorded when the network returns."); setF(EMPTY); }
    else { setErrors(r.fields ?? {}); setMsg(r.message); }
  }

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="grid content-start gap-5">
        {ok && <Notice tone="ok" title={ok} />}
        {restored && <Notice tone="watch">Your half-finished entry from before was restored.</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Exchange bill number" error={errors.billNo} hint="Old gold is recorded once per bill."><Input value={f.billNo} onChange={(e) => setF({ ...f, billNo: e.target.value.toUpperCase() })} className="fig" placeholder="EX-2611-0417" /></Field>
          <Field label="Customer name" error={errors.customerName}><Input value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} /></Field>
          <Field label="Gross weight (g)" error={errors.gross}><Input figure inputMode="decimal" placeholder="0.000" value={f.gross} onChange={(e) => setF({ ...f, gross: e.target.value })} /></Field>
          <Field label="Deductions, stones and dirt (g)" error={ruleErr("deduction") ?? errors.deduction}><Input figure inputMode="decimal" placeholder="0.000" value={f.deduction} onChange={(e) => setF({ ...f, deduction: e.target.value })} /></Field>
        </div>
        <PhotoCheck kind="WEIGHT" typed={gross} onState={setWp} onUse={(v) => setF({ ...f, gross: (v / 1000).toFixed(3) })} />
        <Field label="Tested purity (%)" error={errors.purity} hint="From the karat meter."><Input figure inputMode="decimal" placeholder="91.62" value={f.purity} onChange={(e) => setF({ ...f, purity: e.target.value })} /></Field>
        <PhotoCheck kind="PURITY" typed={purity} onState={setPp} onUse={(v) => setF({ ...f, purity: (v / 100).toFixed(2) })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paid by" error={ruleErr("paymentMode") ?? errors.paymentMode}><Select value={f.paymentMode} onChange={(e) => setF({ ...f, paymentMode: e.target.value as PaymentMode })} invalid={!!ruleErr("paymentMode")}>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{MODE[m]}</option>)}</Select></Field>
          <Field label={a?.panRequired ? "Customer's PAN (required)" : "Customer's PAN (optional)"} error={ruleErr("pan") ?? errors.pan} hint={a?.panRequired ? `Required at ${formatRupees(panThresholdPaise, { decimals: false })} and above.` : undefined}><Input value={f.pan} maxLength={10} className="fig uppercase" placeholder="ABCDE1234F" onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} invalid={!!ruleErr("pan")} /></Field>
        </div>
        <Field label="Customer's mobile (optional)"><Input inputMode="numeric" value={f.customerPhone} onChange={(e) => setF({ ...f, customerPhone: e.target.value })} /></Field>
      </div>
      <aside className="lg:sticky lg:top-[90px] lg:self-start">
        <Tape title="The working" rows={[
          { label: "Gross weight", mg: gross }, { label: "Deductions", mg: gross ? ded : null, op: "−" },
          { label: "Net weight", mg: a?.netMg ?? null, op: "=", rule: true },
          { label: <>Purity <span className="fig">{purity ? formatPurity(purity) : "–"}%</span></>, op: "×", value: "", unit: "" },
          { label: "Fine gold", mg: a?.fineMg ?? null, op: "=", rule: true, total: true },
          { label: <>Rate per gram</>, op: "×", value: <Rupees paise={ratePaise} decimals={false} />, unit: "" },
          { label: "Value", op: "=", rule: true, total: true, value: <span className="fig font-semibold text-[17px]">{a ? formatRupees(a.valuePaise) : "–"}</span>, unit: "" },
        ]} />
        {msg && <Notice tone="bad" className="mt-4">{msg}</Notice>}
        <Button type="submit" size="lg" busy={busy} disabled={!ready} className="mt-4 w-full"><Check className="h-4 w-4" />Record old gold</Button>
      </aside>
    </form>
  );
}

export function VoidOldGold({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [reason, setReason] = useState(""), [err, setErr] = useState<string | null>(null);
  if (!open) return <button className="text-[13.5px] text-mute underline-offset-4 hover:underline" onClick={() => setOpen(true)}>Void</button>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input aria-label="Reason" className="h-9 w-48 rounded-md border border-line-strong px-2 text-[13.5px]" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button className="rounded-md bg-ink px-3 py-1.5 text-[13px] text-white disabled:opacity-40" disabled={reason.trim().length < 5} onClick={async () => { const r = await callApi(`/api/old-gold/${id}/void`, "POST", { reason }); if (r.ok) router.refresh(); else setErr(r.message); }}>Confirm</button>
      <button className="text-[13px] text-mute" onClick={() => setOpen(false)}>Cancel</button>{err && <span className="text-[12.5px] text-bad">{err}</span>}
    </span>
  );
}
