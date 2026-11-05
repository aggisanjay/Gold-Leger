"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppContext";
import { ShieldCheck, UserCheck, KeyRound, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { switchRole } = useApp();

  const [email, setEmail] = useState("owner@goldtrack.com");
  const [password, setPassword] = useState("GoldTrack@2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    { name: "Rajeshwar Zaveri", role: "SUPER_ADMIN", desc: "Proprietor (Consolidated Access)", email: "owner@goldtrack.com" },
    { name: "Vikramaditya Rathore", role: "BRANCH_MANAGER", desc: "Flagship Colaba Showroom", email: "branch.mgr@goldtrack.com" },
    { name: "Suresh Chandra Parekh", role: "INVENTORY_MANAGER", desc: "Zaveri Bazaar Central Strongroom", email: "inventory.mgr@goldtrack.com" },
    { name: "Kavita Shah, CA", role: "ACCOUNTANT", desc: "Reconciliation & Tally Exports", email: "accountant@goldtrack.com" },
    { name: "Ramesh Baburao Soni", role: "KARIGAR", desc: "Master Artisan (Chains)", email: "karigar.ramesh@goldtrack.com" },
    { name: "Nilesh Varma", role: "OLD_GOLD_STAFF", desc: "Appraiser / Exchange Desk", email: "oldgold.staff@goldtrack.com" },
  ];

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      if (data.user.role === "KARIGAR") {
        router.push("/karigar-portal");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: string) => {
    setLoading(true);
    await switchRole(role);
    if (role === "KARIGAR") {
      router.push("/karigar-portal");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#C5A059] to-[#996515] flex items-center justify-center shadow-luxury mx-auto mb-3">
          <span className="text-white font-serif font-bold text-2xl">G</span>
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#1C1917]">
          GOLDTRACK ERP
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#C5A059] font-semibold mt-1">
          Luxury Bullion & Jewellery Chain Accounting
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Form Box */}
        <div className="bg-white border border-[#E7E2DA] rounded-2xl p-6 shadow-luxury">
          <h2 className="font-serif font-bold text-lg text-[#1C1917] mb-1">Sign In to Workspace</h2>
          <p className="text-xs text-[#78716C] mb-5">
            Role-based security credentials and session authentication.
          </p>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#991B1B]">
              {error}
            </div>
          )}

          <form onSubmit={handleCustomLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#1C1917] mb-1">Corporate Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] mb-1">Security Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-[#C5A059] hover:bg-[#B08A44] text-white shadow-luxury transition"
            >
              {loading ? "Authenticating..." : "Sign In with Credentials"}
            </button>
          </form>
        </div>

        {/* 1-Click Persona Quick Select */}
        <div className="bg-[#FAF7F2] border border-[#DBC485] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#8C6A30] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Demonstration Quick-Personas</span>
          </div>
          <p className="text-xs text-[#78716C] mb-4">
            One-click role switching to evaluate full system permissions across all roles:
          </p>

          <div className="space-y-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                onClick={() => handleQuickLogin(acc.role)}
                className="w-full text-left p-3 rounded-xl bg-white border border-[#E7E2DA] hover:border-[#C5A059] hover:bg-[#FCFBF9] transition flex items-center justify-between group text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-[#1C1917]">{acc.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF7F2] text-[#8C6A30] border border-[#E7E2DA]">
                      {acc.role.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78716C] mt-0.5">{acc.desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#C5A059] group-hover:translate-x-1 transition" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

