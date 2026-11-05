"use client";

import React, { useState, useEffect } from "react";
import { History, ShieldCheck, Search, Filter } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((r) => r.json())
      .then((data) => setLogs(data));
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.userName?.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E7E2DA] pb-5">
        <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
          System Security & Tamper-Evident Ledger
        </span>
        <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
          Regulatory Audit Trail
        </h1>
        <p className="text-xs text-[#78716C] mt-1">
          Every bullion issue, receipt, stock transfer, old-gold valuation, and discrepancy resolution is immutably timestamped.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716C]" />
        <input
          type="text"
          placeholder="Search by action, operator, details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
        />
      </div>

      <div className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#FAF7F2] border-b border-[#E7E2DA] text-[#78716C]">
            <tr>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity Type</th>
              <th className="py-3 px-4">Entity ID</th>
              <th className="py-3 px-4">Authorized Operator</th>
              <th className="py-3 px-4">Transaction Summary / Details</th>
              <th className="py-3 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4EFE6]">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-[#FCFBF9] transition">
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF7F2] text-[#8C6A30] border border-[#E7E2DA]">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono font-medium text-[#78716C]">{log.entityType}</td>
                <td className="py-3 px-4 font-mono text-[#78716C]">{log.entityId}</td>
                <td className="py-3 px-4 font-semibold text-[#1C1917]">{log.userName || "Operator"}</td>
                <td className="py-3 px-4 text-[#57534E] max-w-md truncate">{log.details}</td>
                <td className="py-3 px-4 text-right font-mono text-[11px] text-[#78716C]">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

