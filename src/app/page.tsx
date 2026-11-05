"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Vault,
  Users,
  Hammer,
  Store,
  Flame,
  AlertOctagon,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Scale,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    setLoading(true);
    fetch("/api/reports/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#C5A059] animate-spin" />
          <p className="text-sm font-serif text-[#78716C]">Loading Company A, Coimbatore Bullion Ledger...</p>
        </div>
      </div>
    );
  }

  const goldRate = data.goldRatePerGram || 12500;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
              Company A, Coimbatore &bull; 5 Showrooms & Workshop
            </span>
            <span className="text-[10px] bg-[#ECFDF5] text-[#0D5C3A] font-bold px-2 py-0.5 rounded border border-[#A7F3D0]">
              Annual Bullion Volume: 240 kg
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#1C1917] mt-1">
            Executive Gold Position & Loss Control
          </h1>
          <p className="text-sm text-[#78716C] mt-1">
            Real-time daily stock statement across Big Bazaar Central Strongroom, Sullivan Street Workshop, and 5 Showrooms.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchMetrics}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3ECD7] text-[#8C6A30] border border-[#DBC485] transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Audit Ledger</span>
          </button>
          <Link
            href="/gold-issues/new"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-luxury transition"
          >
            <span>Issue Gold to Karigar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Loss Reduction & Reconciliation Performance Tracker Banner */}
      <div className="bg-gradient-to-r from-[#FAF7F2] via-[#F3ECD7] to-[#FAF7F2] border border-[#DBC485] p-5 rounded-2xl shadow-luxury grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="border-r border-[#DBC485]/50 pr-4">
          <div className="flex items-center space-x-2 text-[#8C6A30] text-xs font-bold uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>Loss Reduction Objective</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif font-bold text-[#1C1917]">
              0.40% <span className="text-xs font-sans text-[#78716C]">&rarr;</span> <span className="text-[#0D5C3A]">0.12%</span>
            </p>
            <p className="text-[11px] text-[#78716C] mt-0.5">
              Unexplained loss dropping from ₹1.2 Cr/yr toward &lt; ₹45 Lakhs target.
            </p>
          </div>
        </div>

        <div className="border-r border-[#DBC485]/50 pr-4">
          <div className="flex items-center space-x-2 text-[#8C6A30] text-xs font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Month-End Reconciliation</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif font-bold text-[#1C1917]">
              3 Days <span className="text-xs font-sans text-[#78716C]">&rarr;</span> <span className="text-[#0D5C3A]">0.5 Day</span>
            </p>
            <p className="text-[11px] text-[#78716C] mt-0.5">
              Reduced from 216 person-days (6 people &times; 3 days) to instant daily automated audit.
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2 text-[#8C6A30] text-xs font-bold uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Coimbatore Bullion Rate</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-serif font-bold text-[#1C1917] font-mono">
              ₹{goldRate.toLocaleString("en-IN")}<span className="text-xs font-sans font-normal text-[#78716C]">/g</span>
            </p>
            <p className="text-[11px] text-[#0D5C3A] font-semibold mt-0.5 flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              100% Traceable fine-gold accounting
            </p>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: Fine Gold Stock Across Facilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fine Gold */}
        <div className="p-5 rounded-xl bg-white border border-[#DBC485] shadow-luxury">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8C6A30] uppercase tracking-wider">
              Total Fine Gold Stock
            </span>
            <span className="p-1.5 rounded-lg bg-[#E7D8AE] text-[#6B5023]">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl font-serif font-bold text-[#1C1917] font-mono">
              {data.totalFineGoldStock.toLocaleString("en-IN", { minimumFractionDigits: 3 })}
              <span className="text-base font-sans font-normal text-[#78716C] ml-1">g</span>
            </h2>
            <p className="text-[11px] text-[#78716C] mt-1 font-mono">
              Valuation @ ₹{goldRate.toLocaleString()}/g: ₹
              {(data.totalFineGoldStock * goldRate).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Central Vault Safe */}
        <div className="p-5 rounded-xl bg-white border border-[#E7E2DA] shadow-sm hover:shadow-luxury transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              Central Strongroom Vault
            </span>
            <span className="p-1.5 rounded-lg bg-[#FAF7F2] text-[#C5A059]">
              <Vault className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-serif font-bold text-[#1C1917] font-mono">
              {data.goldInVault.toLocaleString("en-IN", { minimumFractionDigits: 3 })}
              <span className="text-sm font-sans font-normal text-[#78716C] ml-1">g</span>
            </h3>
            <p className="text-[11px] text-[#0D5C3A] font-medium mt-1 flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Big Bazaar Street Bullion Reserve
            </p>
          </div>
        </div>

        {/* Gold with Karigars */}
        <div className="p-5 rounded-xl bg-white border border-[#E7E2DA] shadow-sm hover:shadow-luxury transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              With Karigars (In Production)
            </span>
            <span className="p-1.5 rounded-lg bg-[#FAF7F2] text-[#C5A059]">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-serif font-bold text-[#1C1917] font-mono">
              {data.goldWithKarigars.toLocaleString("en-IN", { minimumFractionDigits: 3 })}
              <span className="text-sm font-sans font-normal text-[#78716C] ml-1">g</span>
            </h3>
            <p className="text-[11px] text-[#B45309] font-medium mt-1 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {data.pendingJobsCount} job cards with artisans
            </p>
          </div>
        </div>

        {/* Showrooms & Sullivan St Workshop */}
        <div className="p-5 rounded-xl bg-white border border-[#E7E2DA] shadow-sm hover:shadow-luxury transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              5 Showrooms + Workshop
            </span>
            <span className="p-1.5 rounded-lg bg-[#FAF7F2] text-[#C5A059]">
              <Store className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-serif font-bold text-[#1C1917] font-mono">
              {(data.goldAtShowrooms + data.goldAtWorkshop).toLocaleString("en-IN", { minimumFractionDigits: 3 })}
              <span className="text-sm font-sans font-normal text-[#78716C] ml-1">g</span>
            </h3>
            <p className="text-[11px] text-[#78716C] mt-1">
              Cross Cut, RS Puram, Peelamedu, Oppanakara, Pollachi
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Bullion Movement & Wastage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
            <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
              Month Bullion Flow
            </span>
            <TrendingUp className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#78716C]">Fine Gold Issued:</span>
              <span className="font-mono font-bold text-[#1C1917]">{data.issuedThisMonth.toFixed(3)}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#78716C]">Fine Gold Recovered:</span>
              <span className="font-mono font-bold text-[#0D5C3A]">{data.receivedThisMonth.toFixed(3)}g</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
            <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
              Wastage Allowance vs Actual
            </span>
            <Scale className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#78716C]">Agreed Allowance Ceiling:</span>
              <span className="font-mono font-bold text-[#0D5C3A]">{data.allowedWastageThisMonth.toFixed(3)}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#78716C]">Actual Wastage Recorded:</span>
              <span className="font-mono font-bold text-[#B45309]">{data.actualWastageThisMonth.toFixed(3)}g</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
            <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
              AI Loss Drift Monitoring
            </span>
            <ShieldCheck className="w-4 h-4 text-[#0D5C3A]" />
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#78716C]">Items Flagged for Review:</span>
              <span className="font-mono font-bold text-[#B45309]">{data.openAlertsCount} Advisory</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#78716C]">Owner Privacy Guard:</span>
              <span className="font-bold text-[#0D5C3A]">Restricted to Partner & Finance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Distribution by Facility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-[#E7E2DA] rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917]">
                Coimbatore Gold Distribution by Facility
              </h3>
              <p className="text-xs text-[#78716C]">Fine gold in grams across vaults, workshops, and 5 showrooms</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-[#FAF7F2] border border-[#E7E2DA] font-mono font-semibold text-[#8C6A30]">
              In Grams (g)
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.branchDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4EFE6" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: "#78716C" }} />
                <YAxis tick={{ fontSize: 10, fill: "#78716C" }} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString("en-IN")}g`, "Fine Gold"]}
                  contentStyle={{ backgroundColor: "#FAF7F2", borderColor: "#DBC485", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="fineGold" fill="#C5A059" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Karigar WIP Balances */}
        <div className="p-6 bg-white border border-[#E7E2DA] rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917]">
                Karigar Outstanding Fine-Gold Balances
              </h3>
              <p className="text-xs text-[#78716C]">Sullivan Street Master Goldsmith running ledger</p>
            </div>
            <Link href="/karigars" className="text-xs font-semibold text-[#C5A059] hover:underline flex items-center">
              <span>View Roster</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="h-64">
            {data.karigarBalancesChart && data.karigarBalancesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.karigarBalancesChart} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4EFE6" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#78716C" }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#1C1917" }} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(3)}g`, "Fine Gold Balance"]}
                    contentStyle={{ backgroundColor: "#FAF7F2", borderColor: "#DBC485", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="fineGold" fill="#8C6A30" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#78716C]">
                All karigars currently reconciled (0g outstanding)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Movements & Discrepancies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E7E2DA] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold text-base text-[#1C1917]">
              Immutable Bullion Transaction Register
            </h3>
            <Link href="/inventory" className="text-xs text-[#C5A059] font-semibold hover:underline">
              Full Ledger &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E7E2DA] text-[#78716C]">
                  <th className="pb-2">TXN #</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Fine Gold</th>
                  <th className="pb-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EFE6]">
                {data.recentMovements.map((txn: any) => (
                  <tr key={txn.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2.5 font-mono font-semibold text-[#1C1917]">{txn.transactionNumber}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF7F2] text-[#8C6A30] border border-[#E7E2DA]">
                        {txn.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-[#1C1917]">
                      {txn.fineGoldWeight.toFixed(3)}g
                    </td>
                    <td className="py-2.5 text-right text-[#78716C] font-mono text-[11px]">
                      {new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Alerts Stream */}
        <div className="bg-white border border-[#E7E2DA] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917]">
                Confidential Loss Advisory Stream
              </h3>
              <p className="text-[11px] text-[#78716C]">Visible exclusively to Head of Finance and Managing Partner</p>
            </div>
            <Link href="/alerts" className="text-xs text-[#991B1B] font-semibold hover:underline">
              Review Alerts &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentAlerts.map((alert: any) => (
              <div
                key={alert.id}
                className="p-3 rounded-lg border text-xs bg-[#FFFBEB] border-[#FDE68A]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#1C1917]">{alert.alertNumber}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#B45309] text-white">
                    {alert.alertType.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="font-medium text-[#1C1917] mt-1.5">{alert.notes}</p>
                <div className="flex items-center justify-between text-[11px] text-[#78716C] mt-2 pt-2 border-t border-black/5">
                  <span>Job: {alert.jobNumber} ({alert.karigarName})</span>
                  <span className="font-bold text-[#991B1B]">
                    Variance: {alert.differenceGrams}g
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
