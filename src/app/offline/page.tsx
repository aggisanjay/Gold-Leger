"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center antialiased">
      <div className="max-w-md w-full rounded-2xl border border-line bg-paper p-8 shadow-sm space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sunk text-mute">
          <WifiOff className="h-7 w-7" />
        </div>

        <div>
          <h1 className="text-[22px] font-bold text-ink">You are offline</h1>
          <p className="mt-2 text-[14px] text-mute leading-relaxed">
            Coimbatore workshop tablets regularly lose connection during power or network cuts.
            Your entries and drafts are safely stored on this tablet.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-sunk/50 p-4 text-left text-[13px] text-ink-2 space-y-1.5">
          <p className="font-semibold text-ink">Nothing was lost:</p>
          <ul className="list-disc list-inside space-y-1 text-mute text-[12.5px]">
            <li>Completed issues and receipts are queued in your local outbox.</li>
            <li>They will sync automatically as soon as the network returns.</li>
            <li>Unsubmitted forms are saved as drafts on this device.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => window.location.reload()}
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Check connection & retry</span>
          </Button>

          <Link
            href="/today"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line-strong bg-paper px-4 text-sm font-medium text-ink hover:bg-sunk transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span>Back to Today</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

