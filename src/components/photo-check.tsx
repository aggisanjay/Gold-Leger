"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { formatGrams, formatPurity } from "@/domain/units";
import { cn } from "@/lib/cn";
import { Notice } from "./ui";

export interface Reading { id: string; status: "READ" | "UNSURE" | "UNREADABLE"; value: number | null; rawText: string; confidence: number; reason: string; engine: string }
export interface PhotoState { ref: { id: string; confirmed: boolean } | null; blocking: boolean }
export const NO_PHOTO: PhotoState = { ref: null, blocking: false };

/**
 * A photo of the scale display (or karat slip) shown beside what the machine read from it.
 * A clear reading that differs from the typed value blocks saving; an unclear one needs the clerk
 * to confirm by eye. The server enforces the same rules again, so this is guidance, not the guard.
 */
export function PhotoCheck({ kind, typed, onState, onUse }: { kind: "WEIGHT" | "PURITY"; typed: number | null; onState: (s: PhotoState) => void; onUse: (value: number) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null), [confirmed, setConfirmed] = useState(false), [online, setOnline] = useState(true);
  useEffect(() => { setOnline(navigator.onLine); const a = () => setOnline(true), b = () => setOnline(false); window.addEventListener("online", a); window.addEventListener("offline", b); return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); }; }, []);

  const fmt = (v: number) => (kind === "WEIGHT" ? `${formatGrams(v)} g` : `${formatPurity(v)} %`);
  const clear = reading?.status === "READ" && reading.value !== null;
  const mismatch = clear && typed !== null && typed !== reading!.value;
  const blocking = !!reading && (clear ? mismatch : !confirmed);

  useEffect(() => { onState(reading ? { ref: { id: reading.id, confirmed }, blocking } : NO_PHOTO); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reading?.id, confirmed, blocking]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true); setErr(null); setReading(null); setConfirmed(false);
    setPreview((p) => { if (p) URL.revokeObjectURL(p); return URL.createObjectURL(file); });
    const fd = new FormData(); fd.append("file", file); fd.append("kind", kind);
    try {
      const r = await fetch("/api/readings", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error?.message ?? "The photo could not be checked."); setPreview(null); } else setReading(d.reading);
    } catch { setErr("No connection. The entry can still be saved without a photo."); setPreview(null); }
    setBusy(false);
  }

  if (!online) return <p className="text-[13px] text-mute">Photo check needs a connection. You can still save without one.</p>;

  return (
    <div className="grid gap-2">
      <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} aria-label={kind === "WEIGHT" ? "Photo of the scale display" : "Photo of the karat slip"} />
      {!preview ? (
        <button type="button" onClick={() => input.current?.click()} className="flex h-11 items-center gap-2 self-start rounded-lg border border-dashed border-line-strong px-4 text-[14px] text-ink-2 hover:bg-sunk">
          <Camera className="h-4 w-4" />{kind === "WEIGHT" ? "Check with a photo of the scale" : "Check with a photo of the karat slip"}
        </button>
      ) : (
        <div className={cn("grid grid-cols-[116px_1fr] gap-4 rounded-xl border p-3", blocking ? "border-bad/40 bg-bad-soft/50" : "border-line bg-paper")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your photo" className="h-[88px] w-full rounded-md object-cover" />
          <div className="min-w-0">
            {busy ? <div className="skeleton h-14" aria-label="Reading the photo" /> : reading && (
              <>
                <p className="text-[12.5px] text-mute">{reading.status === "READ" ? "The photo reads" : reading.status === "UNSURE" ? "Not sure, the photo might read" : "Could not read the photo"}</p>
                <p className="fig text-[22px] font-semibold leading-tight">{reading.value !== null && reading.status !== "UNREADABLE" ? fmt(reading.value) : "–"}</p>
                {clear && typed !== null && <p className={cn("mt-1 text-[13.5px] font-medium", mismatch ? "text-bad" : "text-ok")}>{mismatch ? `You typed ${fmt(typed)}. These do not match.` : "Matches what you typed."}</p>}
                {clear && mismatch && <button type="button" className="mt-1 text-[13.5px] underline" onClick={() => onUse(reading!.value!)}>Use the photo's value</button>}
              </>
            )}
            <button type="button" onClick={() => input.current?.click()} className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-ink"><RefreshCw className="h-3.5 w-3.5" />Take another photo</button>
          </div>
        </div>
      )}
      {reading && !clear && (
        <Notice tone="watch" title={reading.reason || "The photo could not be read reliably."}>
          <label className="mt-1 flex cursor-pointer items-start gap-2.5"><input type="checkbox" className="mt-1 h-4 w-4" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>I looked at the {kind === "WEIGHT" ? "display" : "slip"} myself and what I typed is correct.</span></label>
        </Notice>
      )}
      {mismatch && <Notice tone="bad" title="Saving is blocked until the photo and the number agree.">Check the {kind === "WEIGHT" ? "display" : "slip"}, then correct what you typed or take the photo again.</Notice>}
      {err && <Notice tone="bad">{err}</Notice>}
    </div>
  );
}
