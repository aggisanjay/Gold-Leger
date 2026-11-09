"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Notice } from "@/components/ui";
import { callApi } from "@/lib/api-client";
import { Pct } from "@/components/figures";

export function NewKarigar() {
  const router = useRouter();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", nameTa: "", phone: "", bench: "" });
  if (!open) return <Button onClick={() => setOpen(true)}>Add karigar</Button>;
  return (
    <form className="grid w-full gap-3 rounded-xl border border-line-strong p-4 sm:w-[420px]" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      const r = await callApi("/api/karigars", "POST", { name: f.name, nameTa: f.nameTa || null, phone: f.phone || "", bench: f.bench || null });
      setBusy(false);
      if (!r.ok) return setErr(Object.values(r.fields ?? {})[0] ?? r.message);
      router.push(`/karigars/${r.data.id}`);
    }}>
      <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
      <Field label="Name in Tamil (shown on their phone)"><Input value={f.nameTa} onChange={(e) => setF({ ...f, nameTa: e.target.value })} lang="ta" /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Mobile"><Input inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field><Field label="Bench"><Input value={f.bench} onChange={(e) => setF({ ...f, bench: e.target.value })} /></Field></div>
      {err && <Notice tone="bad">{err}</Notice>}
      <div className="flex gap-2"><Button type="submit" busy={busy}>Save karigar</Button><Button type="button" variant="quiet" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  );
}

export function WastageEditor({ karigarId, rows, canEdit }: { karigarId: string; canEdit: boolean; rows: { categoryId: string; name: string; nameTa: string | null; defaultBp: number; agreedBp: number | null }[] }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(rows.map((r) => [r.categoryId, ((r.agreedBp ?? r.defaultBp) / 100).toFixed(2)])));
  const [msg, setMsg] = useState<Record<string, string>>({});
  async function save(id: string) {
    const r = await callApi(`/api/karigars/${karigarId}/wastage`, "PUT", { categoryId: id, wastage: vals[id] });
    setMsg((m) => ({ ...m, [id]: r.ok ? "Saved" : (r.fields && Object.values(r.fields)[0]) || r.message }));
    if (r.ok) router.refresh();
  }
  return (
    <div className="overflow-x-auto"><table className="tbl">
      <thead><tr><th>Item</th><th className="num">Workshop default</th><th className="num">Agreed with this karigar</th>{canEdit && <th />}</tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.categoryId}>
          <td>{r.name}{r.nameTa && <span className="ml-2 text-[12.5px] text-mute">{r.nameTa}</span>}</td>
          <td className="num text-mute"><Pct bp={r.defaultBp} /></td>
          <td className="num">{canEdit ? <span className="inline-flex items-center gap-2"><input aria-label={`Agreed wastage for ${r.name}`} inputMode="decimal" value={vals[r.categoryId]} onChange={(e) => setVals({ ...vals, [r.categoryId]: e.target.value })} className="fig h-10 w-24 rounded-lg border border-line-strong px-2 text-right" />%</span> : <Pct bp={r.agreedBp ?? r.defaultBp} />}</td>
          {canEdit && <td className="whitespace-nowrap text-right"><span className={`mr-3 text-[13px] ${msg[r.categoryId] === "Saved" ? "text-ok" : "text-bad"}`}>{msg[r.categoryId]}</span><Button variant="secondary" onClick={() => save(r.categoryId)}>Save</Button></td>}
        </tr>))}</tbody>
    </table></div>
  );
}

export function PinForm({ karigarId, hasPhone }: { karigarId: string; hasPhone: boolean }) {
  const [pin, setPin] = useState(""), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null), [busy, setBusy] = useState(false);
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await callApi(`/api/karigars/${karigarId}/pin`, "POST", { pin }); setBusy(false); setMsg(r.ok ? { ok: true, t: "PIN saved. They sign in with their phone number and this PIN." } : { ok: false, t: r.message }); if (r.ok) setPin(""); }}>
      <Field label="Set a 6-digit PIN" hint={hasPhone ? "Their login is their mobile number." : "Add their mobile number first."}><Input inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className="w-44 fig" disabled={!hasPhone} /></Field>
      <Button type="submit" variant="secondary" busy={busy} disabled={pin.length !== 6} className="h-12">Save PIN</Button>
      {msg && <p className={`pb-3 text-[13.5px] ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.t}</p>}
    </form>
  );
}
