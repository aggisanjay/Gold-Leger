import Link from "next/link";
import { ctxFor, requireUser } from "@/server/auth";
import { read } from "@/server/db";
import { listAlerts } from "@/server/services/alerts";
import { Empty, PageHeader, Pill } from "@/components/ui";
import { AlertActions } from "./alert-actions";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Alerts" };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser(["FINANCE", "PARTNER"]);
  const sp = await searchParams;
  const closed = sp.show === "resolved";
  const list = await read((c) => listAlerts(c, ctxFor(user), closed ? "CLOSED" : "OPEN"));
  return (
    <>
      <PageHeader title="Alerts" sub="Items to review, raised when a karigar's loss drifts from their own history, or a job ends beyond its allowance. They are prompts to look, not conclusions." />
      <div className="mb-6 flex gap-1 border-b border-line text-[14.5px]">
        {[["Open", "/alerts", !closed], ["Reviewed", "/alerts?show=resolved", closed]].map(([l, h, on]) => <Link key={h as string} href={h as string} className={cn("-mb-px border-b-2 px-4 py-2.5", on ? "border-gold-line font-medium" : "border-transparent text-mute hover:text-ink")}>{l as string}</Link>)}
      </div>
      {list.length === 0 ? <Empty title={closed ? "Nothing reviewed yet" : "Nothing to review"}>{closed ? "" : "When a karigar's loss drifts from their own history, it appears here, before month-end."}</Empty> : (
        <ul className="grid gap-4">
          {list.map((a) => (
            <li key={a.id} id={a.id} className="rounded-xl border border-line p-5 scroll-mt-24">
              <div className="flex flex-wrap items-center gap-2.5">
                <Pill tone={a.level === "REVIEW" ? "review" : "watch"}>{a.level === "REVIEW" ? "Review" : "Watch"}</Pill>
                <Link href={`/karigars/${a.karigar_id}`} className="font-medium hover:underline">{a.karigar_name}</Link>
                <span className="text-[13px] text-mute">{a.kind === "DRIFT" ? "Compared with their own history" : "Job beyond allowance"} · {fmtDate(a.created_at)}</span>
                {a.status !== "OPEN" && <Pill tone="ok">{a.status === "REVIEWED" ? "Reviewed" : a.status === "EXPLAINED" ? "Explained" : "Dismissed"}</Pill>}
              </div>
              <p className="mt-2.5 text-[16px] font-medium leading-snug">{a.title}</p>
              <p className="mt-1 max-w-2xl text-[14.5px] text-ink-2">{a.summary}</p>
              {a.kind === "DRIFT" && <Evidence e={a.evidence} />}
              {a.status !== "OPEN" ? <p className="mt-3 text-[13.5px] text-mute">{a.resolved_by_name ? `${a.resolved_by_name}: ` : ""}{a.note}</p> : <AlertActions id={a.id} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Evidence({ e }: { e: { recent: { jobNo: string; use: number }[]; earlier: { jobNo: string; use: number }[]; baselineUse: number; windowUse: number; jobsInBaseline: number; z: number } }) {
  const all = [...e.earlier, ...e.recent];
  const max = Math.max(1.4, ...all.map((x) => x.use));
  return (
    <figure className="mt-4">
      <div className="flex h-16 items-end gap-1" role="img" aria-label="Share of the agreed allowance used on each recent job">
        {all.map((x, i) => (
          <div key={x.jobNo} title={`${x.jobNo}: ${Math.round(x.use * 100)}% of allowance`} style={{ height: `${Math.max(4, (x.use / max) * 100)}%` }}
            className={cn("w-3 rounded-sm", i >= e.earlier.length ? "bg-review" : "bg-line-strong")} />
        ))}
      </div>
      <figcaption className="mt-2 text-[12.5px] text-mute">Share of the agreed allowance used, job by job. Grey: their {e.jobsInBaseline} earlier jobs, averaging <span className="fig">{Math.round(e.baselineUse * 100)}%</span>. Blue: the latest {e.recent.length}, averaging <span className="fig">{Math.round(e.windowUse * 100)}%</span>. 100% means exactly the agreed wastage.</figcaption>
    </figure>
  );
}
