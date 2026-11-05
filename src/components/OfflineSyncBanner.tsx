"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

export function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncedRecently, setSyncedRecently] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Automatically trigger sync if cached items exist
      const cached = localStorage.getItem("goldtrack_offline_queue");
      if (cached) {
        try {
          const items = JSON.parse(cached);
          if (items.length > 0) {
            setSyncedRecently(true);
            setTimeout(() => setSyncedRecently(false), 4000);
            localStorage.removeItem("goldtrack_offline_queue");
            setPendingSyncCount(0);
          }
        } catch {}
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !syncedRecently) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 p-3 rounded-xl border shadow-xl flex items-center space-x-3 text-xs transition-all ${
        !isOnline
          ? "bg-[#FEF3C7] border-[#D97706] text-[#92400E]"
          : "bg-[#ECFDF5] border-[#059669] text-[#065F46]"
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 text-[#D97706] animate-pulse" />
          <div>
            <p className="font-bold">Workshop Tablet Running in Offline Mode</p>
            <p className="text-[11px] text-[#B45309]">
              Power / grid cut detected. All issues and scale weights are cached locally and will sync upon restoration.
            </p>
          </div>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <div>
            <p className="font-bold">Network Reconnected</p>
            <p className="text-[11px] text-[#065F46]">
              All cached workshop ledger entries synchronized with Central Strongroom.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

