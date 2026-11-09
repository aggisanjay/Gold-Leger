import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ctxFor, requireUser } from "@/server/auth";
import { read } from "@/server/db";
import { slipData } from "@/server/services/queries";
import { Gold, Purity } from "@/components/figures";
import { fmtDay, fmtTime } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata = { title: "Slip" };

function formatVerification(v: string | null): string {
  if (!v) return "no photo";
  const hasMatched = v.includes("MATCH");
  const hasEye = v.includes("CONFIRMED_BY_EYE");
  if (hasMatched) return "photo matched";
  if (hasEye) return "checked by eye";
  return "no photo";
}

export default async function SlipPage(props: {
  params: Promise<{ slipNo: string }>;
}) {
  const user = await requireUser();
  const ctx = ctxFor(user);
  const { slipNo } = await props.params;

  let slip;
  try {
    slip = await read((c) => slipData(c, ctx, slipNo));
  } catch (e: any) {
    if (e.code === "NOT_FOUND" || e.status === 404 || e.code === "FORBIDDEN") notFound();
    throw e;
  }

  const isIssue = slip.kind === "ISSUE";
  const kindTitleEn = isIssue ? "Gold Issue Slip" : "Gold Receipt Slip";
  const kindTitleTa = isIssue ? "தங்கம் வழங்கல் சீட்டு" : "தங்கம் வரவு சீட்டு";

  // Summary verification across lines
  const verifications = slip.lines
    .map((l) => formatVerification(l.verification))
    .filter((v, i, a) => a.indexOf(v) === i);
  const summaryVerification = verifications.join(", ") || "no photo";

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      {/* Top action bar: hidden when printing */}
      <div className="no-print mb-6 flex items-center justify-between border-b border-line pb-4">
        <Link
          href={user.role === "KARIGAR" ? "/me" : "/today"}
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-mute hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{user.role === "KARIGAR" ? "Back to my balance" : "Back to Today"}</span>
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* A5 Print-Ready Voucher Surface */}
      <div className="rounded-xl border border-line bg-paper p-6 sm:p-8 shadow-sm print:border-0 print:p-0 print:shadow-none font-sans">
        {/* Header */}
        <div className="border-b-2 border-ink pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold tracking-wider text-mute uppercase">
                Company A &bull; Coimbatore
              </p>
              <h1 className="text-[22px] font-bold text-ink leading-tight">
                {kindTitleEn}
              </h1>
              <p className="font-tamil text-[14px] text-ink-2 font-medium">
                {kindTitleTa}
              </p>
            </div>
            <div className="text-right">
              <span className="fig text-[16px] font-bold bg-sunk px-2.5 py-1 rounded border border-line inline-block">
                {slip.slipNo}
              </span>
              <p className="mt-1.5 text-[12px] text-mute">
                {fmtDay(slip.businessDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="my-5 grid grid-cols-2 gap-4 text-[13px] border-b border-line pb-5">
          <div>
            <span className="text-mute block text-[11.5px] uppercase tracking-wide">
              Karigar / பொற்கொல்லர்
            </span>
            <span className="font-semibold text-ink text-[14.5px] block">
              {slip.karigar.name}
              {slip.karigar.nameTa && (
                <span className="font-tamil font-normal text-ink-2 ml-1.5 text-[13.5px]">
                  ({slip.karigar.nameTa})
                </span>
              )}
            </span>
            <span className="fig text-[12px] text-mute">{slip.karigar.code}</span>
          </div>

          <div>
            <span className="text-mute block text-[11.5px] uppercase tracking-wide">
              Job / வேலை எண்
            </span>
            <span className="fig font-bold text-ink text-[14.5px] block">
              {slip.job.jobNo}
            </span>
            <span className="text-[12.5px] text-ink-2">
              {slip.categoryName} &bull; Wastage allowance:{" "}
              <span className="fig font-medium">{(slip.job.wastageBp / 100).toFixed(2)}%</span>
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-mute">
                <th className="py-2 font-medium">Item / விவரம்</th>
                <th className="py-2 text-right font-medium">Gross Wt (g)</th>
                <th className="py-2 text-right font-medium">Purity</th>
                <th className="py-2 text-right font-medium">Fine (g)</th>
                <th className="py-2 text-right font-medium">Bal After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {slip.lines.map((line, idx) => (
                <tr key={idx} className={line.reversed ? "opacity-50 line-through" : ""}>
                  <td className="py-2.5">
                    <span className="font-medium text-ink block">
                      {line.itemDesc || (line.subtype ?? (isIssue ? "Gold Issued" : "Receipt"))}
                    </span>
                    {line.huid && (
                      <span className="fig text-[11px] font-semibold text-review bg-review-soft px-1.5 py-0.5 rounded">
                        HUID: {line.huid}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right fig">
                    <Gold mg={line.grossMg} />
                  </td>
                  <td className="py-2.5 text-right fig">
                    <Purity bp={line.purityBp} />
                  </td>
                  <td className="py-2.5 text-right fig font-semibold text-ink">
                    <Gold mg={line.fineMg} />
                  </td>
                  <td className="py-2.5 text-right fig text-gold font-bold">
                    {line.balanceAfterMg !== null ? <Gold mg={line.balanceAfterMg} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="mt-4 border-t-2 border-line pt-3 flex justify-between items-baseline text-[14px]">
          <span className="font-semibold text-ink">
            Total Fine Gold / மொத்த தூய தங்கம்:
          </span>
          <span className="fig text-[17px] font-bold text-ink">
            <Gold mg={slip.lines.reduce((s, l) => s + (l.reversed ? 0 : l.fineMg), 0)} /> g
          </span>
        </div>

        {/* Verification & Audit Footer */}
        <div className="mt-8 rounded-lg bg-sunk/60 border border-line p-3 text-[11.5px] text-mute flex items-center justify-between">
          <div>
            <span>Verified by: </span>
            <span className="font-medium text-ink-2">{slip.byName || "Workshop Clerk"}</span>
            <span className="ml-2">&bull; {fmtTime(slip.createdAt)}</span>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1 font-medium px-2.5 py-0.5 rounded text-[11.5px] border ${
              summaryVerification === "photo matched"
                ? "bg-ok-soft text-ok border-ok/30"
                : summaryVerification === "checked by eye"
                ? "bg-review-soft text-review border-review/30"
                : "bg-paper text-mute border-line"
            }`}>
              {summaryVerification === "photo matched" ? "✓ Photo Matched" : summaryVerification === "checked by eye" ? "Checked by Eye" : "No Photo"}
            </span>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-10 pt-6 text-[12.5px] text-ink-2">
          <div className="border-t border-dashed border-ink-2/60 pt-2 text-center">
            <span className="block font-medium">Issue Clerk Signature</span>
            <span className="font-tamil text-[11px] text-mute block">எழுத்தர் கையொப்பம்</span>
          </div>
          <div className="border-t border-dashed border-ink-2/60 pt-2 text-center">
            <span className="block font-medium">Karigar Signature</span>
            <span className="font-tamil text-[11px] text-mute block">பொற்கொல்லர் கையொப்பம்</span>
          </div>
        </div>
      </div>
    </div>
  );
}

