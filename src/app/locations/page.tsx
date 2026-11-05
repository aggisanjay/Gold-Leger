"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Vault,
  Hammer,
  Store,
  Flame,
  Phone,
  MapPin,
  ShieldCheck,
  Layers,
} from "lucide-react";

export default function ShowroomsLocationsPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/branches").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]).then(([bList, lList]) => {
      setBranches(bList);
      setLocations(lList);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E7E2DA] pb-5">
        <span className="text-xs uppercase tracking-widest font-semibold text-[#C5A059]">
          Retail Showrooms & Custody Facilities
        </span>
        <h1 className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
          Branch & Strongroom Location Master
        </h1>
        <p className="text-xs text-[#78716C] mt-1">
          Complete network hierarchy covering 5 Flagship Showrooms, Zaveri Bazaar Central Vault, and SEEPZ Workshop.
        </p>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches.map((b) => {
          const branchLocations = locations.filter((l) => l.branchId === b.id);
          const isVault = b.type === "CENTRAL_VAULT";
          const isWorkshop = b.type === "WORKSHOP";
          const isRefinery = b.type === "REFINERY";

          return (
            <div
              key={b.id}
              className={`p-5 rounded-xl border transition shadow-sm bg-white flex flex-col justify-between ${
                isVault
                  ? "border-[#DBC485] bg-gradient-to-br from-white to-[#FAF7F2]"
                  : "border-[#E7E2DA]"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF7F2] text-[#8C6A30] border border-[#E7E2DA]">
                    {b.code}
                  </span>
                  <span
                    className={`p-1.5 rounded-lg ${
                      isVault
                        ? "bg-[#E7D8AE] text-[#6B5023]"
                        : isWorkshop
                        ? "bg-[#FAF7F2] text-[#C5A059]"
                        : "bg-[#F4EFE6] text-[#78716C]"
                    }`}
                  >
                    {isVault ? (
                      <Vault className="w-4 h-4" />
                    ) : isWorkshop ? (
                      <Hammer className="w-4 h-4" />
                    ) : isRefinery ? (
                      <Flame className="w-4 h-4" />
                    ) : (
                      <Store className="w-4 h-4" />
                    )}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-base text-[#1C1917] mt-2">{b.name}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5A059]">
                  {b.type.replace("_", " ")}
                </span>

                <div className="mt-3 space-y-1 text-xs text-[#78716C]">
                  <p className="flex items-start">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 mt-0.5 text-[#C5A059]" />
                    <span>{b.address || b.city}</span>
                  </p>
                  <p className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-1.5 text-[#C5A059]" />
                    <span>{b.phone || "+91 22 ..."}</span>
                  </p>
                </div>

                {/* Sub Locations */}
                <div className="mt-4 pt-3 border-t border-[#F4EFE6]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] block mb-2">
                    Managed Safes & Desks:
                  </span>
                  <div className="space-y-1.5">
                    {branchLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="p-2 bg-[#FAF7F2] rounded border border-[#E7E2DA] flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-[#1C1917]">{loc.name}</span>
                        <span className="text-[10px] font-mono text-[#78716C]">{loc.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F4EFE6] flex items-center justify-between text-[11px] text-[#0D5C3A] font-semibold">
                <span className="flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Audit Active
                </span>
                <span className="text-[#78716C]">{branchLocations.length} Safe(s)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

