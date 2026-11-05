"use client";

import React, { useState, useEffect } from "react";
import {
  Scale,
  PlusCircle,
  Search,
  Printer,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Receipt,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";
import { assessOldGold } from "@/lib/calculations";
import { PrintSlipModal } from "@/components/PrintSlipModal";
import { ScaleOcrReader } from "@/components/ScaleOcrReader";

export default function OldGoldDeskPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+91 ");
  const [panNumber, setPanNumber] = useState("");
  const [paymentMode, setPaymentMode] = useState("BILL_EXCHANGE");
  const [itemDescription, setItemDescription] = useState("");
  const [grossWeight, setGrossWeight] = useState("54.200");
  const [approvedDeduction, setApprovedDeduction] = useState("2.200");
  const [testedPurityPct, setTestedPurityPct] = useState("89.50");
  const [goldRatePerGram, setGoldRatePerGram] = useState("12500.00");
  const [salesBillNumber, setSalesBillNumber] = useState("BILL-CBE-");
  const [testMethodNotes, setTestMethodNotes] = useState("XRF Niton Spectrometer + Specific Gravity");
  const [holdingLocationId, setHoldingLocationId] = useState("");
  const [scalePhotoVerified, setScalePhotoVerified] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPurchases = () => {
    fetch("/api/old-gold")
      .then((r) => r.json())
      .then((data) => setPurchases(data));
  };

  useEffect(() => {
    fetchPurchases();
    fetch("/api/locations")
      .then((r) => r.json())
      .then((lList) => {
        setLocations(lList);
        const holding = lList.find((l: any) => l.isHolding);
        if (holding) setHoldingLocationId(holding.id);
        else if (lList.length > 0) setHoldingLocationId(lList[0].id);
      });
  }, []);

  // Compute live assessment with income tax compliance checks
  let assessment: any = null;
  try {
    if (Number(grossWeight) > 0 && Number(testedPurityPct) > 0) {
      assessment = assessOldGold(
        grossWeight,
        approvedDeduction,
        testedPurityPct,
        goldRatePerGram,
        paymentMode,
        panNumber
      );
    }
  } catch {}

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Income tax validations
    if (assessment?.requiresPan && (!panNumber || panNumber.trim().length !== 10)) {
      alert("Statutory Income Tax Compliance: Valuation exceeds ₹2,00,000. Customer PAN card (10 alphanumeric digits) is mandatory under Rule 114B.");
      return;
    }

    if (assessment?.cashExceedsLimit) {
      alert("Section 269ST Income Tax Violation: Cash payments of ₹2,00,000 or more are prohibited. Please select Bank RTGS/NEFT or Jewellery Bill Exchange.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/old-gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          panNumber,
          paymentMode,
          itemDescription,
          grossWeight: parseFloat(grossWeight),
          approvedDeduction: parseFloat(approvedDeduction),
          testedPurityPct: parseFloat(testedPurityPct),
          goldRatePerGram: parseFloat(goldRatePerGram),
          salesBillNumber: salesBillNumber || undefined,
          testMethodNotes: `${testMethodNotes}${scalePhotoVerified ? ` [AI Verified: ${scalePhotoVerified}]` : ""}`,
          holdingLocationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowModal(false);
      fetchPurchases();

      setSelectedSlip({
        title: "OLD-GOLD APPRAISAL & STATUTORY EXCHANGE VOUCHER",
        slipNumber: data.purchaseNumber,
        date: data.createdAt,
        partyName: `${customerName} (${customerPhone})`,
        categoryOrDesc: itemDescription,
        items: [
          {
            label: "Gross Submitted Ornaments",
            grossWeight: data.grossWeight,
            purity: data.testedPurityPct,
            fineWeight: 0,
          },
          {
            label: `Net Eligible (Less ${data.approvedDeduction}g Stone/Enamel Deduction)`,
            grossWeight: data.netEligibleWeight,
            purity: data.testedPurityPct,
            fineWeight: data.fineGoldWeight,
          },
        ],
        notes: `Gold Valuation: ₹${data.goldRatePerGram}/g | Total Credit: ₹${Number(data.exchangeValue).toLocaleString("en-IN")} | Payment: ${paymentMode} | PAN: ${panNumber || "N/A (Under ₹2L)"} | Tested: ${data.testMethodNotes}`,
      });

      // Reset
      setCustomerName("");
      setCustomerPhone("+91 ");
      setPanNumber("");
      setItemDescription("");
      setScalePhotoVerified(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = purchases.filter(
    (p) =>
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.itemDescription.toLowerCase().includes(search.toLowerCase()) ||
      (p.panNumber && p.panNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
            Customer Gold Intake & Karat Meter Verification
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
            Old-Gold Purchase & Exchange Desk
          </h1>
          <p className="text-xs text-[#78716C] mt-1">
            Record customer old jewellery once, test purity via XRF spectrometer, verify scale photo, enforce PAN limits, and tie to sales bill.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-luxury transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Customer Gold Intake</span>
        </button>
      </div>

      {/* Filter and Holding Notice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#78716C]" />
          <input
            type="text"
            placeholder="Search by customer name, phone, PAN, purchase number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#E7E2DA] rounded-xl focus:outline-none focus:border-[#C5A059]"
          />
        </div>
        <div className="bg-[#FAF7F2] border border-[#E7E2DA] rounded-xl p-3 flex items-center space-x-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-[#8C6A30] flex-shrink-0" />
          <p className="text-[#78716C] leading-snug">
            All customer intake enters <span className="font-semibold text-[#1C1917]">Quarantine Holding Safe</span>. Untested customer gold is never treated as verified stock.
          </p>
        </div>
      </div>

      {/* Register Table */}
      <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
              <tr>
                <th className="py-3 px-4">Intake #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">PAN / Tax Record</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4 text-right">Gross Wt</th>
                <th className="py-3 px-4 text-right">Tested Purity</th>
                <th className="py-3 px-4 text-right">Fine Gold</th>
                <th className="py-3 px-4 text-right">Credit Value (@₹12,500/g)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#FCFBF9] transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#1C1917]">
                    {item.purchaseNumber}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-[#1C1917]">{item.customerName}</p>
                    <p className="text-[10px] text-[#78716C]">{item.customerPhone}</p>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {item.panNumber ? (
                      <span className="text-[#0D5C3A] font-bold bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]">
                        {item.panNumber}
                      </span>
                    ) : (
                      <span className="text-[#78716C]">Under ₹2L limit</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#57534E] max-w-xs truncate">{item.itemDescription}</td>
                  <td className="py-3 px-4 text-right font-mono">{Number(item.grossWeight).toFixed(3)}g</td>
                  <td className="py-3 px-4 text-right font-mono text-[#78716C]">{Number(item.testedPurityPct).toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#8C6A30]">
                    {Number(item.fineGoldWeight).toFixed(3)}g
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#0D5C3A]">
                    ₹{Number(item.exchangeValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === "EXCHANGED"
                          ? "bg-[#ECFDF5] text-[#0D5C3A] border border-[#A7F3D0]"
                          : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() =>
                        setSelectedSlip({
                          title: "OLD-GOLD APPRAISAL & STATUTORY EXCHANGE VOUCHER",
                          slipNumber: item.purchaseNumber,
                          date: item.createdAt,
                          partyName: `${item.customerName} (${item.customerPhone || "Walk-In"})`,
                          categoryOrDesc: item.itemDescription,
                          items: [
                            {
                              label: "Customer Gross Ornaments",
                              grossWeight: item.grossWeight,
                              purity: item.testedPurityPct,
                              fineWeight: 0,
                            },
                            {
                              label: `Net Eligible (Deduction: ${item.approvedDeduction}g)`,
                              grossWeight: item.netEligibleWeight,
                              purity: item.testedPurityPct,
                              fineWeight: item.fineGoldWeight,
                            },
                          ],
                          notes: `Gold Rate: ₹${item.goldRatePerGram}/g | Total Credit: ₹${Number(item.exchangeValue).toLocaleString("en-IN")} | PAN: ${item.panNumber || "N/A"} | Payment: ${item.paymentMode || "BILL_EXCHANGE"}`,
                        })
                      }
                      className="p-1 rounded bg-[#FAF7F2] border border-[#E7E2DA] hover:bg-[#F3ECD7] text-[#8C6A30] inline-flex"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Old-Gold Intake Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#DBC485] rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-5 bg-[#FAF7F2] border-b border-[#E7E2DA] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917]">
                  New Customer Gold Intake & Appraisal
                </h3>
                <p className="text-xs text-[#78716C]">
                  Live fine-gold calculation, scale OCR reading, and statutory income tax compliance.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#78716C] hover:text-[#1C1917]">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* AI Scale Photo Scan integration */}
              <div className="p-3 bg-[#FCFBF9] border border-[#DBC485] rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#1C1917] block">Precision Scale & Karat Meter AI Reader</span>
                  <p className="text-[11px] text-[#78716C]">
                    Capture photo of scale LCD to auto-fill gross weight and verified purity.
                  </p>
                </div>
                <ScaleOcrReader
                  currentTypedWeight={grossWeight}
                  currentTypedPurity={testedPurityPct}
                  onScanComplete={(w, p, photo) => {
                    setGrossWeight(w);
                    setTestedPurityPct(p);
                    setScalePhotoVerified(photo);
                  }}
                />
              </div>

              {scalePhotoVerified && (
                <div className="p-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded text-[11px] text-[#0D5C3A] flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                  <span>AI Scale Verification Confirmed: {scalePhotoVerified}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Smt. Meenakshi Sundaram"
                    className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 9443..."
                    className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                  />
                </div>
              </div>

              {/* Statutory Tax Compliance: PAN & Payment Mode */}
              <div className="grid grid-cols-2 gap-4 bg-[#FAF7F2] p-3 rounded-lg border border-[#E7E2DA]">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">
                    Customer PAN Card {assessment?.requiresPan ? <span className="text-[#991B1B]">(Mandatory for &gt; ₹2 Lakhs)</span> : "(Optional if &lt; ₹2L)"}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full p-2 bg-white font-mono font-bold uppercase border border-[#E7E2DA] rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Settlement / Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2 bg-white font-semibold border border-[#E7E2DA] rounded"
                  >
                    <option value="BILL_EXCHANGE">Exchange Against New Jewellery Bill</option>
                    <option value="BANK_RTGS_NEFT">Bank Transfer (RTGS / NEFT)</option>
                    <option value="ACCOUNT_PAYEE_CHEQUE">Account Payee Cheque</option>
                    <option value="CASH">Cash (Subject to Section 269ST limit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Ornament Description *</label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g. 22K Traditional Coimbatore Lakshmi Haram & Kasu Malai"
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <label className="block font-bold text-[#1C1917] mb-1">Stone/Lac Deduction (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={approvedDeduction}
                    onChange={(e) => setApprovedDeduction(e.target.value)}
                    className="w-full p-2 font-mono font-bold text-right border border-[#E7E2DA] rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Tested Purity (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={testedPurityPct}
                    onChange={(e) => setTestedPurityPct(e.target.value)}
                    className="w-full p-2 font-mono font-bold text-right border border-[#E7E2DA] rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Bullion Rate Per Gram (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={goldRatePerGram}
                    onChange={(e) => setGoldRatePerGram(e.target.value)}
                    className="w-full p-2 font-mono font-bold text-right border border-[#E7E2DA] rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Linked Showroom Sales Bill #</label>
                  <input
                    type="text"
                    value={salesBillNumber}
                    onChange={(e) => setSalesBillNumber(e.target.value)}
                    placeholder="e.g. BILL-CBE-9821"
                    className="w-full p-2 border border-[#E7E2DA] rounded"
                  />
                </div>
              </div>

              {/* Statutory Compliance Alerts */}
              {assessment?.cashExceedsLimit && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded text-[11px] text-[#991B1B] flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Statutory Block:</strong> Total value (₹{assessment.exchangeValue.toNumber().toLocaleString("en-IN")}) exceeds ₹2,00,000. Cash settlement is prohibited under Section 269ST. Please switch payment mode to Bill Exchange or Bank Transfer.
                  </span>
                </div>
              )}

              {/* Assessment Summary Box */}
              {assessment && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-[#FAF7F2] to-[#F3ECD7] border border-[#DBC485] grid grid-cols-3 gap-3 font-mono">
                  <div>
                    <span className="text-[#78716C] font-sans">Net Weight:</span>
                    <p className="text-sm font-bold text-[#1C1917] mt-0.5">{assessment.netEligibleWeight.toString()}g</p>
                  </div>
                  <div>
                    <span className="text-[#78716C] font-sans">Fine Gold (0.001g):</span>
                    <p className="text-sm font-bold text-[#8C6A30] mt-0.5">{assessment.fineGoldWeight.toString()}g</p>
                  </div>
                  <div>
                    <span className="text-[#78716C] font-sans">Exchange Credit:</span>
                    <p className="text-base font-bold text-[#0D5C3A] mt-0.5">
                      ₹{assessment.exchangeValue.toNumber().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}

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
                  disabled={loading || assessment?.cashExceedsLimit}
                  className="px-5 py-2 font-semibold bg-[#C5A059] hover:bg-[#B08A44] disabled:opacity-50 text-white rounded-lg shadow-sm"
                >
                  {loading ? "Recording..." : "Record Intake & Print Voucher"}
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
