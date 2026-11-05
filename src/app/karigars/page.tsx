"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  PlusCircle,
  Search,
  Phone,
  Briefcase,
  Scale,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function KarigarDirectoryPage() {
  const [karigars, setKarigars] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // New Karigar Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [workshop, setWorkshop] = useState("SEEPZ Bay A");
  const [notes, setNotes] = useState("");
  const [rates, setRates] = useState<Record<string, number>>({
    "cat-01": 1.0,
    "cat-02": 0.8,
    "cat-03": 1.2,
    "cat-04": 0.9,
    "cat-05": 1.1,
  });
  const [loading, setLoading] = useState(false);

  const fetchKarigars = () => {
    fetch("/api/karigars")
      .then((r) => r.json())
      .then((data) => setKarigars(data));
  };

  useEffect(() => {
    fetchKarigars();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((cList) => setCategories(cList));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/karigars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          workshop,
          wastageRates: rates,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowModal(false);
      fetchKarigars();
      setName("");
      setNotes("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = karigars.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.code.toLowerCase().includes(search.toLowerCase()) ||
      k.workshop.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
            Master Artisan Roster
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
            Karigar Management & Wastage Allowances
          </h1>
          <p className="text-xs text-[#78716C] mt-1">
            Configure individual artisan wastage tolerance percentages by category and monitor running gold balances.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-luxury transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Karigar</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716C]" />
        <input
          type="text"
          placeholder="Search by artisan name, code, workshop..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
        />
      </div>

      {/* Karigars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((k) => (
          <div
            key={k.id}
            className="p-5 bg-white border border-[#E7E2DA] rounded-xl shadow-sm hover:shadow-luxury transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF7F2] text-[#8C6A30] border border-[#E7E2DA]">
                    {k.code}
                  </span>
                  <h3 className="font-serif font-bold text-base text-[#1C1917] mt-1.5">{k.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#78716C] block">Running Balance</span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      Number(k.runningBalanceFine) > 0 ? "text-[#B45309]" : "text-[#0D5C3A]"
                    }`}
                  >
                    {Number(k.runningBalanceFine).toFixed(3)}g
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-[#78716C]">
                <p className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-[#C5A059]" />
                  <span>{k.phone}</span>
                </p>
                <p className="flex items-center">
                  <Briefcase className="w-3.5 h-3.5 mr-1.5 text-[#C5A059]" />
                  <span>{k.workshop}</span>
                </p>
              </div>

              {/* Wastage Matrix Breakdown */}
              <div className="mt-4 pt-3 border-t border-[#F4EFE6]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] block mb-2">
                  Configured Category Wastage Ceilings:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                  <div className="bg-[#FAF7F2] px-2 py-1 rounded flex justify-between">
                    <span className="text-[#78716C]">Chains:</span>
                    <span className="font-bold text-[#1C1917]">{k.wastageRates?.["cat-01"] ?? 1.0}%</span>
                  </div>
                  <div className="bg-[#FAF7F2] px-2 py-1 rounded flex justify-between">
                    <span className="text-[#78716C]">Rings:</span>
                    <span className="font-bold text-[#1C1917]">{k.wastageRates?.["cat-02"] ?? 0.8}%</span>
                  </div>
                  <div className="bg-[#FAF7F2] px-2 py-1 rounded flex justify-between">
                    <span className="text-[#78716C]">Necklaces:</span>
                    <span className="font-bold text-[#1C1917]">{k.wastageRates?.["cat-03"] ?? 1.2}%</span>
                  </div>
                  <div className="bg-[#FAF7F2] px-2 py-1 rounded flex justify-between">
                    <span className="text-[#78716C]">Bangles:</span>
                    <span className="font-bold text-[#1C1917]">{k.wastageRates?.["cat-04"] ?? 0.9}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F4EFE6] flex items-center justify-between text-xs">
              <span className="text-[#78716C] font-medium">
                {k.activeJobsCount} Active Production Job(s)
              </span>
              <Link
                href={`/gold-issues?karigarId=${k.id}`}
                className="text-[#C5A059] font-semibold hover:underline flex items-center"
              >
                <span>Job History</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* New Karigar Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#DBC485] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-xs">
            <div className="p-5 bg-[#FAF7F2] border-b border-[#E7E2DA] flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917]">
                  Register Master Artisan (Karigar)
                </h3>
                <p className="text-[#78716C]">Configure contact and category wastage allowances.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#78716C]">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shyamal Ghosh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">Assigned Workshop Bay *</label>
                  <input
                    type="text"
                    required
                    value={workshop}
                    onChange={(e) => setWorkshop(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                  />
                </div>
              </div>

              {/* Category Wastage Settings */}
              <div>
                <label className="block font-bold text-[#1C1917] mb-1.5">
                  Agreed Wastage Percentage by Category (%)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 bg-[#FAF7F2] rounded border border-[#E7E2DA]">
                      <span className="text-[#78716C] truncate mr-2">{cat.name.split(" ")[0]}:</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="10"
                        value={rates[cat.id] ?? cat.defaultMaxWastagePct}
                        onChange={(e) =>
                          setRates({ ...rates, [cat.id]: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 p-1 text-right font-mono font-bold bg-white border border-[#E7E2DA] rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Notes / Specialization</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Master filigree worker; 15 years experience..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded"
                ></textarea>
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
                  {loading ? "Registering..." : "Save Karigar Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

