"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppContext";
import {
  LayoutDashboard,
  Layers,
  Users,
  Send,
  PackageCheck,
  Scale,
  Building2,
  ArrowLeftRight,
  AlertTriangle,
  FileText,
  DownloadCloud,
  History,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, isSidebarOpen, toggleSidebar, unreadAlertsCount } = useApp();

  const navItems = [
    { label: "Executive Dashboard", href: "/", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "ACCOUNTANT", "INVENTORY_MANAGER"] },
    { label: "Gold Issue (Job Cards)", href: "/gold-issues", icon: Send, roles: ["SUPER_ADMIN", "INVENTORY_MANAGER", "BRANCH_MANAGER"] },
    { label: "Receive Finished Jewellery", href: "/gold-receipts/new", icon: PackageCheck, roles: ["SUPER_ADMIN", "INVENTORY_MANAGER"] },
    { label: "Karigar Directory", href: "/karigars", icon: Users, roles: ["SUPER_ADMIN", "INVENTORY_MANAGER", "BRANCH_MANAGER"] },
    { label: "Old-Gold Exchange Desk", href: "/old-gold", icon: Scale, roles: ["SUPER_ADMIN", "OLD_GOLD_STAFF", "BRANCH_MANAGER", "ACCOUNTANT"] },
    { label: "Stock by Location", href: "/inventory", icon: Layers, roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "INVENTORY_MANAGER", "ACCOUNTANT"] },
    { label: "Inter-Branch Transfers", href: "/transfers", icon: ArrowLeftRight, roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "INVENTORY_MANAGER"] },
    { label: "Wastage & Loss Alerts", href: "/alerts", icon: AlertTriangle, badge: unreadAlertsCount, roles: ["SUPER_ADMIN", "INVENTORY_MANAGER", "ACCOUNTANT"] },
    { label: "Reports & Reconciliation", href: "/reports", icon: FileText, roles: ["SUPER_ADMIN", "ACCOUNTANT", "BRANCH_MANAGER"] },
    { label: "Tally & CSV Exports", href: "/exports", icon: DownloadCloud, roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { label: "Showrooms & Vaults", href: "/locations", icon: Building2, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"] },
    { label: "Audit Ledger", href: "/audit-logs", icon: History, roles: ["SUPER_ADMIN", "ACCOUNTANT"] },
    { label: "Karigar Portal", href: "/karigar-portal", icon: Smartphone, highlight: true },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-[#E7E2DA] bg-[#FAF7F2] flex flex-col ${
        isSidebarOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-[#E7E2DA] bg-[#FDFBF7]">
        <Link href="/" className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] via-[#C5A059] to-[#996515] flex items-center justify-center shadow-luxury flex-shrink-0">
            <span className="text-white font-serif font-bold text-lg">G</span>
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-serif tracking-widest text-[#1C1917] font-bold text-sm">
                GOLDTRACK
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#C5A059] font-medium">
                Bullion ERP
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="text-[#78716C] hover:text-[#1C1917] p-1.5 rounded-md hover:bg-[#F4EFE6] transition"
          aria-label="Toggle Navigation"
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative ${
                isActive
                  ? "bg-[#F3ECD7] text-[#8C6A30] font-semibold shadow-sm border border-[#DBC485]"
                  : item.highlight
                  ? "bg-[#FAF0E6] text-[#B08A44] hover:bg-[#F3ECD7]"
                  : "text-[#57534E] hover:bg-[#F4EFE6] hover:text-[#1C1917]"
              }`}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <item.icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? "text-[#8C6A30]" : "text-[#78716C] group-hover:text-[#1C1917]"
                }`}
              />
              {isSidebarOpen && (
                <span className="ml-3 truncate">{item.label}</span>
              )}
              {item.badge && item.badge > 0 && (
                <span
                  className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isSidebarOpen ? "bg-[#DC2626] text-white" : "absolute top-1 right-1 w-2 h-2 p-0 bg-[#DC2626]"
                  }`}
                >
                  {isSidebarOpen ? item.badge : ""}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User & Role Drawer */}
      <div className="p-3 border-t border-[#E7E2DA] bg-[#FDFBF7]">
        {isSidebarOpen ? (
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-[#FAF7F2] border border-[#E7E2DA]">
            <div className="w-8 h-8 rounded-full bg-[#E7D8AE] text-[#6B5023] flex items-center justify-center font-bold text-xs flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#1C1917] truncate">{user.name}</p>
              <div className="flex items-center text-[10px] text-[#C5A059] font-medium uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 mr-1" />
                <span className="truncate">{user.role.replace("_", " ")}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-[#E7D8AE] text-[#6B5023] flex items-center justify-center font-bold text-xs">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

