"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-[13px] font-medium text-white shadow-xs hover:bg-ink-2"
    >
      <Printer className="h-4 w-4" />
      <span>Print voucher</span>
    </button>
  );
}

