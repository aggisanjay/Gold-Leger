"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { callApi } from "@/lib/api-client";

export function AlertActions({ id }: { id: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "EXPLAINED" | "DISMISSED">(null), [note, setNote] = useState(""), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  async function send(status: "REVIEWED" | "EXPLAINED" | "DISMISSED") {
    setBusy(true); setErr(null);
    const r = await callApi(`/api/alerts/${id}`, "PATCH", { status, note });
    setBusy(false);
    if (r.ok) router.refresh(); else setErr(r.message);
  }
  return (
    <div className="mt-4">
      {!mode ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" busy={busy} onClick={() => send("REVIEWED")}>Mark reviewed</Button>
          <Button variant="quiet" onClick={() => setMode("EXPLAINED")}>Explained…</Button>
          <Button variant="quiet" onClick={() => setMode("DISMISSED")}>Dismiss…</Button>
        </div>
      ) : (
        <div className="grid max-w-xl gap-2">
          <Textarea aria-label="Note" placeholder={mode === "EXPLAINED" ? "What explains it? For example a casting defect checked with the bench." : "Why is this not a concern?"} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2"><Button onClick={() => send(mode)} busy={busy} disabled={note.trim().length < 3}>{mode === "EXPLAINED" ? "Save as explained" : "Dismiss"}</Button><Button variant="quiet" onClick={() => setMode(null)}>Cancel</Button></div>
        </div>
      )}
      {err && <p className="mt-2 text-[13.5px] text-bad">{err}</p>}
    </div>
  );
}
