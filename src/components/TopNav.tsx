"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "./AppContext";
import {
  Bell,
  Building,
  PlusCircle,
  Coins,
  Scale,
  Sparkles,
  UserCheck,
} from "lucide-react";

export function TopNav() {
  const { user, switchRole, selectedBranch, setSelectedBranch, unreadAlertsCount } = useApp();

  const demoRoles = [
    { label: "Owner / Super Admin", role: "SUPER_ADMIN" },
    { label: "Branch Manager (Colaba)", role: "BRANCH_MANAGER" },
    { label: "Inventory Manager (Vault)", role: "INVENTORY_MANAGER" },
    { label: "Accountant", role: "ACCOUNTANT" },
    { label: "Karigar (Artisan Ramesh)", role: "KARIGAR" },
    { label: "Old-Gold Desk Staff", role: "OLD_GOLD_STAFF" },
  ];

  return (
    <header className="h-20 bg-[#FDFBF7] border-b border-[#E7E2DA] flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Global Location & Live Ticker */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 bg-[#FAF7F2] border border-[#E7E2DA] rounded-lg px-3 py-1.5">
          <Building className="w-4 h-4 text-[#C5A059]" />
          <span className="text-xs font-medium text-[#78716C]">Scope:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#1C1917] focus:outline-none cursor-pointer"
          >
            <option value="ALL">Consolidated (All 5 Showrooms + Vault + Workshop)</option>
            <option value="b-01">Colaba Showroom (SHW-01)</option>
            <option value="b-02">Bandra Boutique (SHW-02)</option>
            <option value="b-03">Juhu Signature (SHW-03)</option>
            <option value="b-04">Andheri West (SHW-04)</option>
            <option value="b-05">Thane Pavilion (SHW-05)</option>
            <option value="b-06">Zaveri Bazaar Central Vault (VLT-01)</option>
            <option value="b-07">SEEPZ Master Workshop (WRK-01)</option>
            <option value="b-08">Shirpur Refinery Transit (REF-01)</option>
          </select>
        </div>

        {/* Live Daily Bullion Rates */}
        <div className="hidden lg:flex items-center space-x-3 text-xs bg-[#FAF7F2] border border-[#E7E2DA] px-3 py-1.5 rounded-lg">
          <Coins className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="text-[#78716C]">Daily Bullion Reference:</span>
          <span className="font-semibold text-[#1C1917]">
            24K: <span className="text-[#C5A059]">₹7,980/g</span>
          </span>
          <span className="text-[#E7E2DA]">|</span>
          <span className="font-semibold text-[#1C1917]">
            22K (916): <span className="text-[#C5A059]">₹7,350/g</span>
          </span>
        </div>
      </div>

      {/* Right Actions & Role Persona Switcher */}
      <div className="flex items-center space-x-4">
        {/* Quick Action Buttons */}
        <div className="hidden sm:flex items-center space-x-2">
          <Link
            href="/gold-issues/new"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3ECD7] text-[#8C6A30] border border-[#DBC485] transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Issue Gold</span>
          </Link>
          <Link
            href="/gold-receipts/new"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3ECD7] text-[#8C6A30] border border-[#DBC485] transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Receive Jewellery</span>
          </Link>
          <Link
            href="/old-gold"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3ECD7] text-[#8C6A30] border border-[#DBC485] transition"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Old-Gold Desk</span>
          </Link>
        </div>

        {/* Alert Notifications */}
        <Link
          href="/alerts"
          className="relative p-2 rounded-lg bg-[#FAF7F2] border border-[#E7E2DA] hover:bg-[#F3ECD7] text-[#78716C] hover:text-[#1C1917] transition"
          title="Wastage & Loss Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadAlertsCount}
            </span>
          )}
        </Link>

        {/* Persona Role Switcher for instant live review */}
        <div className="flex items-center space-x-1 bg-[#F4EFE6] border border-[#DBC485] rounded-lg px-2.5 py-1">
          <UserCheck className="w-3.5 h-3.5 text-[#8C6A30]" />
          <span className="text-[10px] text-[#78716C] uppercase font-bold hidden md:inline">Role:</span>
          <select
            value={user.role}
            onChange={(e) => switchRole(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#8C6A30] focus:outline-none cursor-pointer"
          >
            {demoRoles.map(r => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}

