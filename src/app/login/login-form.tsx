"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Notice } from "@/components/ui";

const DEMO = [
  { who: "Issue clerk", user: "clerk", pass: "Demo@2026", note: "Issues and receives gold, old gold desk" },
  { who: "Finance head", user: "finance", pass: "Demo@2026", note: "Everything, including stock, alerts and exports" },
  { who: "Managing partner", user: "partner", pass: "Demo@2026", note: "Read-only view of stock and alerts" },
  { who: "Karigar (Tamil view)", user: "9000000001", pass: "123456", note: "Murugesan S on his phone" },
];

export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState(""), [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: user, password: pass }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error?.message ?? "Could not sign in."); setBusy(false); return; }
      router.replace(d.user.role === "KARIGAR" ? "/me" : "/today");
      router.refresh();
    } catch {
      setErr("No connection. Check the network and try again."); setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Username or phone number" htmlFor="u"><Input id="u" autoComplete="username" autoCapitalize="none" inputMode="text" value={user} onChange={(e) => setUser(e.target.value)} required /></Field>
        <Field label="Password or PIN" htmlFor="p"><Input id="p" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} required /></Field>
        {err && <Notice tone="bad">{err}</Notice>}
        <Button type="submit" size="lg" busy={busy} className="mt-1">Sign in</Button>
      </form>
      {demo && (
        <div className="mt-9">
          <p className="mb-2 text-[13px] font-medium text-mute">Demo accounts</p>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {DEMO.map((d) => (
              <li key={d.user}>
                <button type="button" onClick={() => { setUser(d.user); setPass(d.pass); setErr(null); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sunk">
                  <span><span className="block text-[14.5px] font-medium">{d.who}</span><span className="block text-[13px] text-mute">{d.note}</span></span>
                  <span className="fig text-[12.5px] text-mute">{d.user}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] text-mute">Tap one to fill the form. Demo data only.</p>
        </div>
      )}
    </>
  );
}
