"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-12 text-center space-y-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bad-soft text-bad">
        <AlertCircle className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h1 className="text-[22px] font-bold text-ink">
          Something went wrong loading this screen
        </h1>
        <p className="text-[14px] text-mute leading-relaxed">
          Nothing was lost. Every gold movement and running balance is safely stored in the ledger.
        </p>
      </div>

      {error?.message && (
        <div className="rounded-xl border border-bad/20 bg-bad-soft/50 p-4 text-left text-[13px] text-bad font-mono break-words">
          {error.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Try again</span>
        </Button>

        <Link
          href="/today"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-line-strong bg-paper px-4 text-sm font-medium text-ink hover:bg-sunk transition-colors gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Today</span>
        </Link>
      </div>
    </div>
  );
}

