import Link from "next/link";
import { ArrowRight, PackagePlus, Scale } from "lucide-react";
import { ctxFor, requireUser } from "@/server/auth";
import { read } from "@/server/db";
import { clerkDashboard, financeDashboard } from "@/server/services/queries";
import { listAlerts } from "@/server/services/alerts";
import { Gold, Pct, Rupees } from "@/components/figures";
import { Empty, PageHeader, Pill, Section } from "@/components/ui";
import { StatementTable } from "@/components/statement-table";
import { LossTrend } from "@/components/loss-trend";
import { daysBetween, fmtDate, fmtDay, fmtTime, KIND_LABEL } from "@/lib/format";
import { formatPercentBp } from "@/domain/units";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const user = await requireUser();
  const ctx = ctxFor(user);
  if (user.role === "FINANCE" || user.role === "PARTNER") return <FinanceToday ctx={ctx} canPost={user.role === "FINANCE"} />;
  return <ClerkToday ctx={ctx} />;
}

async function FinanceToday({ ctx, canPost }: { ctx: ReturnType<typeof ctxFor>; canPost: boolean }) {
  const d = await read((c) => financeDashboard(c, ctx));
  const alerts = (await read((c) => listAlerts(c, ctx, "OPEN"))).slice(0, 4);
  const s = d.statement;
  const withKarigars = s.sections[1].closingMg, vault = s.sections[0].closingMg, refiner = s.sections[2].closingMg;
  const overTarget = d.monthToDate.lossBp > d.targetBp;
  return (
    <>
      <PageHeader title="Today" sub={<>{fmtDay(d.date)}. Gold rate <Rupees paise={d.goldRatePaise} /> per gram.</>}
        actions={canPost ? <Link href="/stock#movements" className="text-[14px] text-ink-2 underline-offset-4 hover:underline">Record gold in or out</Link> : null} />

      <dl className="mb-10 grid grid-cols-2 gap-y-6 border-y border-line py-6 md:grid-cols-4 md:divide-x md:divide-line">
        {[["Gold on hand", s.totalClosingMg, true], ["In the vault", vault], ["With karigars", withKarigars], ["At the refiner", refiner]].map(([label, mg, strong], i) => (
          <div key={label as string} className={i === 0 ? "md:pr-6" : "md:px-6"}>
            <dt className="text-[13px] text-mute">{label as string}</dt>
            <dd className="mt-1"><Gold mg={mg as number} bold={!!strong} className="text-[26px] sm:text-[30px]" /><span className="ml-1.5 text-[13px] text-mute">g</span></dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-12 lg:grid-cols-[1.55fr_1fr]">
        <Section title="Stock statement" aside={<Link href="/stock" className="inline-flex items-center gap-1 hover:text-ink">Full statement <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          <StatementTable s={s} compact />
          <p className="mt-3 text-[13px] text-mute">Written off as agreed wastage: <Gold mg={s.writtenOff.allowanceMg} className="text-ink-2" /> g. Beyond allowance, under review: <Gold mg={s.writtenOff.lossMg} className="text-ink-2" /> g.</p>
        </Section>

        <div>
          <Section title="Unexplained loss this month">
            <p className="flex items-baseline gap-3"><Pct bp={d.monthToDate.lossBp} className="text-[34px] font-semibold" /><span className="text-[13.5px] text-mute">of gold issued, target under <Pct bp={d.targetBp} /></span></p>
            <p className={`mb-4 mt-1 text-[13.5px] ${overTarget ? "text-review" : "text-ok"}`}>{overTarget ? "Above target so far this month." : "Within target so far this month."}</p>
            <LossTrend trend={d.trend} targetBp={d.targetBp} />
          </Section>

          <Section title="To review" aside={<Link href="/alerts" className="inline-flex items-center gap-1 hover:text-ink">All <ArrowRight className="h-3.5 w-3.5" /></Link>}>
            {alerts.length === 0 ? <Empty title="Nothing to review">When a karigar's loss drifts from their own history, it appears here.</Empty> : (
              <ul className="divide-y divide-line">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/alerts#${a.id}`} className="block py-3 hover:bg-sunk/50">
                      <p className="flex items-center gap-2"><Pill tone={a.level === "REVIEW" ? "review" : "watch"}>{a.level === "REVIEW" ? "Review" : "Watch"}</Pill><span className="text-[14.5px] font-medium">{a.karigar_name}</span></p>
                      <p className="mt-1 line-clamp-2 text-[13.5px] text-mute">{a.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {d.staleJobs.length > 0 && (
            <Section title="Open the longest">
              <ul className="divide-y divide-line text-[14px]">
                {d.staleJobs.map((j) => <li key={j.jobNo} className="flex justify-between py-2.5"><span>{j.karigarName} <span className="fig text-mute">{j.jobNo}</span></span><span className="text-mute">{daysBetween(j.openedOn, d.date)} days</span></li>)}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

async function ClerkToday({ ctx }: { ctx: ReturnType<typeof ctxFor> }) {
  const d = await read((c) => clerkDashboard(c, ctx));
  return (
    <>
      <PageHeader title="Today" sub={fmtDay(d.date)} />
      <div className="mb-10 grid gap-3 sm:grid-cols-2">
        <Link href="/issue" className="group flex items-center justify-between rounded-xl bg-ink px-6 py-6 text-white transition-colors hover:bg-ink-2">
          <span><span className="block text-[20px] font-semibold">Issue gold</span><span className="text-[14px] text-white/70">To a karigar, with a slip</span></span><Scale className="h-7 w-7 opacity-80" />
        </Link>
        <Link href="/receive" className="group flex items-center justify-between rounded-xl border border-line-strong px-6 py-6 transition-colors hover:bg-sunk">
          <span><span className="block text-[20px] font-semibold">Receive gold</span><span className="text-[14px] text-mute">Pieces, scrap and filings</span></span><PackagePlus className="h-7 w-7 text-mute" />
        </Link>
      </div>

      <Section title="Jobs with the karigars" aside={`${d.openJobs.length} open`}>
        {d.openJobs.length === 0 ? <Empty title="No open jobs">Issue gold to start one.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Job</th><th>Karigar</th><th>Item</th><th className="num">Issued (g)</th><th className="num">Back (g)</th><th className="num">Still out (g)</th><th className="num">Open</th><th /></tr></thead>
              <tbody>
                {d.openJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="fig">{j.jobNo}</td>
                    <td><Link href={`/karigars/${j.karigarId}`} className="hover:underline">{j.karigarName}</Link></td>
                    <td className="text-ink-2">{j.categoryName}</td>
                    <td className="num"><Gold mg={j.position.issuedFineMg} /></td>
                    <td className="num"><Gold mg={j.position.recoveredFineMg} /></td>
                    <td className="num"><Gold mg={j.position.balanceMg} balance /></td>
                    <td className="num text-mute">{daysBetween(j.openedOn, d.date)}d</td>
                    <td className="text-right"><Link href={`/receive?job=${j.id}`} className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-ink hover:bg-sunk">Receive</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Entries today" aside={`${d.today.length} shown`}>
        {d.today.length === 0 ? <Empty title="Nothing entered yet today" /> : (
          <ul className="divide-y divide-line">
            {d.today.map((t) => (
              <li key={t.txnNo} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-[14.5px]">
                <span className="flex items-center gap-3"><span className="fig w-[84px] text-mute">{t.txnNo}</span><span className="font-medium">{KIND_LABEL[t.kind] ?? t.kind}{t.subtype ? `, ${t.subtype.toLowerCase()}` : ""}</span><span className="text-ink-2">{t.karigarName}</span></span>
                <span className="flex items-center gap-4"><span className="text-[13px] text-mute">{fmtTime(t.createdAt)}</span><Gold mg={t.fineMg} className={t.reversed ? "text-mute line-through" : ""} /></span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
