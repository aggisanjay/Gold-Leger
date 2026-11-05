"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  PlusCircle,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Send,
  Building,
} from "lucide-react";
import { PrintSlipModal } from "@/components/PrintSlipModal";

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  // Form State
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destLocationId, setDestLocationId] = useState("");
  const [grossWeight, setGrossWeight] = useState("200.000");
  const [purityPct, setPurityPct] = useState("91.60");
  const [purityKarats, setPurityKarats] = useState("22K_916");
  const [description, setDescription] = useState("Showroom replenish consignment");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTransfers = () => {
    fetch("/api/stock-transfers")
      .then((r) => r.json())
      .then((data) => setTransfers(data));
  };

  useEffect(() => {
    fetchTransfers();
    fetch("/api/locations")
      .then((r) => r.json())
      .then((lList) => {
        setLocations(lList);
        if (lList.length > 1) {
          setSourceLocationId(lList[0].id);
          setDestLocationId(lList[2]?.id || lList[1].id);
        }
      });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLocationId,
          destLocationId,
          items: [
            {
              purityKarats,
              purityPct: parseFloat(purityPct),
              grossWeight: parseFloat(grossWeight),
              description,
            },
          ],
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowModal(false);
      fetchTransfers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transferId: string) => {
    try {
      const res = await fetch(`/api/stock-transfers/${transferId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchTransfers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
            Inter-Facility Logistics
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
            Inter-Branch Stock Transfers & Transit
          </h1>
          <p className="text-xs text-[#78716C] mt-1">
            Secure bullion and ornament movements between central vault, showrooms, and workshop floors.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-luxury transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Initiate Stock Dispatch</span>
        </button>
      </div>

      {/* Transfer List */}
      <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
            <tr>
              <th className="py-3 px-4">Transfer #</th>
              <th className="py-3 px-4">Source Facility</th>
              <th className="py-3 px-4">Destination Facility</th>
              <th className="py-3 px-4 text-right">Gross Wt</th>
              <th className="py-3 px-4 text-right">Fine Gold Wt</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4EFE6]">
            {transfers.map((trf) => (
              <tr key={trf.id} className="hover:bg-[#FCFBF9] transition">
                <td className="py-3 px-4 font-mono font-bold text-[#1C1917]">
                  {trf.transferNumber}
                </td>
                <td className="py-3 px-4 text-[#57534E] font-medium">{trf.sourceLocationName}</td>
                <td className="py-3 px-4 text-[#1C1917] font-semibold">{trf.destLocationName}</td>
                <td className="py-3 px-4 text-right font-mono font-medium">{trf.totalGrossWeight.toFixed(3)}g</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-[#8C6A30]">
                  {trf.totalFineGoldWeight.toFixed(3)}g
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      trf.status === "RECEIVED"
                        ? "bg-[#ECFDF5] text-[#0D5C3A] border border-[#A7F3D0]"
                        : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                    }`}
                  >
                    {trf.status === "RECEIVED" ? (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {trf.status.replace("_", " ")}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  {trf.status === "IN_TRANSIT" && (
                    <button
                      onClick={() => handleApprove(trf.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-[#0D5C3A] hover:bg-[#047857] text-white shadow-sm transition"
                    >
                      Accept into Safe
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setSelectedSlip({
                        title: "BULLION TRANSIT GATE PASS & MANIFEST",
                        slipNumber: trf.transferNumber,
                        date: trf.initiatedAt,
                        partyName: `${trf.sourceLocationName} -> ${trf.destLocationName}`,
                        categoryOrDesc: "Inter-Branch Bullion Transfer Consignment",
                        items: (trf.items || []).map((i: any) => ({
                          label: `${i.purityKarats} — ${i.description}`,
                          grossWeight: i.grossWeight,
                          purity: i.purityPct,
                          fineWeight: i.fineGoldWeight,
                        })),
                        notes: `Security transit escort authorized. Status: ${trf.status}`,
                      })
                    }
                    className="p-1 rounded bg-[#FAF7F2] border border-[#E7E2DA] hover:bg-[#F3ECD7] text-[#8C6A30] inline-flex"
                    title="Print Gate Pass"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#DBC485] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-[#FAF7F2] border-b border-[#E7E2DA] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917]">
                  Initiate Stock Transfer Consignment
                </h3>
                <p className="text-xs text-[#78716C]">Dispatch bullion between approved safe locations.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#78716C] hover:text-[#1C1917]">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Source Vault / Safe *</label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                  required
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.branchName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Destination Facility Safe *</label>
                <select
                  value={destLocationId}
                  onChange={(e) => setDestLocationId(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                  required
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.branchName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Gross Weight (g) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    className="w-full p-2 font-mono font-bold text-right border border-[#E7E2DA] rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Purity Grade *</label>
                  <select
                    value={purityKarats}
                    onChange={(e) => {
                      setPurityKarats(e.target.value);
                      setPurityPct(e.target.value === "24K" ? "99.90" : "91.60");
                    }}
                    className="w-full p-2 font-semibold border border-[#E7E2DA] rounded"
                  >
                    <option value="24K">24K Bullion (99.9%)</option>
                    <option value="22K_916">22K / 916 (91.6%)</option>
                    <option value="18K_750">18K / 750 (75.0%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Description / Ornaments Summary</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-[#E7E2DA] rounded"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E7E2DA]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-[#78716C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white rounded-lg shadow-sm"
                >
                  {loading ? "Dispatching..." : "Dispatch Consignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSlip && (
        <PrintSlipModal
          isOpen={!!selectedSlip}
          onClose={() => setSelectedSlip(null)}
          {...selectedSlip}
        />
      )}
    </div>
  );
}

