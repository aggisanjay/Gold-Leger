import Link from "next/link";
import { ctxFor, requireUser } from "@/server/auth";
import { read } from "@/server/db";
import { listKarigars } from "@/server/services/queries";
import { Gold } from "@/components/figures";
import { PageHeader, Pill } from "@/components/ui";
import { NewKarigar } from "./[id]/actions";
import { daysBetween } from "@/lib/format";
import { istDate } from "@/server/clock";

export const metadata = { title: "Karigars" };

const DRIFT = { REVIEW: ["review", "Review"], WATCH: ["watch", "Watch"], NONE: ["ok", "Within their range"], INSUFFICIENT: ["neutral", "Too few jobs yet"] } as const;

export default async function KarigarsPage() {
  const user = await requireUser(["CLERK", "FINANCE", "PARTNER"]);
  const list = await read((c) => listKarigars(c, ctxFor(user)));
  const finance = user.role !== "CLERK";
  const today = istDate();
  return (
    <>
      <PageHeader title="Karigars" sub={`${list.filter((k) => k.active).length} on the bench. Fine-gold balance is what each one holds right now.`} actions={user.role === "FINANCE" ? <NewKarigar /> : null} />
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Bench</th><th className="num">Open jobs</th><th className="num">With them (g)</th>{finance && <th>Loss compared with their own history</th>}</tr></thead>
          <tbody>
            {list.map((k) => (
              <tr key={k.id} className={k.active ? "" : "text-mute"}>
                <td><Link href={`/karigars/${k.id}`} className="font-medium hover:underline">{k.name}</Link><span className="block text-[12.5px] text-mute">{k.code}{k.nameTa ? ` · ${k.nameTa}` : ""}{!k.active ? " · inactive" : ""}</span></td>
                <td className="text-ink-2">{k.bench ?? "–"}</td>
                <td className="num">{k.openJobs}{k.oldestOpenOn && daysBetween(k.oldestOpenOn, today) > 7 ? <span className="ml-1 text-[12px] text-mute">({daysBetween(k.oldestOpenOn, today)}d)</span> : null}</td>
                <td className="num"><Gold mg={k.balanceMg} balance={k.balanceMg !== 0} /></td>
                {finance && <td>{k.driftLevel && <Pill tone={DRIFT[k.driftLevel][0]}>{DRIFT[k.driftLevel][1]}</Pill>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
