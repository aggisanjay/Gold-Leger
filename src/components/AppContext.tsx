"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId?: string | null;
  karigarId?: string | null;
}

interface AppContextType {
  user: AppUser;
  switchRole: (role: string) => void;
  selectedBranch: string;
  setSelectedBranch: (branchId: string) => void;
  unreadAlertsCount: number;
  setUnreadAlertsCount: (count: number) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const DEFAULT_USER: AppUser = {
  id: "u-01",
  name: "Rajeshwar Zaveri",
  email: "owner@goldtrack.com",
  role: "SUPER_ADMIN",
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(DEFAULT_USER);
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(2);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Sync user role with backend on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const switchRole = async (newRole: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        // If karigar role, redirect or update state
      }
    } catch (err) {
      console.error("Role switch error:", err);
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return (
    <AppContext.Provider
      value={{
        user,
        switchRole,
        selectedBranch,
        setSelectedBranch,
        unreadAlertsCount,
        setUnreadAlertsCount,
        isSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}

