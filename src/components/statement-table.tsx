import Link from "next/link";
import type { Statement } from "@/domain/stock";
import { Gold } from "./figures";

/** The stock statement as a ledger: opening, in, out, closing, decimals aligned. */
export function StatementTable({ s, compact }: { s: Statement; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            <th>Where the gold is</th>
            {!compact && <><th className="num">Opening</th><th className="num">In</th><th className="num">Out</th></>}
            <th className="num">Closing (g)</th>
          </tr>
        </thead>
        <tbody>
          {s.sections.map((sec) => (
            <SectionRows key={sec.title} sec={sec} compact={compact} />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total gold on hand</td>
            {!compact && <><td className="num"><Gold mg={s.totalOpeningMg} /></td><td /><td /></>}
            <td className="num"><Gold mg={s.totalClosingMg} balance className="text-[16px]" /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SectionRows({ sec, compact }: { sec: Statement["sections"][number]; compact?: boolean }) {
  return (
    <>
      <tr className="bg-sunk/60">
        <td className="font-medium">{sec.title}</td>
        {!compact && <><td className="num"><Gold mg={sec.openingMg} className="text-mute" /></td><td className="num"><Gold mg={sec.inMg} className="text-mute" /></td><td className="num"><Gold mg={-sec.outMg || 0} className="text-mute" /></td></>}
        <td className="num"><Gold mg={sec.closingMg} bold /></td>
      </tr>
      {sec.rows.length === 0 && <tr><td colSpan={compact ? 2 : 5} className="py-3 pl-7 text-[13.5px] text-mute">Nothing out with karigars</td></tr>}
      {sec.rows.map((r) => (
        <tr key={r.key}>
          <td className="pl-7 text-ink-2">{r.key.startsWith("KARIGAR:") ? <Link className="hover:underline" href={`/karigars/${r.key.slice(8)}`}>{r.label}</Link> : r.label}</td>
          {!compact && <><td className="num"><Gold mg={r.openingMg} /></td><td className="num"><Gold mg={r.inMg} /></td><td className="num"><Gold mg={r.outMg ? -r.outMg : 0} /></td></>}
          <td className="num"><Gold mg={r.closingMg} /></td>
        </tr>
      ))}
    </>
  );
}
