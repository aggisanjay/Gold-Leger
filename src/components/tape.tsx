import type { ReactNode } from "react";
import { Gold } from "./figures";
import { cn } from "@/lib/cn";

export interface TapeRow {
  label: ReactNode; mg?: number | null; value?: ReactNode; op?: "+" | "−" | "×" | "=" | "";
  rule?: boolean; total?: boolean; muted?: boolean; tone?: "bad" | "ok" | "review"; note?: ReactNode; balance?: boolean; unit?: string;
}

/**
 * The adding-machine tape. Every sum on screen is shown as working, decimals aligned, with the
 * total double-underlined, so a wrong number is visible before anyone presses save.
 */
export function Tape({ title, rows, footer, className }: { title?: string; rows: TapeRow[]; footer?: ReactNode; className?: string }) {
  return (
    <div className={cn("tape", className)} aria-live="polite">
      {title && <p className="mb-2 text-[13px] font-medium text-mute">{title}</p>}
      {rows.map((r, i) => (
        <div key={i}>
          {r.rule && <div className="tape-rule" />}
          <div className={cn("tape-row", r.total && "tape-total", r.muted && "text-mute")}>
            <span className="text-[14px]"><span className="op fig">{r.op ?? ""}</span>{r.label}</span>
            <span className={cn("text-[15px]", r.tone === "bad" && "text-bad", r.tone === "ok" && "text-ok", r.tone === "review" && "text-review")}>
              {r.value ?? <Gold mg={r.mg} bold={r.total} balance={r.balance} className={r.total ? "text-[17px]" : undefined} />}
              {r.unit !== "" && <span className="ml-1.5 text-[12.5px] text-mute">{r.unit ?? "g"}</span>}
            </span>
          </div>
          {r.note && <p className="-mt-1 pb-1.5 pl-[calc(1ch+8px)] text-[12.5px] text-mute">{r.note}</p>}
        </div>
      ))}
      {footer && <div className="mt-3 border-t border-line-strong pt-3 text-[13.5px] text-ink-2">{footer}</div>}
    </div>
  );
}
