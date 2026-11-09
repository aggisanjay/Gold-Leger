import { ctxFor, requireUser } from "@/server/auth";
import { read } from "@/server/db";
import { getSettingNum } from "@/server/services/core";
import { listOldGold } from "@/server/services/oldgold";
import { Empty, PageHeader, Pill, Section } from "@/components/ui";
import { Gold, Purity, Rupees } from "@/components/figures";
import { OldGoldForm, VoidOldGold } from "./old-gold-form";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Old gold" };
const MODE: Record<string, string> = { CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque", ADJUSTED_IN_BILL: "Adjusted in bill" };

export default async function OldGoldPage() {
  const user = await requireUser(["CLERK", "FINANCE", "PARTNER"]);
  const ctx = ctxFor(user);
  const { list, rate, pan, cash } = await read(async (c) => ({ list: await listOldGold(c, ctx), rate: await getSettingNum(c, "gold_rate_paise"), pan: await getSettingNum(c, "pan_threshold_paise"), cash: await getSettingNum(c, "cash_limit_paise") }));
  return (
    <>
      <PageHeader title="Old gold" sub={<>Recorded once, against the exchange bill. Valued at <Rupees paise={rate} /> per gram today.</>} />
      {user.role !== "PARTNER" && <div className="mb-12"><OldGoldForm ratePaise={rate} panThresholdPaise={pan} cashLimitPaise={cash} /></div>}
      <Section title="Recent purchases" aside={`${list.length} shown`}>
        {list.length === 0 ? <Empty title="No old gold recorded yet" /> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Purchase</th><th>Exchange bill</th><th>Customer</th><th className="num">Net (g)</th><th className="num">Purity %</th><th className="num">Fine (g)</th><th className="num">Value</th><th>Payment</th><th /></tr></thead>
            <tbody>{list.map((o) => (
              <tr key={o.id} className={o.status === "VOID" ? "text-mute line-through" : ""}>
                <td><span className="fig">{o.purchaseNo}</span><span className="block text-[12.5px] text-mute no-underline">{fmtDate(o.businessDate)}</span></td>
                <td className="fig">{o.billNo}</td><td>{o.customerName}</td>
                <td className="num"><Gold mg={o.netMg} /></td><td className="num"><Purity bp={o.purityBp} /></td><td className="num"><Gold mg={o.fineMg} bold /></td><td className="num"><Rupees paise={o.valuePaise} decimals={false} /></td>
                <td>{MODE[o.paymentMode]}{o.pan ? <span className="fig ml-2 text-[12px] text-mute">{o.pan}</span> : null}{o.verification?.includes("MATCH") && <Pill tone="ok" className="ml-2">Photo matched</Pill>}</td>
                <td className="text-right">{user.role === "FINANCE" && o.status === "ACTIVE" ? <VoidOldGold id={o.id} /> : o.status === "VOID" ? <Pill>Void</Pill> : null}</td>
              </tr>))}</tbody></table></div>
        )}
      </Section>
    </>
  );
}
