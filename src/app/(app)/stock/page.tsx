import { redirect } from "next/navigation";
import { Download, CheckCircle2 } from "lucide-react";
import { ctxFor, requireUser } from "@/server/auth";
import { read } from "@/server/db";
import { statementFor } from "@/server/services/queries";
import { getSettingNum } from "@/server/services/core";
import { istDate, isDateString } from "@/server/clock";
import { PageHeader } from "@/components/ui";
import { StatementTable } from "@/components/statement-table";
import { Gold } from "@/components/figures";
import { fmtDay } from "@/lib/format";
import { DatePickerForm, PrintButton, StockMovements } from "./stock-forms";

export const metadata = { title: "Daily Stock Statement" };

export default async function StockPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "FINANCE" && user.role !== "PARTNER") {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  const today = istDate();
  const selectedDate = searchParams.date && isDateString(searchParams.date) ? searchParams.date : today;

  const ctx = ctxFor(user);
  const statement = await read((c) => statementFor(c, ctx, selectedDate));
  const goldRatePaise = await read((c) => getSettingNum(c, "gold_rate_paise"));

  const totalIn = statement.sections.reduce((a, sec) => a + sec.inMg, 0);
  const totalOut = statement.sections.reduce((a, sec) => a + sec.outMg, 0);
  const reconciles = statement.totalOpeningMg + totalIn - totalOut === statement.totalClosingMg;

  const canPost = user.role === "FINANCE";

  return (
    <div className="space-y-6">
      {/* Print header visible on print only */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Gold Ledger — Daily Stock Statement</h1>
        <p className="text-sm text-gray-600">{fmtDay(selectedDate)}</p>
      </div>

      <PageHeader
        title="Daily stock statement"
        sub={<>{fmtDay(selectedDate)}. Every gram accounted for across vault, karigars, and refiners.</>}
        actions={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <DatePickerForm currentDate={selectedDate} />
            <a
              href={`/api/stock/export?date=${selectedDate}&format=csv`}
              download
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] font-medium text-ink hover:bg-sunk transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV</span>
            </a>
            <a
              href={`/api/stock/export?date=${selectedDate}&format=tally`}
              download
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-paper px-3 text-[13.5px] font-medium text-ink hover:bg-sunk transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Tally XML</span>
            </a>
            <PrintButton />
          </div>
        }
      />

      <div className="rounded-xl border border-line bg-paper p-6 shadow-sm">
        <StatementTable s={statement} />

        <div className="mt-6 border-t border-line pt-4 space-y-2 text-[13.5px]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-mute">
            <div>
              <span>Written off as agreed wastage: </span>
              <Gold mg={statement.writtenOff.allowanceMg} className="text-ink-2 font-medium" /> g.
              <span className="ml-3">Beyond allowance, under review: </span>
              <Gold mg={statement.writtenOff.lossMg} className="text-ink-2 font-medium" /> g.
            </div>
            {reconciles && (
              <div className="flex items-center gap-1.5 font-medium text-ok">
                <CheckCircle2 className="h-4 w-4" />
                <span>Reconciles: opening + in − out = closing</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {canPost && <StockMovements goldRatePaise={goldRatePaise} />}
    </div>
  );
}

