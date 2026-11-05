"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Plus,
  Trash2,
  Printer,
  Scale,
} from "lucide-react";
import {
  calculateFineGold,
  calculateActualWastage,
  calculateAllowedWastage,
  calculateExcessWastage,
} from "@/lib/calculations";
import { PrintSlipModal } from "@/components/PrintSlipModal";
import { ScaleOcrReader } from "@/components/ScaleOcrReader";
import Decimal from "decimal.js";

interface ReceiptItemInput {
  itemType: "FINISHED_JEWELLERY" | "SCRAP" | "FILINGS";
  description: string;
  grossWeight: string;
  purityPct: string;
  huid?: string;
}

function FinishedJewelleryReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedJobId = searchParams.get("jobId");

  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(preSelectedJobId || "");
  const [locations, setLocations] = useState<any[]>([]);
  const [destLocationId, setDestLocationId] = useState("");
  const [notes, setNotes] = useState("Necklace received with BIS hallmarking stamp");

  // Items to receive — Pre-seed with Company A, Coimbatore sample data
  // TX-30437 (112.450g gross, 91.60% purity, 103.004g fine) + TX-30438 (3.300g gross scrap, 91.60% purity, 3.023g fine)
  const [items, setItems] = useState<ReceiptItemInput[]>([
    {
      itemType: "FINISHED_JEWELLERY",
      description: "22K Handcrafted Bridal Necklace",
      grossWeight: "112.450",
      purityPct: "91.60",
      huid: "CB9142",
    },
    {
      itemType: "SCRAP",
      description: "End wire cuttings & sprue scrap",
      grossWeight: "3.300",
      purityPct: "91.60",
    },
  ]);

  const [scalePhotoVerified, setScalePhotoVerified] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/gold-issues?status=IN_PROGRESS").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]).then(([jList, lList]) => {
      setActiveJobs(jList);
      setLocations(lList);

      if (!selectedJobId && jList.length > 0) {
        setSelectedJobId(jList[0].id);
      }
      if (lList.length > 0) {
        setDestLocationId(lList[1]?.id || lList[0].id);
      }
    });
  }, [selectedJobId]);

  const selectedJob = activeJobs.find((j) => j.id === selectedJobId);

  // Compute live totals with Decimal
  let totalRecoveredFine = new Decimal(0);
  items.forEach((item) => {
    try {
      if (Number(item.grossWeight) > 0 && Number(item.purityPct) > 0) {
        const fine = calculateFineGold(item.grossWeight, item.purityPct);
        totalRecoveredFine = totalRecoveredFine.plus(fine);
      }
    } catch {}
  });

  const issuedFine = new Decimal(selectedJob?.issue?.fineGoldWeight || 109.92);
  const agreedPct = new Decimal(selectedJob?.agreedWastagePct || 3.0);

  const actualWastage = calculateActualWastage(issuedFine, totalRecoveredFine);
  const allowedWastage = calculateAllowedWastage(issuedFine, agreedPct);
  const excessWastage = calculateExcessWastage(actualWastage, allowedWastage);

  const addItemRow = (type: "FINISHED_JEWELLERY" | "SCRAP" | "FILINGS") => {
    setItems([
      ...items,
      {
        itemType: type,
        description: type === "FINISHED_JEWELLERY" ? "Additional Ornament" : type === "SCRAP" ? "Scrap trimmings" : "Bench Filings & Dust",
        grossWeight: "0.000",
        purityPct: "91.60",
        huid: type === "FINISHED_JEWELLERY" ? "CB" + Math.floor(1000 + Math.random() * 9000) : undefined,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: keyof ReceiptItemInput, val: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        jobCardId: selectedJob.id,
        destLocationId,
        items: items.map((i) => ({
          itemType: i.itemType,
          description: i.description,
          grossWeight: parseFloat(i.grossWeight),
          purityPct: parseFloat(i.purityPct),
          huid: i.huid || undefined,
        })),
        notes: `${notes}${scalePhotoVerified ? ` [Scale Photo Verified: ${scalePhotoVerified}]` : ""}`,
      };

      const res = await fetch("/api/gold-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record receipt");

      setReceiptResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 text-xs text-[#78716C]">
        <Link href="/gold-issues" className="hover:text-[#1C1917] flex items-center">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Gold Issues</span>
        </Link>
        <span>/</span>
        <span className="text-[#C5A059] font-medium">Finished Jewellery Receipt & Wastage Audit</span>
      </div>

      <div className="bg-white border border-[#E7E2DA] rounded-xl shadow-luxury overflow-hidden">
        {/* Banner */}
        <div className="p-6 bg-[#FAF7F2] border-b border-[#E7E2DA] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1C1917]">
              Receive Finished Ornaments & Scrap (Company A, Coimbatore)
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              Input finished jewellery (HUID), scrap, and filings to calculate actual vs. allowed wastage.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ScaleOcrReader
              currentTypedWeight={items[0]?.grossWeight}
              currentTypedPurity={items[0]?.purityPct}
              onScanComplete={(w, p, photo) => {
                const updated = [...items];
                if (updated[0]) {
                  updated[0].grossWeight = w;
                  updated[0].purityPct = p;
                }
                setItems(updated);
                setScalePhotoVerified(photo);
              }}
            />
            <span className="px-3 py-1 rounded bg-[#F3ECD7] border border-[#DBC485] text-xs font-mono font-bold text-[#8C6A30]">
              Dual-Entry Verified
            </span>
          </div>
        </div>

        {scalePhotoVerified && (
          <div className="mx-6 mt-4 p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-xs text-[#0D5C3A] flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>AI Verified from Scale Photo: <strong>{scalePhotoVerified}</strong></span>
          </div>
        )}

        {error && (
          <div className="m-6 p-4 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Job Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Select Active Job Card to Reconcile *
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
                required
              >
                {activeJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobNumber} — {j.karigarName} ({j.categoryName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Destination Showcase / Strongroom Safe *
              </label>
              <select
                value={destLocationId}
                onChange={(e) => setDestLocationId(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
                required
              >
                {locations.filter((l) => !l.isHolding).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.branchName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Job Reference Details Box */}
          {selectedJob && (
            <div className="p-4 bg-[#FCFBF9] border border-[#E7E2DA] rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-[#78716C] text-[10px] uppercase font-sans">Issued Fine Gold</span>
                <p className="font-bold text-[#1C1917] text-sm mt-0.5">{issuedFine.toFixed(3)}g</p>
              </div>
              <div>
                <span className="text-[#78716C] text-[10px] uppercase font-sans">Agreed Wastage</span>
                <p className="font-bold text-[#0D5C3A] text-sm mt-0.5">{agreedPct.toFixed(2)}%</p>
              </div>
              <div>
                <span className="text-[#78716C] text-[10px] uppercase font-sans">Max Allowed Loss</span>
                <p className="font-bold text-[#1C1917] text-sm mt-0.5">{allowedWastage.toFixed(3)}g</p>
              </div>
              <div>
                <span className="text-[#78716C] text-[10px] uppercase font-sans">Artisan</span>
                <p className="font-bold text-[#8C6A30] text-sm mt-0.5">{selectedJob.karigarName}</p>
              </div>
            </div>
          )}

          {/* Itemized Recovery Inputs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-bold text-sm text-[#1C1917]">
                Itemized Gold Returns (Jewellery, Scrap, Filings)
              </h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => addItemRow("FINISHED_JEWELLERY")}
                  className="px-2 py-1 text-[11px] font-semibold rounded bg-[#FAF7F2] border border-[#DBC485] text-[#8C6A30] hover:bg-[#F3ECD7]"
                >
                  + Finished Item
                </button>
                <button
                  type="button"
                  onClick={() => addItemRow("SCRAP")}
                  className="px-2 py-1 text-[11px] font-semibold rounded bg-[#FAF7F2] border border-[#E7E2DA] text-[#78716C] hover:bg-[#F3ECD7]"
                >
                  + Scrap
                </button>
                <button
                  type="button"
                  onClick={() => addItemRow("FILINGS")}
                  className="px-2 py-1 text-[11px] font-semibold rounded bg-[#FAF7F2] border border-[#E7E2DA] text-[#78716C] hover:bg-[#F3ECD7]"
                >
                  + Filings
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                let fine = "0.000";
                try {
                  fine = calculateFineGold(item.grossWeight, item.purityPct).toFixed(3);
                } catch {}

                return (
                  <div
                    key={idx}
                    className="p-3 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs"
                  >
                    <div className="md:col-span-3">
                      <select
                        value={item.itemType}
                        onChange={(e) => updateItem(idx, "itemType", e.target.value as any)}
                        className="w-full p-2 bg-white border border-[#E7E2DA] rounded font-semibold text-[#1C1917]"
                      >
                        <option value="FINISHED_JEWELLERY">Finished Jewellery</option>
                        <option value="SCRAP">Scrap / Sprue Ends</option>
                        <option value="FILINGS">Bench Filings / Dust</option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        className="w-full p-2 bg-white border border-[#E7E2DA] rounded"
                      />
                    </div>

                    {item.itemType === "FINISHED_JEWELLERY" && (
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="HUID (e.g. CB9142)"
                          value={item.huid || ""}
                          onChange={(e) => updateItem(idx, "huid", e.target.value)}
                          className="w-full p-2 bg-white border border-[#E7E2DA] rounded font-mono font-bold uppercase"
                        />
                      </div>
                    )}

                    <div className={item.itemType === "FINISHED_JEWELLERY" ? "md:col-span-1" : "md:col-span-3"}>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Gross Wt (g)"
                        value={item.grossWeight}
                        onChange={(e) => updateItem(idx, "grossWeight", e.target.value)}
                        className="w-full p-2 bg-white border border-[#E7E2DA] rounded font-mono font-bold text-right"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Purity %"
                        value={item.purityPct}
                        onChange={(e) => updateItem(idx, "purityPct", e.target.value)}
                        className="w-full p-2 bg-white border border-[#E7E2DA] rounded font-mono text-right"
                      />
                    </div>

                    <div className="md:col-span-1 text-right font-mono font-bold text-[#8C6A30]">
                      {fine}g
                    </div>

                    <div className="md:col-span-1 text-right">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-[#991B1B] hover:text-[#DC2626] p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Wastage Audit Matrix */}
          <div className="p-5 rounded-xl bg-[#FAF7F2] border-2 border-[#DBC485] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
              <h4 className="font-serif font-bold text-[#1C1917] text-sm">
                Real-Time Wastage & Reconciliation Engine
              </h4>
              <span className="text-xs font-mono font-bold text-[#8C6A30]">
                Total Recovered Fine: {totalRecoveredFine.toFixed(3)}g
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-white p-3 rounded border border-[#E7E2DA]">
                <span className="text-[#78716C] font-sans">Actual Wastage (Issued - Recovered):</span>
                <p className="text-base font-bold text-[#1C1917] mt-1">{actualWastage.toFixed(3)}g</p>
              </div>
              <div className="bg-white p-3 rounded border border-[#E7E2DA]">
                <span className="text-[#78716C] font-sans">Allowed Wastage ({agreedPct.toFixed(2)}% of Issued):</span>
                <p className="text-base font-bold text-[#0D5C3A] mt-1">{allowedWastage.toFixed(3)}g</p>
              </div>
              <div className={`p-3 rounded border ${excessWastage.greaterThan(0) ? "bg-[#FEF2F2] border-[#FCA5A5]" : "bg-white border-[#E7E2DA]"}`}>
                <span className="text-[#78716C] font-sans">Excess Unapproved Wastage:</span>
                <p className={`text-base font-bold mt-1 ${excessWastage.greaterThan(0) ? "text-[#991B1B]" : "text-[#78716C]"}`}>
                  {excessWastage.toFixed(3)}g
                </p>
              </div>
            </div>

            {excessWastage.greaterThan(0) && (
              <div className="flex items-center space-x-2 text-xs text-[#991B1B] bg-white p-2.5 rounded border border-[#FCA5A5]">
                <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>QUIET REVIEW ADVISORY:</strong> Actual wastage exceeds agreed allowance by {excessWastage.toFixed(3)}g. Discrepancy logged for Head of Finance and Managing Partner review.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
              Reconciliation Remarks / Bench Assay Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Laser hallmarking verified. Leather catch filings smelted..."
              className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
            ></textarea>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E7E2DA]">
            <Link href="/gold-issues" className="px-4 py-2 text-xs font-semibold text-[#78716C]">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || totalRecoveredFine.isZero()}
              className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] disabled:opacity-50 text-white shadow-luxury transition"
            >
              {loading ? "Reconciling..." : "Confirm Receipt & Print Voucher"}
            </button>
          </div>
        </form>
      </div>

      {receiptResult && (
        <PrintSlipModal
          isOpen={true}
          onClose={() => router.push(`/job-cards/${receiptResult.job.id}`)}
          title="FINISHED JEWELLERY RECEIPT VOUCHER"
          slipNumber={receiptResult.receipt?.receiptNumber || "TX-30437"}
          date={receiptResult.receipt?.receiptDate || new Date().toISOString()}
          partyName={selectedJob?.karigarName || "Murugesan S"}
          categoryOrDesc={`${selectedJob?.categoryName} — Final Reconciliation`}
          items={receiptResult.receipt.items.map((i: any) => ({
            label: `${i.itemType} — ${i.description} ${i.huid ? `[${i.huid}]` : ""}`,
            grossWeight: i.grossWeight,
            purity: i.purityPct,
            fineWeight: i.fineGoldWeight,
          }))}
          wastageDetails={{
            actualWastage: receiptResult.receipt.actualWastage,
            allowedWastage: receiptResult.receipt.allowedWastage,
            excessWastage: receiptResult.receipt.excessWastage,
          }}
          notes={receiptResult.receipt.notes}
        />
      )}
    </div>
  );
}

export default function FinishedJewelleryReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-xs text-[#78716C]">
          Loading receipt module...
        </div>
      }
    >
      <FinishedJewelleryReceiptContent />
    </Suspense>
  );
}
