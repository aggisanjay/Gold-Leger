"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  DownloadCloud,
  Filter,
  Calendar,
  CheckCircle2,
  Table,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function ReportsReconciliationPage() {
  const [reportType, setReportType] = useState<"DAILY_STOCK" | "KARIGAR_LEDGER" | "WASTAGE_ANALYSIS">("DAILY_STOCK");
  const [balances, setBalances] = useState<any[]>([]);
  const [karigars, setKarigars] = useState<any[]>([]);
  const [jobCards, setJobCards] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory/balances").then((r) => r.json()),
      fetch("/api/karigars").then((r) => r.json()),
      fetch("/api/gold-issues").then((r) => r.json()),
    ]).then(([bList, kList, jList]) => {
      setBalances(bList);
      setKarigars(kList);
      setJobCards(jList);
    });
  }, []);

  const handleExport = async (format: "CSV" | "TALLY_XML") => {
    setExporting(true);
    setExportSuccess(null);

    try {
      const type = format === "TALLY_XML" ? "TALLY_XML" : `CSV_${reportType}`;
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          dateStart: "2026-11-01",
          dateEnd: "2026-11-05",
        }),
      });

      const data = await res.json();
      setExportSuccess(`Successfully generated ${format} export: ${data.exportId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
            Financial & Bullion Reconciliation
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
            Reconciliation & Accounting Reports
          </h1>
          <p className="text-xs text-[#78716C] mt-1">
            Generate verifiable bullion audit sheets, karigar balance ledgers, and export traceable accounting batches.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport("CSV")}
            disabled={exporting}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FAF7F2] border border-[#DBC485] text-[#8C6A30] hover:bg-[#F3ECD7] transition"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport("TALLY_XML")}
            disabled={exporting}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-luxury transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Tally XML</span>
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="p-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#0D5C3A] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{exportSuccess}</span>
          </div>
          <Link href="/exports" className="font-semibold underline">
            View in Exports Hub &rarr;
          </Link>
        </div>
      )}

      {/* Report Selector Pills */}
      <div className="flex space-x-2 border-b border-[#E7E2DA] pb-3 text-xs">
        <button
          onClick={() => setReportType("DAILY_STOCK")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            reportType === "DAILY_STOCK"
              ? "bg-[#C5A059] text-white shadow-sm"
              : "bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          Consolidated Bullion Stock Sheet
        </button>
        <button
          onClick={() => setReportType("KARIGAR_LEDGER")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            reportType === "KARIGAR_LEDGER"
              ? "bg-[#C5A059] text-white shadow-sm"
              : "bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          Karigar Running Balance Ledger
        </button>
        <button
          onClick={() => setReportType("WASTAGE_ANALYSIS")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            reportType === "WASTAGE_ANALYSIS"
              ? "bg-[#C5A059] text-white shadow-sm"
              : "bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          Wastage & Loss Variance Analysis
        </button>
      </div>

      {/* Report 1: Daily Stock */}
      {reportType === "DAILY_STOCK" && (
        <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-[#FAF7F2] border-b border-[#E7E2DA] flex justify-between items-center text-xs">
            <h3 className="font-serif font-bold text-[#1C1917]">
              Consolidated Fine-Gold Inventory by Strongroom & Purity
            </h3>
            <span className="font-mono text-[#78716C]">Report As Of Today</span>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
              <tr>
                <th className="py-3 px-4">Location Name</th>
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Purity Standard</th>
                <th className="py-3 px-4 text-right">Gross Weight</th>
                <th className="py-3 px-4 text-right">Fine Gold (0.001g)</th>
                <th className="py-3 px-4 text-right">Benchmark Value (@₹7,350/g)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6]">
              {balances.map((b) => (
                <tr key={b.key}>
                  <td className="py-3 px-4 font-semibold text-[#1C1917]">{b.locationName}</td>
                  <td className="py-3 px-4 text-[#78716C]">{b.branchName}</td>
                  <td className="py-3 px-4 font-mono">{b.purityKarats}</td>
                  <td className="py-3 px-4 text-right font-mono">{b.grossWeight.toFixed(3)}g</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#8C6A30]">
                    {b.fineGoldWeight.toFixed(3)}g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#1C1917]">
                    ₹{(b.fineGoldWeight * 7350).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAF7F2] font-bold border-t-2 border-[#1C1917]">
                <td className="py-3 px-4" colSpan={4}>Consolidated Grand Total</td>
                <td className="py-3 px-4 text-right font-mono text-[#8C6A30] text-sm">
                  {balances.reduce((s, b) => s + b.fineGoldWeight, 0).toFixed(3)}g
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm">
                  ₹{(balances.reduce((s, b) => s + b.fineGoldWeight, 0) * 7350).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Report 2: Karigar Ledger */}
      {reportType === "KARIGAR_LEDGER" && (
        <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-[#FAF7F2] border-b border-[#E7E2DA] flex justify-between items-center text-xs">
            <h3 className="font-serif font-bold text-[#1C1917]">
              Artisans Outstanding Fine-Gold Balances
            </h3>
            <span className="font-mono text-[#78716C]">Running Balance Ledger</span>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
              <tr>
                <th className="py-3 px-4">Artisan Code</th>
                <th className="py-3 px-4">Master Karigar Name</th>
                <th className="py-3 px-4">Assigned Workshop</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-right">Outstanding Fine Gold (g)</th>
                <th className="py-3 px-4 text-right">Unreconciled Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6]">
              {karigars.map((k) => (
                <tr key={k.id}>
                  <td className="py-3 px-4 font-mono font-bold text-[#8C6A30]">{k.code}</td>
                  <td className="py-3 px-4 font-semibold text-[#1C1917]">{k.name}</td>
                  <td className="py-3 px-4 text-[#78716C]">{k.workshop}</td>
                  <td className="py-3 px-4 text-[#78716C] font-mono">{k.phone}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#1C1917]">
                    {Number(k.runningBalanceFine).toFixed(3)}g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#78716C]">
                    ₹{(Number(k.runningBalanceFine) * 7350).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAF7F2] font-bold border-t-2 border-[#1C1917]">
                <td className="py-3 px-4" colSpan={4}>Total Karigar WIP Bullion Exposure</td>
                <td className="py-3 px-4 text-right font-mono text-[#B45309] text-sm">
                  {karigars.reduce((s, k) => s + Number(k.runningBalanceFine), 0).toFixed(3)}g
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm">
                  ₹{(karigars.reduce((s, k) => s + Number(k.runningBalanceFine), 0) * 7350).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Report 3: Wastage Analysis */}
      {reportType === "WASTAGE_ANALYSIS" && (
        <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-[#FAF7F2] border-b border-[#E7E2DA] flex justify-between items-center text-xs">
            <h3 className="font-serif font-bold text-[#1C1917]">
              Wastage Tolerance vs Actual Metal Loss Analysis
            </h3>
            <span className="font-mono text-[#78716C]">Job Card Reconciliations</span>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
              <tr>
                <th className="py-3 px-4">Job #</th>
                <th className="py-3 px-4">Artisan</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Fine Issued</th>
                <th className="py-3 px-4 text-right">Actual Wastage</th>
                <th className="py-3 px-4 text-right">Allowed Ceiling</th>
                <th className="py-3 px-4 text-right">Excess Loss Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6]">
              {jobCards.map((j) => {
                const rcp = j.receipts?.[0];
                return (
                  <tr key={j.id}>
                    <td className="py-3 px-4 font-mono font-bold text-[#1C1917]">{j.jobNumber}</td>
                    <td className="py-3 px-4 font-medium">{j.karigarName}</td>
                    <td className="py-3 px-4 text-[#78716C]">{j.categoryName}</td>
                    <td className="py-3 px-4 text-right font-mono">{Number(j.issue?.fineGoldWeight || 0).toFixed(3)}g</td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {rcp ? `${Number(rcp.actualWastage).toFixed(3)}g` : "Pending Return"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#0D5C3A]">
                      {rcp ? `${Number(rcp.allowedWastage).toFixed(3)}g` : `${j.agreedWastagePct}%`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {rcp ? (
                        <span className={Number(rcp.excessWastage) > 0 ? "text-[#991B1B]" : "text-[#78716C]"}>
                          {Number(rcp.excessWastage) > 0 ? `+${Number(rcp.excessWastage).toFixed(3)}g (Alert)` : "0.000g"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

