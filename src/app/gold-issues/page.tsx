"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Search, Printer, Eye, Clock, CheckCircle2 } from "lucide-react";
import { PrintSlipModal } from "@/components/PrintSlipModal";

export default function GoldIssuesPage() {
  const [jobCards, setJobCards] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/gold-issues")
      .then((res) => res.json())
      .then((data) => setJobCards(data))
      .catch((err) => console.error(err));
  }, []);

  const filtered = jobCards.filter((job) => {
    const matchesSearch =
      job.jobNumber.toLowerCase().includes(search.toLowerCase()) ||
      job.karigarName?.toLowerCase().includes(search.toLowerCase()) ||
      job.categoryName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
            Bullion Custody & Dispatch
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
            Gold Issue Register & Job Cards
          </h1>
          <p className="text-xs text-[#78716C] mt-1">
            All fine-gold bullion issued to karigars for manufacturing with agreed category wastage allowances.
          </p>
        </div>
        <Link
          href="/gold-issues/new"
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-luxury transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Gold Issue</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between bg-white p-4 rounded-xl border border-[#E7E2DA]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716C]" />
          <input
            type="text"
            placeholder="Search job number, karigar, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-[#78716C]">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg px-3 py-2 font-medium text-[#1C1917] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Job Card Table */}
      <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
              <tr>
                <th className="py-3 px-4">Job Number</th>
                <th className="py-3 px-4">Karigar (Artisan)</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Gross Issued</th>
                <th className="py-3 px-4 text-right">Purity</th>
                <th className="py-3 px-4 text-right">Fine Gold</th>
                <th className="py-3 px-4 text-right">Agreed Wastage</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6]">
              {filtered.map((job) => (
                <tr key={job.id} className="hover:bg-[#FCFBF9] transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#1C1917]">
                    <Link href={`/job-cards/${job.id}`} className="hover:text-[#C5A059] hover:underline">
                      {job.jobNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-[#1C1917]">{job.karigarName}</td>
                  <td className="py-3 px-4 text-[#78716C]">{job.categoryName}</td>
                  <td className="py-3 px-4 text-right font-mono font-medium">
                    {Number(job.issue?.grossWeight || 0).toFixed(3)}g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#78716C]">
                    {Number(job.issue?.purityPct || 0).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#8C6A30]">
                    {Number(job.issue?.fineGoldWeight || 0).toFixed(3)}g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#0D5C3A] font-semibold">
                    {Number(job.agreedWastagePct).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.status === "COMPLETED"
                          ? "bg-[#ECFDF5] text-[#0D5C3A] border border-[#A7F3D0]"
                          : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                      }`}
                    >
                      {job.status === "COMPLETED" ? (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      ) : (
                        <Clock className="w-3 h-3 mr-1" />
                      )}
                      {job.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() =>
                        setSelectedSlip({
                          title: "GOLD ISSUE VOUCHER",
                          slipNumber: job.issue?.slipNumber || "ISS-0000",
                          date: job.issue?.issueDate || job.createdAt,
                          partyName: job.karigarName,
                          categoryOrDesc: `${job.categoryName} — ${job.notes || "Custom order"}`,
                          items: [
                            {
                              label: "Issued Raw Bullion Grain / Bar",
                              grossWeight: job.issue?.grossWeight || 0,
                              purity: job.issue?.purityPct || 91.6,
                              fineWeight: job.issue?.fineGoldWeight || 0,
                            },
                          ],
                          notes: `Agreed wastage tolerance: ${job.agreedWastagePct}%. Target date: ${new Date(
                            job.targetCompletionDate
                          ).toLocaleDateString()}`,
                        })
                      }
                      className="p-1 rounded bg-[#FAF7F2] border border-[#E7E2DA] hover:bg-[#F3ECD7] text-[#8C6A30] transition inline-flex"
                      title="Print Issue Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/job-cards/${job.id}`}
                      className="p-1 rounded bg-[#FAF7F2] border border-[#E7E2DA] hover:bg-[#F3ECD7] text-[#78716C] hover:text-[#1C1917] transition inline-flex"
                      title="View Job Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Slip Modal */}
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

