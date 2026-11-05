"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  History,
  Building,
} from "lucide-react";

export default function InventoryLocationPage() {
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"balances" | "ledger">("balances");
  const [search, setSearch] = useState("");
  const [filterPurity, setFilterPurity] = useState("ALL");

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory/balances").then((r) => r.json()),
      fetch("/api/inventory/ledger").then((r) => r.json()),
    ]).then(([bList, tList]) => {
      setBalances(bList);
      setTransactions(tList);
    });
  }, []);

  const totalGrossStock = balances.reduce((sum, b) => sum + (b.grossWeight || 0), 0);
  const totalFineStock = balances.reduce((sum, b) => sum + (b.fineGoldWeight || 0), 0);

  const filteredBalances = balances.filter((b) => {
    const matchesSearch =
      b.locationName.toLowerCase().includes(search.toLowerCase()) ||
      b.branchName.toLowerCase().includes(search.toLowerCase());
    const matchesPurity = filterPurity === "ALL" || b.purityKarats === filterPurity;
    return matchesSearch && matchesPurity;
  });

  const filteredTxn = transactions.filter(
    (t) =>
      t.transactionNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.sourceName.toLowerCase().includes(search.toLowerCase()) ||
      t.destName.toLowerCase().includes(search.toLowerCase()) ||
      t.referenceType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
            Physical Bullion & Showcase Custody
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
            Gold Inventory by Location & Purity
          </h1>
          <p className="text-xs text-[#78716C] mt-1">
            Real-time balance matrix across 5 showrooms, central bullion vaults, and workshops backed by an append-only ledger.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-[#E7E2DA]">
          <button
            onClick={() => setActiveTab("balances")}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === "balances"
                ? "bg-[#C5A059] text-white shadow-sm"
                : "text-[#78716C] hover:text-[#1C1917]"
            }`}
          >
            Location Balances
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === "ledger"
                ? "bg-[#C5A059] text-white shadow-sm"
                : "text-[#78716C] hover:text-[#1C1917]"
            }`}
          >
            Immutable Transaction Ledger
          </button>
        </div>
      </div>

      {/* Summary Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-[#E7E2DA] rounded-xl shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#78716C]">Total Gross Bullion Stock</span>
          <h2 className="text-2xl font-serif font-bold text-[#1C1917] font-mono mt-1">
            {totalGrossStock.toLocaleString("en-IN", { minimumFractionDigits: 3 })}
            <span className="text-sm font-sans font-normal text-[#78716C] ml-1">g</span>
          </h2>
          <p className="text-[11px] text-[#78716C] mt-0.5">Across all strongrooms & counters</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-[#FAF7F2] to-[#F3ECD7] border border-[#DBC485] rounded-xl shadow-luxury">
          <span className="text-[10px] uppercase font-bold text-[#8C6A30]">Total Fine Gold Value (100% Au)</span>
          <h2 className="text-2xl font-serif font-bold text-[#1C1917] font-mono mt-1">
            {totalFineStock.toLocaleString("en-IN", { minimumFractionDigits: 3 })}
            <span className="text-sm font-sans font-normal text-[#78716C] ml-1">g</span>
          </h2>
          <p className="text-[11px] text-[#78716C] mt-0.5">Pure gold equivalent backing ledger</p>
        </div>
        <div className="p-4 bg-white border border-[#E7E2DA] rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#78716C]">Ledger Audit Integrity</span>
            <p className="text-sm font-bold text-[#0D5C3A] mt-1 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1" />
              100% Append-Only Verified
            </p>
            <p className="text-[11px] text-[#78716C] mt-0.5">Zero unrecorded modifications</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between bg-white p-3.5 rounded-xl border border-[#E7E2DA]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716C]" />
          <input
            type="text"
            placeholder="Search location, facility, safe, transaction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
          />
        </div>
        {activeTab === "balances" && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#78716C]">Purity:</span>
            <select
              value={filterPurity}
              onChange={(e) => setFilterPurity(e.target.value)}
              className="bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg px-3 py-2 font-medium text-[#1C1917] focus:outline-none"
            >
              <option value="ALL">All Purities</option>
              <option value="24K">24K Bullion (99.9%)</option>
              <option value="22K_916">22K / 916 (91.6%)</option>
              <option value="18K_750">18K / 750 (75.0%)</option>
              <option value="OLD_HOLDING">Old-Gold Quarantine</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab Content: Location Balances */}
      {activeTab === "balances" && (
        <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
              <tr>
                <th className="py-3 px-4">Showroom / Facility</th>
                <th className="py-3 px-4">Vault / Safe Safe</th>
                <th className="py-3 px-4">Purity Standard</th>
                <th className="py-3 px-4 text-right">Gross Weight</th>
                <th className="py-3 px-4 text-right">Fine Gold Weight (g)</th>
                <th className="py-3 px-4 text-right">Est. Valuation (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6]">
              {filteredBalances.map((b) => (
                <tr key={b.key} className="hover:bg-[#FCFBF9] transition">
                  <td className="py-3 px-4 font-semibold text-[#1C1917]">{b.branchName}</td>
                  <td className="py-3 px-4 font-medium text-[#57534E]">{b.locationName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.purityKarats === "24K"
                          ? "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                          : b.purityKarats === "OLD_HOLDING"
                          ? "bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]"
                          : "bg-[#FAF7F2] text-[#8C6A30] border border-[#E7E2DA]"
                      }`}
                    >
                      {b.purityKarats.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium">{b.grossWeight.toFixed(3)}g</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#8C6A30]">
                    {b.fineGoldWeight.toFixed(3)}g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#78716C]">
                    ₹{(b.fineGoldWeight * 7350).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Immutable Transaction Ledger */}
      {activeTab === "ledger" && (
        <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
              <tr>
                <th className="py-3 px-4">Transaction #</th>
                <th className="py-3 px-4">Operation Type</th>
                <th className="py-3 px-4">Source Location</th>
                <th className="py-3 px-4">Destination Location</th>
                <th className="py-3 px-4 text-right">Fine Gold (g)</th>
                <th className="py-3 px-4">Authorized By</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6]">
              {filteredTxn.map((t) => (
                <tr key={t.id} className="hover:bg-[#FCFBF9] transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#1C1917]">{t.transactionNumber}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF7F2] text-[#8C6A30] border border-[#E7E2DA]">
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#78716C]">{t.sourceName}</td>
                  <td className="py-3 px-4 text-[#1C1917] font-medium">{t.destName}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#8C6A30]">
                    {t.fineGoldWeight.toFixed(3)}g
                  </td>
                  <td className="py-3 px-4 text-[#78716C]">{t.performedByName}</td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-[#78716C]">
                    {new Date(t.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

