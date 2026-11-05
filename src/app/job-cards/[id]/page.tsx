"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Scale,
  Sparkles,
  Layers,
} from "lucide-react";
import { PrintSlipModal } from "@/components/PrintSlipModal";

export default function JobCardDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/gold-issues/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setJob(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading || !job) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-xs text-[#78716C]">
        Loading job card details...
      </div>
    );
  }

  // Calculate totals across receipts
  const receipts = job.receipts || [];
  const totalRecoveredFine = receipts.reduce(
    (acc: number, r: any) => acc + Number(r.totalRecoveredFineGold || 0),
    0
  );
  const totalActualWastage = receipts.reduce(
    (acc: number, r: any) => acc + Number(r.actualWastage || 0),
    0
  );
  const totalAllowedWastage = receipts.reduce(
    (acc: number, r: any) => acc + Number(r.allowedWastage || 0),
    0
  );
  const totalExcessWastage = receipts.reduce(
    (acc: number, r: any) => acc + Number(r.excessWastage || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-4">
        <Link href="/gold-issues" className="flex items-center text-xs text-[#78716C] hover:text-[#1C1917]">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to Issues Register</span>
        </Link>
        <div className="flex items-center space-x-3">
          <button
            onClick={() =>
              setSelectedSlip({
                title: "JOB CARD SUMMARY & AUDIT SLIP",
                slipNumber: job.jobNumber,
                date: job.createdAt,
                partyName: job.karigar?.name || "Artisan",
                categoryOrDesc: job.category?.name || "Jewellery",
                items: [
                  {
                    label: "Issued Fine Bullion",
                    grossWeight: job.issue?.grossWeight || 0,
                    purity: job.issue?.purityPct || 91.6,
                    fineWeight: job.issue?.fineGoldWeight || 0,
                  },
                  ...receipts.flatMap((r: any) =>
                    r.items.map((i: any) => ({
                      label: `${i.itemType.replace("_", " ")} — ${i.description}`,
                      grossWeight: i.grossWeight,
                      purity: i.purityPct,
                      fineWeight: i.fineGoldWeight,
                    }))
                  ),
                ],
                wastageDetails:
                  receipts.length > 0
                    ? {
                        actualWastage: totalActualWastage,
                        allowedWastage: totalAllowedWastage,
                        excessWastage: totalExcessWastage,
                      }
                    : undefined,
                notes: job.notes,
              })
            }
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] border border-[#DBC485] text-[#8C6A30] hover:bg-[#F3ECD7] transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Job Sheet</span>
          </button>
          {job.status === "IN_PROGRESS" && (
            <Link
              href={`/gold-receipts/new?jobId=${job.id}`}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-luxury transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Receive Finished Ornaments</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E7E2DA] rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#FAF7F2] border-b border-[#E7E2DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-serif font-bold text-[#1C1917] font-mono">
                {job.jobNumber}
              </h1>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold ${
                  job.status === "COMPLETED"
                    ? "bg-[#ECFDF5] text-[#0D5C3A] border border-[#A7F3D0]"
                    : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                }`}
              >
                {job.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-[#78716C] mt-1">
              Category: <span className="font-semibold text-[#1C1917]">{job.category?.name}</span> &bull; Workshop: <span className="font-semibold text-[#1C1917]">{job.branch?.name}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider">
              Issued Bullion Slip
            </span>
            <p className="font-mono text-sm font-bold text-[#8C6A30]">
              {job.issue?.slipNumber}
            </p>
          </div>
        </div>

        {/* 4 Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[#E7E2DA] border-b border-[#E7E2DA] bg-[#FCFBF9]">
          <div className="p-4">
            <span className="text-[10px] uppercase font-bold text-[#78716C]">Fine Gold Issued</span>
            <p className="text-lg font-mono font-bold text-[#1C1917] mt-1">
              {Number(job.issue?.fineGoldWeight || 0).toFixed(3)}g
            </p>
            <p className="text-[10px] text-[#78716C]">
              Gross: {Number(job.issue?.grossWeight || 0).toFixed(3)}g @ {job.issue?.purityPct}%
            </p>
          </div>
          <div className="p-4">
            <span className="text-[10px] uppercase font-bold text-[#78716C]">Agreed Wastage Ceiling</span>
            <p className="text-lg font-mono font-bold text-[#0D5C3A] mt-1">
              {Number(job.agreedWastagePct).toFixed(2)}%
            </p>
            <p className="text-[10px] text-[#78716C]">
              Max Allowed: {(Number(job.issue?.fineGoldWeight || 0) * (Number(job.agreedWastagePct) / 100)).toFixed(3)}g
            </p>
          </div>
          <div className="p-4">
            <span className="text-[10px] uppercase font-bold text-[#78716C]">Total Fine Recovered</span>
            <p className="text-lg font-mono font-bold text-[#8C6A30] mt-1">
              {totalRecoveredFine.toFixed(3)}g
            </p>
            <p className="text-[10px] text-[#78716C]">
              Jewellery + Scrap + Filings
            </p>
          </div>
          <div className="p-4">
            <span className="text-[10px] uppercase font-bold text-[#78716C]">Excess Wastage Breached</span>
            <p className={`text-lg font-mono font-bold mt-1 ${totalExcessWastage > 0 ? "text-[#991B1B]" : "text-[#78716C]"}`}>
              {totalExcessWastage.toFixed(3)}g
            </p>
            <p className="text-[10px] text-[#78716C]">
              {totalExcessWastage > 0 ? "Loss Alert Active" : "Within Agreed Allowance"}
            </p>
          </div>
        </div>

        {/* Karigar & Target Details */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-[#E7E2DA]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716C] mb-2">
              Assigned Master Artisan
            </h3>
            <div className="bg-[#FAF7F2] p-4 rounded-lg border border-[#E7E2DA]">
              <p className="text-sm font-bold text-[#1C1917]">{job.karigar?.name}</p>
              <p className="text-xs text-[#78716C] mt-0.5 font-mono">{job.karigar?.code} &bull; {job.karigar?.phone}</p>
              <p className="text-xs text-[#78716C] mt-1">Assigned Bay: {job.karigar?.workshop}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716C] mb-2">
              Schedule & Notes
            </h3>
            <div className="bg-[#FAF7F2] p-4 rounded-lg border border-[#E7E2DA] space-y-1 text-xs">
              <p className="text-[#1C1917]">
                <span className="text-[#78716C]">Target Date:</span>{" "}
                <span className="font-semibold">{new Date(job.targetCompletionDate).toLocaleDateString()}</span>
              </p>
              {job.actualCompletionDate && (
                <p className="text-[#0D5C3A]">
                  <span className="text-[#78716C]">Reconciled On:</span>{" "}
                  <span className="font-semibold">{new Date(job.actualCompletionDate).toLocaleDateString()}</span>
                </p>
              )}
              <p className="text-[#57534E] pt-1">
                <span className="text-[#78716C]">Instructions:</span> {job.notes || "None"}
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Receipts Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold text-base text-[#1C1917]">
              Receipt & Wastage Audit Records
            </h3>
            <span className="text-xs font-mono font-medium text-[#78716C]">
              {receipts.length} Receipt Record(s)
            </span>
          </div>

          {receipts.length === 0 ? (
            <div className="text-center py-8 bg-[#FAF7F2] rounded-lg border border-dashed border-[#E7E2DA]">
              <Clock className="w-6 h-6 text-[#C5A059] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#1C1917]">Gold is currently with the artisan</p>
              <p className="text-[11px] text-[#78716C] mt-0.5">
                Record finished ornaments, scrap, and filings once returned to reconcile this job.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((rcp: any) => (
                <div key={rcp.id} className="border border-[#E7E2DA] rounded-lg overflow-hidden">
                  <div className="p-3 bg-[#FAF7F2] border-b border-[#E7E2DA] flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#1C1917]">{rcp.receiptNumber}</span>
                    <span className="text-[#78716C]">
                      Date: {new Date(rcp.receiptDate).toLocaleDateString()}
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="text-[#78716C] bg-white border-b border-[#F4EFE6]">
                      <tr>
                        <th className="py-2 px-3">Item Classification</th>
                        <th className="py-2 px-3">Description & HUID</th>
                        <th className="py-2 px-3 text-right">Gross Wt</th>
                        <th className="py-2 px-3 text-right">Purity</th>
                        <th className="py-2 px-3 text-right">Fine Gold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4EFE6]">
                      {rcp.items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF7F2] border border-[#E7E2DA]">
                              {item.itemType}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-[#1C1917]">
                            {item.description} {item.huid && <span className="font-mono text-[#8C6A30]">({item.huid})</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{Number(item.grossWeight).toFixed(3)}g</td>
                          <td className="py-2 px-3 text-right font-mono">{Number(item.purityPct).toFixed(2)}%</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#8C6A30]">
                            {Number(item.fineGoldWeight).toFixed(3)}g
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Receipt Wastage Footer */}
                  <div className="p-3 bg-[#FCFBF9] border-t border-[#E7E2DA] flex justify-between text-xs font-mono">
                    <span className="text-[#78716C]">
                      Actual Wastage: <strong className="text-[#1C1917]">{Number(rcp.actualWastage).toFixed(3)}g</strong> | Allowed: <strong className="text-[#0D5C3A]">{Number(rcp.allowedWastage).toFixed(3)}g</strong>
                    </span>
                    <span className={Number(rcp.excessWastage) > 0 ? "text-[#991B1B] font-bold" : "text-[#78716C]"}>
                      Excess Loss: {Number(rcp.excessWastage).toFixed(3)}g
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

