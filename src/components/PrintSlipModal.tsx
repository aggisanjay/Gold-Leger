"use client";

import React from "react";
import { Printer, X } from "lucide-react";

interface PrintSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  slipNumber: string;
  date: string;
  partyName: string;
  categoryOrDesc: string;
  items: Array<{
    label: string;
    grossWeight: string | number;
    purity: string | number;
    fineWeight: string | number;
  }>;
  wastageDetails?: {
    actualWastage: number;
    allowedWastage: number;
    excessWastage: number;
  };
  notes?: string;
}

export function PrintSlipModal({
  isOpen,
  onClose,
  title,
  slipNumber,
  date,
  partyName,
  categoryOrDesc,
  items,
  wastageDetails,
  notes,
}: PrintSlipModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#FAF7F2] border border-[#DBC485] rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print p-4 bg-[#FDFBF7] border-b border-[#E7E2DA] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-sm text-[#1C1917]">{title}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#F3ECD7] text-[#8C6A30] font-mono font-semibold">
              {slipNumber}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#78716C] hover:bg-[#F4EFE6] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper Surface */}
        <div className="p-8 overflow-y-auto bg-white text-[#1C1917] printable-slip font-sans">
          {/* Header */}
          <div className="border-b-2 border-[#1C1917] pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-wider text-[#1C1917]">
                GOLDTRACK ERP
              </h1>
              <p className="text-xs text-[#57534E] uppercase tracking-widest font-medium">
                Official Jewellery & Bullion Movement Voucher
              </p>
              <p className="text-xs text-[#78716C] mt-1">Zaveri Bazaar Central Strongroom &bull; SEEPZ Workshop</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 border border-[#1C1917] text-xs font-mono font-bold">
                {slipNumber}
              </span>
              <p className="text-xs text-[#78716C] mt-1 font-mono">Date: {new Date(date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-[#FAF7F2] p-4 rounded border border-[#E7E2DA] mb-6 text-xs">
            <div>
              <p className="text-[#78716C]">Karigar / Customer / Party:</p>
              <p className="font-bold text-[#1C1917] text-sm mt-0.5">{partyName}</p>
            </div>
            <div>
              <p className="text-[#78716C]">Category / Description:</p>
              <p className="font-semibold text-[#1C1917] mt-0.5">{categoryOrDesc}</p>
            </div>
          </div>

          {/* Itemized Gold Accounting Table */}
          <table className="w-full text-xs text-left border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-[#1C1917] bg-[#F4EFE6]">
                <th className="py-2 px-3 font-bold">Particulars / Item</th>
                <th className="py-2 px-3 font-bold text-right">Gross Weight</th>
                <th className="py-2 px-3 font-bold text-right">Purity %</th>
                <th className="py-2 px-3 font-bold text-right">Fine Gold (0.001g)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-[#E7E2DA]">
                  <td className="py-2 px-3 font-medium">{item.label}</td>
                  <td className="py-2 px-3 text-right font-mono">{Number(item.grossWeight).toFixed(3)}g</td>
                  <td className="py-2 px-3 text-right font-mono">{Number(item.purity).toFixed(2)}%</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-[#8C6A30]">
                    {Number(item.fineWeight).toFixed(3)}g
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#1C1917] font-bold bg-[#FAF7F2]">
                <td className="py-2 px-3">Total Fine Gold Weight</td>
                <td colSpan={2}></td>
                <td className="py-2 px-3 text-right font-mono text-sm text-[#8C6A30]">
                  {items.reduce((sum, i) => sum + Number(i.fineWeight), 0).toFixed(3)}g
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Wastage Breakdown If Available */}
          {wastageDetails && (
            <div className="bg-[#FCFBF9] border border-[#E7E2DA] p-3 rounded mb-6 text-xs">
              <h4 className="font-serif font-bold text-[#1C1917] mb-2">Reconciliation & Wastage Audit:</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[#78716C]">Actual Wastage:</span>
                  <p className="font-mono font-bold">{wastageDetails.actualWastage.toFixed(3)}g</p>
                </div>
                <div>
                  <span className="text-[#78716C]">Allowed Wastage:</span>
                  <p className="font-mono font-bold text-[#0D5C3A]">{wastageDetails.allowedWastage.toFixed(3)}g</p>
                </div>
                <div>
                  <span className="text-[#78716C]">Excess Loss:</span>
                  <p className={`font-mono font-bold ${wastageDetails.excessWastage > 0 ? "text-[#991B1B]" : "text-[#78716C]"}`}>
                    {wastageDetails.excessWastage.toFixed(3)}g
                  </p>
                </div>
              </div>
            </div>
          )}

          {notes && (
            <p className="text-xs text-[#78716C] mb-8 italic">
              Remarks: {notes}
            </p>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-8 border-t border-[#E7E2DA] text-xs">
            <div className="text-center">
              <div className="h-10 border-b border-dashed border-[#78716C] mb-1"></div>
              <p className="text-[#78716C]">Authorized Bullion Officer / Custodian</p>
            </div>
            <div className="text-center">
              <div className="h-10 border-b border-dashed border-[#78716C] mb-1"></div>
              <p className="text-[#78716C]">Karigar / Recipient Acknowledged</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

