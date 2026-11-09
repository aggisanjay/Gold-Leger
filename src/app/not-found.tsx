import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center antialiased bg-paper">
      <div className="max-w-md w-full rounded-2xl border border-line bg-paper p-8 shadow-sm space-y-5">
        <span className="fig text-[48px] font-bold text-mute leading-none block">
          404
        </span>

        <div className="space-y-1.5">
          <h1 className="text-[22px] font-bold text-ink">Page not found</h1>
          <p className="text-[14px] text-mute leading-relaxed">
            The ledger entry, voucher, or job record you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-6 text-[14px] font-medium text-white hover:bg-ink-2 transition-colors gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

