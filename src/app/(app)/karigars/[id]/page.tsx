import Link from "next/link";
import { ctxFor, requireUser } from "@/server/auth";
import { read } from "@/server/db";
import { karigarDetail } from "@/server/services/queries";
import { Gold, Pct, Purity } from "@/components/figures";
import { Empty, Notice, PageHeader, Pill, Section } from "@/components/ui";
import { Button } from "@/components/ui";
import { PinForm, WastageEditor } from "./actions";
import { fmtDate, KIND_LABEL, SUBTYPE_LABEL } from "@/lib/format";
import { isDateString, istDate } from "@/server/clock";
import { allowedMg, ratioBp } from "@/domain/units";

export default async function KarigarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(["CLERK", "FINANCE", "PARTNER"]);
  const date = sp.date && isDateString(sp.date) ? sp.date : istDate();
  const d = await read((c) => karigarDetail(c, ctxFor(user), id, date));
  const finance = user.role !== "CLERK";
  const isToday = date === istDate();
  const entries = d.ledger.entries.slice(-60);
  return (
    <>
      <p className="mb-3 text-[13.5px]"><Link href="/karigars" className="text-mute hover:text-ink">Karigars</Link></p>
      <PageHeader title={d.karigar.name} sub={<>{d.karigar.code}{d.karigar.nameTa ? ` · ${d.karigar.nameTa}` : ""}{d.karigar.bench ? ` · ${d.karigar.bench}` : ""}{d.karigar.phone ? ` · ${d.karigar.phone}` : ""}</>} />

      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-y border-line py-6">
        <div>
          <p className="text-[13px] text-mute">Fine gold with {d.karigar.name.split(" ")[0]} {isToday ? "now" : `at the end of ${fmtDate(date)}`}</p>
          <p className="mt-1"><Gold mg={d.ledger.balanceMg} balance bold className="text-[40px]" /><span className="ml-2 text-mute">g</span></p>
        </div>
        <form className="flex items-end gap-2" action="" method="GET">
          <label className="grid gap-1 text-[13px] text-mute">Look at another day
            <input type="date" name="date" defaultValue={date} max={istDate()} className="h-11 rounded-lg border border-line-strong px-3 text-[15px] text-ink" />
          </label>
          <Button type="submit" variant="secondary" className="h-11">Show</Button>
          {!isToday && <Link href={`/karigars/${id}`} className="h-11 px-2 leading-[44px] text-[14px] text-mute hover:text-ink">Today</Link>}
        </form>
      </div>

      {d.drift && d.drift.level !== "INSUFFICIENT" && (
        <Notice tone={d.drift.level === "NONE" ? "ok" : "review"} title={d.drift.level === "REVIEW" ? "Worth a review" : d.drift.level === "WATCH" ? "Worth watching" : "Within their usual range"} className="mb-10">
          {d.drift.summary}
        </Notice>
      )}

      <Section title="Open jobs" aside={`${d.openJobs.length}`}>
        {d.openJobs.length === 0 ? <Empty title="No open jobs" /> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Job</th><th>Item</th><th className="num">Issued (g)</th><th className="num">Back (g)</th><th className="num">Still out (g)</th><th className="num">Allowed (g)</th><th /></tr></thead>
            <tbody>{d.openJobs.map((j) => (
              <tr key={j.id}><td className="fig">{j.jobNo}</td><td>{j.categoryName}</td><td className="num"><Gold mg={j.position.issuedFineMg} /></td><td className="num"><Gold mg={j.position.recoveredFineMg} /></td>
                <td className="num"><Gold mg={j.position.balanceMg} balance /></td><td className="num"><Gold mg={j.position.allowedMg} className="text-mute" /></td>
                <td className="text-right">{user.role !== "PARTNER" && <Link className="rounded-md px-3 py-1.5 text-[13.5px] font-medium hover:bg-sunk" href={`/receive?job=${j.id}`}>Receive</Link>}</td></tr>))}
            </tbody></table></div>
        )}
      </Section>

      <Section title="Ledger" aside={entries.length < d.ledger.entries.length ? `Latest ${entries.length} of ${d.ledger.entries.length}` : undefined}>
        <div className="overflow-x-auto"><table className="tbl">
          <thead><tr><th>Date</th><th>Entry</th><th>Job</th><th className="num">Gross (g)</th><th className="num">Purity %</th><th className="num">Fine (g)</th><th className="num">Balance (g)</th></tr></thead>
          <tbody>{entries.map((e) => (
            <tr key={e.txnNo + e.fineMg} className={e.reversed ? "text-mute line-through" : ""}>
              <td className="whitespace-nowrap text-ink-2">{fmtDate(e.businessDate)}</td>
              <td><span className="fig mr-2 text-[12.5px] text-mute">{e.txnNo}</span>{KIND_LABEL[e.kind] ?? e.kind}{e.subtype ? `, ${(SUBTYPE_LABEL[e.subtype] ?? e.subtype).toLowerCase()}` : ""}{e.huid ? <span className="fig ml-2 text-[12.5px] text-mute">{e.huid}</span> : null}</td>
              <td className="fig text-ink-2">{e.jobNo ?? ""}</td>
              <td className="num"><Gold mg={e.grossMg} /></td><td className="num"><Purity bp={e.purityBp} /></td>
              <td className="num"><Gold mg={e.fineMg} plus /></td><td className="num"><Gold mg={e.runningMg} balance={e.runningMg !== 0} /></td>
            </tr>))}</tbody>
        </table></div>
      </Section>

      <Section title="Agreed wastage" aside="Per item category. Used to work out the allowance on each job.">
        <WastageEditor karigarId={id} canEdit={user.role === "FINANCE"} rows={d.wastage} />
      </Section>

      <Section title="Recent closed jobs">
        {d.recentJobs.length === 0 ? <Empty title="No closed jobs yet" /> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Job</th><th>Item</th><th>Closed</th><th className="num">Issued (g)</th><th className="num">Wastage used (g)</th><th className="num">Beyond allowance (g)</th><th className="num">Of allowance</th></tr></thead>
            <tbody>{d.recentJobs.map((j) => {
              const allowed = allowedMg(j.position.issuedFineMg, j.wastageBp), used = (j.allowanceMg ?? 0) + (j.lossMg ?? 0);
              return <tr key={j.id}><td className="fig">{j.jobNo}</td><td>{j.categoryName}</td><td className="whitespace-nowrap text-ink-2">{j.closedOn ? fmtDate(j.closedOn) : ""}</td>
                <td className="num"><Gold mg={j.position.issuedFineMg} /></td><td className="num"><Gold mg={used} /></td><td className="num"><Gold mg={j.lossMg} className={(j.lossMg ?? 0) > 0 ? "text-review" : "text-mute"} /></td>
                <td className="num"><Pct bp={ratioBp(used, allowed || 1)} /></td></tr>;
            })}</tbody></table></div>
        )}
      </Section>

      {user.role === "FINANCE" && <Section title="Phone sign-in"><PinForm karigarId={id} hasPhone={!!d.karigar.phone} /></Section>}
    </>
  );
}
