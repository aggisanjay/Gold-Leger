"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Button, Field, Input, Notice } from "@/components/ui";
import { callApi } from "@/lib/api-client";
import { sendEntry } from "@/lib/offline";
import { Rupees } from "@/components/figures";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="gap-2">
      <Printer className="h-4 w-4" />
      <span>Print</span>
    </Button>
  );
}

export function DatePickerForm({ currentDate }: { currentDate: string }) {
  const router = useRouter();

  return (
    <form
      method="GET"
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const val = (form.elements.namedItem("date") as HTMLInputElement)?.value;
        if (val) router.push(`/stock?date=${val}`);
      }}
    >
      <label htmlFor="stock-date" className="text-[13px] text-mute">
        Statement date:
      </label>
      <input
        id="stock-date"
        name="date"
        type="date"
        defaultValue={currentDate}
        onChange={(e) => {
          if (e.target.value) router.push(`/stock?date=${e.target.value}`);
        }}
        className="h-9 rounded-lg border border-line-strong bg-paper px-2.5 text-[14px] text-ink focus:border-gold-line focus:outline-none"
      />
    </form>
  );
}

export function StockMovements({
  goldRatePaise,
}: {
  goldRatePaise: number;
}) {
  const router = useRouter();

  // Bullion in
  const [bullionFine, setBullionFine] = useState("");
  const [bullionNote, setBullionNote] = useState("");
  const [bullionBusy, setBullionBusy] = useState(false);
  const [bullionMsg, setBullionMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  // Refiner send
  const [refinerSendFine, setRefinerSendFine] = useState("");
  const [refinerSendNote, setRefinerSendNote] = useState("");
  const [refinerSendBusy, setRefinerSendBusy] = useState(false);
  const [refinerSendMsg, setRefinerSendMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  // Refiner receive
  const [refinerRetFine, setRefinerRetFine] = useState("");
  const [refinerDiffFine, setRefinerDiffFine] = useState("");
  const [refinerRetNote, setRefinerRetNote] = useState("");
  const [refinerRetBusy, setRefinerRetBusy] = useState(false);
  const [refinerRetMsg, setRefinerRetMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  // Rate
  const [rateGrams, setRateGrams] = useState(String((goldRatePaise / 100).toFixed(0)));
  const [rateBusy, setRateBusy] = useState(false);
  const [rateMsg, setRateMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function handleBullion(e: React.FormEvent) {
    e.preventDefault();
    if (!bullionFine.trim()) return;
    setBullionBusy(true);
    setBullionMsg(null);
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const res = await sendEntry(
      "/api/bullion",
      { fine: bullionFine, note: bullionNote || null, idempotencyKey: id },
      "Bullion to vault"
    );
    setBullionBusy(false);
    if (res.ok) {
      setBullionFine("");
      setBullionNote("");
      setBullionMsg({ tone: "ok", text: "Gold added to vault." });
      router.refresh();
    } else if (res.queued) {
      setBullionFine("");
      setBullionNote("");
      setBullionMsg({ tone: "ok", text: "Saved offline. Will sync when online." });
    } else {
      setBullionMsg({ tone: "bad", text: res.message });
    }
  }

  async function handleRefinerSend(e: React.FormEvent) {
    e.preventDefault();
    if (!refinerSendFine.trim()) return;
    setRefinerSendBusy(true);
    setRefinerSendMsg(null);
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const res = await sendEntry(
      "/api/refiner/send",
      { fine: refinerSendFine, note: refinerSendNote || null, idempotencyKey: id },
      "Send to refiner"
    );
    setRefinerSendBusy(false);
    if (res.ok) {
      setRefinerSendFine("");
      setRefinerSendNote("");
      setRefinerSendMsg({ tone: "ok", text: "Sent to refiner." });
      router.refresh();
    } else if (res.queued) {
      setRefinerSendFine("");
      setRefinerSendNote("");
      setRefinerSendMsg({ tone: "ok", text: "Saved offline. Will sync when online." });
    } else {
      setRefinerSendMsg({ tone: "bad", text: res.message });
    }
  }

  async function handleRefinerReceive(e: React.FormEvent) {
    e.preventDefault();
    if (!refinerRetFine.trim()) return;
    setRefinerRetBusy(true);
    setRefinerRetMsg(null);
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const res = await sendEntry(
      "/api/refiner/receive",
      {
        returned: refinerRetFine,
        difference: refinerDiffFine || "0",
        note: refinerRetNote || null,
        idempotencyKey: id,
      },
      "Receive from refiner"
    );
    setRefinerRetBusy(false);
    if (res.ok) {
      setRefinerRetFine("");
      setRefinerDiffFine("");
      setRefinerRetNote("");
      setRefinerRetMsg({ tone: "ok", text: "Refined gold received into vault." });
      router.refresh();
    } else if (res.queued) {
      setRefinerRetFine("");
      setRefinerDiffFine("");
      setRefinerRetNote("");
      setRefinerRetMsg({ tone: "ok", text: "Saved offline. Will sync when online." });
    } else {
      setRefinerRetMsg({ tone: "bad", text: res.message });
    }
  }

  async function handleRate(e: React.FormEvent) {
    e.preventDefault();
    if (!rateGrams.trim()) return;
    setRateBusy(true);
    setRateMsg(null);
    const res = await callApi("/api/settings", "PUT", { goldRate: rateGrams });
    setRateBusy(false);
    if (res.ok) {
      setRateMsg({ tone: "ok", text: "Gold rate updated." });
      router.refresh();
    } else {
      setRateMsg({ tone: "bad", text: res.message });
    }
  }

  return (
    <section id="movements" className="mt-12 border-t border-line pt-8 no-print">
      <div className="mb-6">
        <h2 className="text-[20px]">Vault & refiner movements</h2>
        <p className="text-[13.5px] text-mute">
          Finance only. Record supplier bullion, shipments to refiner, returns, and daily bullion rate.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Receive bullion into vault */}
        <div className="rounded-xl border border-line bg-sunk/40 p-4">
          <h3 className="text-[15px] font-semibold text-ink">Bullion received</h3>
          <p className="mb-3 text-[12.5px] text-mute">Directly into vault stock</p>
          {bullionMsg && (
            <Notice tone={bullionMsg.tone} className="mb-3 py-1.5 text-[12.5px]">
              {bullionMsg.text}
            </Notice>
          )}
          <form onSubmit={handleBullion} className="space-y-3">
            <Field label="Fine gold (g)">
              <Input
                placeholder="e.g. 500.000"
                figure
                value={bullionFine}
                onChange={(e) => setBullionFine(e.target.value)}
                required
              />
            </Field>
            <Field label="Note / Supplier invoice">
              <Input
                placeholder="Supplier batch / memo"
                value={bullionNote}
                onChange={(e) => setBullionNote(e.target.value)}
              />
            </Field>
            <Button type="submit" busy={bullionBusy} className="w-full">
              Add to vault
            </Button>
          </form>
        </div>

        {/* Send to refiner */}
        <div className="rounded-xl border border-line bg-sunk/40 p-4">
          <h3 className="text-[15px] font-semibold text-ink">Send to refiner</h3>
          <p className="mb-3 text-[12.5px] text-mute">Move scrap gold to refiner</p>
          {refinerSendMsg && (
            <Notice tone={refinerSendMsg.tone} className="mb-3 py-1.5 text-[12.5px]">
              {refinerSendMsg.text}
            </Notice>
          )}
          <form onSubmit={handleRefinerSend} className="space-y-3">
            <Field label="Fine gold (g)">
              <Input
                placeholder="e.g. 250.000"
                figure
                value={refinerSendFine}
                onChange={(e) => setRefinerSendFine(e.target.value)}
                required
              />
            </Field>
            <Field label="Challan / Note">
              <Input
                placeholder="Refiner batch challan"
                value={refinerSendNote}
                onChange={(e) => setRefinerSendNote(e.target.value)}
              />
            </Field>
            <Button type="submit" busy={refinerSendBusy} variant="secondary" className="w-full">
              Dispatch to refiner
            </Button>
          </form>
        </div>

        {/* Receive from refiner */}
        <div className="rounded-xl border border-line bg-sunk/40 p-4">
          <h3 className="text-[15px] font-semibold text-ink">Receive from refiner</h3>
          <p className="mb-3 text-[12.5px] text-mute">Fine gold back + diff</p>
          {refinerRetMsg && (
            <Notice tone={refinerRetMsg.tone} className="mb-3 py-1.5 text-[12.5px]">
              {refinerRetMsg.text}
            </Notice>
          )}
          <form onSubmit={handleRefinerReceive} className="space-y-3">
            <Field label="Fine gold returned (g)">
              <Input
                placeholder="e.g. 248.500"
                figure
                value={refinerRetFine}
                onChange={(e) => setRefinerRetFine(e.target.value)}
                required
              />
            </Field>
            <Field label="Refining loss / diff (g)">
              <Input
                placeholder="0.000"
                figure
                value={refinerDiffFine}
                onChange={(e) => setRefinerDiffFine(e.target.value)}
              />
            </Field>
            <Field label="Assay certificate / Note">
              <Input
                placeholder="Assay report no."
                value={refinerRetNote}
                onChange={(e) => setRefinerRetNote(e.target.value)}
              />
            </Field>
            <Button type="submit" busy={refinerRetBusy} className="w-full">
              Receive into vault
            </Button>
          </form>
        </div>

        {/* Daily Gold Rate */}
        <div className="rounded-xl border border-line bg-sunk/40 p-4">
          <h3 className="text-[15px] font-semibold text-ink">Gold rate setting</h3>
          <p className="mb-3 text-[12.5px] text-mute">
            Current: <Rupees paise={goldRatePaise} />/g
          </p>
          {rateMsg && (
            <Notice tone={rateMsg.tone} className="mb-3 py-1.5 text-[12.5px]">
              {rateMsg.text}
            </Notice>
          )}
          <form onSubmit={handleRate} className="space-y-3">
            <Field label="Rate per gram (₹)">
              <Input
                placeholder="e.g. 12500"
                figure
                value={rateGrams}
                onChange={(e) => setRateGrams(e.target.value)}
                required
              />
            </Field>
            <div className="h-7" />
            <Button type="submit" busy={rateBusy} variant="secondary" className="w-full">
              Update rate
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

