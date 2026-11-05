"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Search,
} from "lucide-react";

export default function WastageAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAlerts = () => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => setAlerts(data));
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/alerts/${selectedAlert.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESOLVED",
          resolutionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedAlert(null);
      setResolutionNotes("");
      fetchAlerts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = alerts.filter(
    (a) => statusFilter === "ALL" || a.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#991B1B]">
            Discrepancy & Loss Investigation
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
            Wastage & Bullion Loss Alerts
          </h1>
          <p className="text-xs text-[#78716C] mt-1">
            Automated compliance engine tracking excess karigar wastage, unexplained losses, and overdue jobs.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[#78716C]">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#E7E2DA] rounded-lg px-3 py-1.5 font-semibold text-[#1C1917] focus:outline-none"
          >
            <option value="ALL">All Alerts</option>
            <option value="OPEN">Open (Action Required)</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-4">
        {filtered.map((alert) => (
          <div
            key={alert.id}
            className={`p-5 rounded-xl border transition shadow-sm ${
              alert.status === "RESOLVED"
                ? "bg-[#FAF7F2] border-[#E7E2DA]"
                : alert.severity === "CRITICAL"
                ? "bg-[#FFF5F5] border-[#FCA5A5]"
                : "bg-[#FFFBEB] border-[#FDE68A]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-3">
              <div className="flex items-center space-x-3">
                <span className="font-mono font-bold text-sm text-[#1C1917]">
                  {alert.alertNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    alert.severity === "CRITICAL"
                      ? "bg-[#991B1B] text-white"
                      : alert.severity === "HIGH"
                      ? "bg-[#DC2626] text-white"
                      : "bg-[#B45309] text-white"
                  }`}
                >
                  {alert.severity}
                </span>
                <span className="text-xs font-semibold text-[#78716C]">
                  {alert.alertType.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    alert.status === "RESOLVED"
                      ? "bg-[#ECFDF5] text-[#0D5C3A]"
                      : "bg-[#FEF2F2] text-[#991B1B]"
                  }`}
                >
                  {alert.status}
                </span>
                <span className="text-[#78716C] font-mono text-[11px]">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-3 text-xs">
              <div>
                <span className="text-[#78716C]">Job Reference:</span>
                <p className="font-mono font-bold text-[#1C1917]">
                  <Link href={`/job-cards/${alert.jobCardId}`} className="hover:underline text-[#C5A059]">
                    {alert.jobNumber}
                  </Link>
                </p>
              </div>
              <div>
                <span className="text-[#78716C]">Artisan / Karigar:</span>
                <p className="font-bold text-[#1C1917]">{alert.karigarName}</p>
              </div>
              <div>
                <span className="text-[#78716C]">Allowed Tolerance:</span>
                <p className="font-mono text-[#0D5C3A] font-semibold">{alert.expectedValue}g</p>
              </div>
              <div>
                <span className="text-[#78716C]">Variance / Excess Loss:</span>
                <p className="font-mono font-bold text-[#991B1B] text-sm">
                  +{alert.differenceGrams}g Fine Gold
                </p>
              </div>
            </div>

            <p className="text-xs text-[#1C1917] bg-white/70 p-3 rounded border border-black/5">
              {alert.notes}
            </p>

            {alert.resolutionNotes && (
              <div className="mt-2 text-xs text-[#0D5C3A] bg-[#ECFDF5] p-3 rounded border border-[#A7F3D0]">
                <strong>Formal Resolution Notes:</strong> {alert.resolutionNotes}
              </div>
            )}

            {alert.status !== "RESOLVED" && (
              <div className="mt-4 pt-3 border-t border-black/5 flex justify-end">
                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white shadow-sm transition"
                >
                  Submit Investigation & Resolution
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resolve Alert Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#DBC485] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-xs">
            <div className="p-5 bg-[#FAF7F2] border-b border-[#E7E2DA] flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917]">
                  Resolve Discrepancy Alert: {selectedAlert.alertNumber}
                </h3>
                <p className="text-[#78716C]">Submit signed recovery action or approved loss sign-off.</p>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-[#78716C]">
                &times;
              </button>
            </div>

            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div className="p-3 bg-[#FAF7F2] rounded border border-[#E7E2DA] space-y-1">
                <p>
                  <strong>Karigar:</strong> {selectedAlert.karigarName}
                </p>
                <p>
                  <strong>Unexplained Loss:</strong>{" "}
                  <span className="font-mono font-bold text-[#991B1B]">{selectedAlert.differenceGrams}g fine gold</span>
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Investigation Findings & Corrective Action *
                </label>
                <textarea
                  required
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Bench crucible filings recovery recovered 1.8g. Remaining 0.3g debited to artisan account..."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E7E2DA]">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 font-semibold text-[#78716C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 font-semibold bg-[#0D5C3A] hover:bg-[#047857] text-white rounded-lg shadow-sm"
                >
                  {loading ? "Recording..." : "Acknowledge & Close Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

