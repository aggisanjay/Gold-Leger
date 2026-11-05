"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Printer, Sparkles, Camera } from "lucide-react";
import { calculateFineGold } from "@/lib/calculations";
import { PrintSlipModal } from "@/components/PrintSlipModal";
import { ScaleOcrReader } from "@/components/ScaleOcrReader";

export default function CreateGoldIssuePage() {
  const router = useRouter();

  const [karigars, setKarigars] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Form State
  const [karigarId, setKarigarId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [grossWeight, setGrossWeight] = useState("120.000"); // Exact sample data
  const [purityPct, setPurityPct] = useState("91.60");
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("Coimbatore 22K bridal temple necklace");
  const [scalePhotoVerified, setScalePhotoVerified] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/karigars").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]).then(([kList, cList, lList]) => {
      setKarigars(kList);
      setCategories(cList);
      setLocations(lList);

      // Pre-select Murugesan S (k-01) and Bridal Necklaces (cat-03)
      const murugesan = kList.find((k: any) => k.name.includes("Murugesan")) || kList[0];
      const neck = cList.find((c: any) => c.code === "CAT-NECK") || cList[0];

      if (murugesan) setKarigarId(murugesan.id);
      if (neck) setCategoryId(neck.id);
      if (lList.length > 0) setSourceLocationId(lList[1]?.id || lList[0].id);
    });
  }, []);

  let calculatedFine = "0.000";
  try {
    if (Number(grossWeight) > 0 && Number(purityPct) > 0) {
      calculatedFine = calculateFineGold(grossWeight, purityPct).toFixed(3);
    }
  } catch (err: any) {
    calculatedFine = "Error";
  }

  const selectedKarigar = karigars.find((k) => k.id === karigarId);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const agreedWastagePct =
    selectedKarigar?.wastageRates?.[categoryId] ??
    selectedCategory?.defaultMaxWastagePct ??
    3.0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gold-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          karigarId,
          categoryId,
          sourceLocationId,
          grossWeight: parseFloat(grossWeight),
          purityPct: parseFloat(purityPct),
          targetCompletionDate: new Date(targetDate).toISOString(),
          notes: `${notes}${scalePhotoVerified ? ` [Scale Photo Verified: ${scalePhotoVerified}]` : ""}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create gold issue");
      }

      setCreatedJob(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-[#78716C]">
        <Link href="/gold-issues" className="hover:text-[#1C1917] flex items-center">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Gold Issues</span>
        </Link>
        <span>/</span>
        <span className="text-[#C5A059] font-medium">Issue Bullion to Master Goldsmith</span>
      </div>

      <div className="bg-white border border-[#E7E2DA] rounded-xl shadow-luxury overflow-hidden">
        {/* Title Banner */}
        <div className="p-6 bg-[#FAF7F2] border-b border-[#E7E2DA] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1C1917]">
              Dispatch Gold Bullion to Karigar
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              Company A, Coimbatore — Sullivan Street Master Goldsmith Workshop.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ScaleOcrReader
              currentTypedWeight={grossWeight}
              currentTypedPurity={purityPct}
              onScanComplete={(w, p, photo) => {
                setGrossWeight(w);
                setPurityPct(p);
                setScalePhotoVerified(photo);
              }}
            />
            <span className="px-3 py-1 rounded bg-[#F3ECD7] border border-[#DBC485] text-xs font-mono font-bold text-[#8C6A30]">
              Exact Milligram Math
            </span>
          </div>
        </div>

        {scalePhotoVerified && (
          <div className="mx-6 mt-4 p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-xs text-[#0D5C3A] flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>AI Verified from Scale Photo: <strong>{scalePhotoVerified}</strong> ({grossWeight}g @ {purityPct}%)</span>
          </div>
        )}

        {error && (
          <div className="m-6 p-4 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] flex items-center text-xs text-[#991B1B]">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Karigar Selection */}
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Assign to Master Karigar (Goldsmith) *
              </label>
              <select
                value={karigarId}
                onChange={(e) => setKarigarId(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
                required
              >
                {karigars.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} {k.nameTamil ? `(${k.nameTamil})` : ""} &bull; {k.code} &bull; {k.workshop}
                  </option>
                ))}
              </select>
              {selectedKarigar && (
                <p className="text-[11px] text-[#78716C] mt-1">
                  Current Running Balance: <span className="font-mono font-bold text-[#8C6A30]">{Number(selectedKarigar.runningBalanceFine).toFixed(3)}g</span> fine gold
                </p>
              )}
            </div>

            {/* Jewellery Category */}
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Jewellery Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Agreed Wastage: {selectedKarigar?.wastageRates?.[c.id] ?? c.defaultMaxWastagePct}%)
                  </option>
                ))}
              </select>
              <div className="flex items-center text-[11px] text-[#0D5C3A] font-semibold mt-1">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                <span>Agreed Karigar Wastage Tolerance: {agreedWastagePct}%</span>
              </div>
            </div>

            {/* Source Vault / Location */}
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Source Location / Strongroom Safe *
              </label>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
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

            {/* Target Completion Date */}
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Target Completion Date *
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
                required
              />
            </div>

            {/* Gross Weight Input */}
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Gross Issued Weight (Grams) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                placeholder="e.g. 120.000"
                className="w-full text-xs font-mono font-bold p-2.5 bg-white border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
                required
              />
            </div>

            {/* Purity Percentage */}
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Purity Percentage (%) *
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="100"
                  value={purityPct}
                  onChange={(e) => setPurityPct(e.target.value)}
                  className="flex-1 text-xs font-mono font-bold p-2.5 bg-white border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPurityPct("91.60")}
                  className="px-2.5 py-1 text-[11px] font-bold rounded bg-[#FAF7F2] border border-[#E7E2DA] text-[#8C6A30] hover:bg-[#F3ECD7]"
                >
                  22K (91.60%)
                </button>
                <button
                  type="button"
                  onClick={() => setPurityPct("99.90")}
                  className="px-2.5 py-1 text-[11px] font-bold rounded bg-[#FAF7F2] border border-[#E7E2DA] text-[#8C6A30] hover:bg-[#F3ECD7]"
                >
                  24K (99.90%)
                </button>
              </div>
            </div>
          </div>

          {/* High-Precision Fine Gold Calculation Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#FAF7F2] to-[#F3ECD7] border border-[#DBC485] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6A30]">
                Calculated Fine Gold (Gross &times; Purity / 100)
              </span>
              <p className="text-2xl font-serif font-bold text-[#1C1917] font-mono mt-0.5">
                {calculatedFine} <span className="text-sm font-sans font-normal text-[#78716C]">Grams</span>
              </p>
              <p className="text-[11px] text-[#78716C]">
                Agreed Allowed Wastage Ceiling: {(Number(calculatedFine) * (agreedWastagePct / 100)).toFixed(3)}g
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[#8C6A30] bg-white/80 px-2.5 py-1 rounded-full border border-[#DBC485]">
                Exact 0.001g Precision
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
              Production Bench Specifications / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Coimbatore traditional 22K bridal temple necklace..."
              className="w-full text-xs p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
            ></textarea>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E7E2DA]">
            <Link
              href="/gold-issues"
              className="px-4 py-2 text-xs font-semibold text-[#78716C] hover:text-[#1C1917]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || Number(calculatedFine) <= 0}
              className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] disabled:opacity-50 text-white shadow-luxury transition"
            >
              {loading ? "Recording Issue..." : "Confirm & Generate Issue Slip"}
            </button>
          </div>
        </form>
      </div>

      {createdJob && (
        <PrintSlipModal
          isOpen={true}
          onClose={() => router.push("/gold-issues")}
          title="GOLD ISSUE VOUCHER"
          slipNumber={createdJob.issue?.slipNumber || "TX-30411"}
          date={createdJob.issue?.issueDate || new Date().toISOString()}
          partyName={selectedKarigar?.name || "Karigar"}
          categoryOrDesc={`${selectedCategory?.name} — ${notes}`}
          items={[
            {
              label: "Gold Grain / Bullion Bar",
              grossWeight,
              purity: purityPct,
              fineWeight: calculatedFine,
            },
          ]}
          notes={`Agreed Wastage Ceiling: ${agreedWastagePct}%. Target Date: ${targetDate}. Company A, Coimbatore.`}
        />
      )}
    </div>
  );
}
