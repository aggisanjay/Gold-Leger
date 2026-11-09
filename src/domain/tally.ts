import { formatGrams } from "./units";

/** One movement of fine gold between two places, ready for the accounts team. */
export interface Movement {
  voucherNo: string;
  date: string; // YYYY-MM-DD
  from: string; // godown names as they exist in Tally
  to: string;
  fineMg: number;
  narration: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function movementsCsv(rows: Movement[]): string {
  const head = ["Date", "Voucher no", "From", "To", "Fine gold (g)", "Narration"];
  const lines = rows.map((r) => [r.date, r.voucherNo, r.from, r.to, formatGrams(r.fineMg, { grouping: false }), r.narration].map(csvCell).join(","));
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}

/**
 * Tally Prime "Stock Journal" vouchers moving Fine Gold 24K between godowns. Quantity only, no
 * value: the accounts team values gold by their own policy. Stock item and godown names must
 * already exist in the Tally company (see the TDD for the assumption).
 */
export function movementsTallyXml(rows: Movement[], company: string, stockItem = "Fine Gold 24K"): string {
  const vouchers = rows.map((r) => {
    const qty = `${formatGrams(r.fineMg, { grouping: false })} g`;
    const entry = (tag: string, godown: string, positive: boolean) => `
        <${tag}>
          <STOCKITEMNAME>${esc(stockItem)}</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>${positive ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
          <ACTUALQTY> ${qty}</ACTUALQTY>
          <BILLEDQTY> ${qty}</BILLEDQTY>
          <BATCHALLOCATIONS.LIST>
            <GODOWNNAME>${esc(godown)}</GODOWNNAME>
            <BATCHNAME>Primary Batch</BATCHNAME>
            <ACTUALQTY> ${qty}</ACTUALQTY>
            <BILLEDQTY> ${qty}</BILLEDQTY>
          </BATCHALLOCATIONS.LIST>
        </${tag}>`;
    return `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Stock Journal" ACTION="Create" OBJVIEW="Consumption Voucher View">
          <DATE>${r.date.replace(/-/g, "")}</DATE>
          <VOUCHERTYPENAME>Stock Journal</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${esc(r.voucherNo)}</VOUCHERNUMBER>
          <NARRATION>${esc(r.narration)}</NARRATION>${entry("INVENTORYENTRIESOUT.LIST", r.from, true)}${entry("INVENTORYENTRIESIN.LIST", r.to, false)}
        </VOUCHER>
      </TALLYMESSAGE>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES><SVCURRENTCOMPANY>${esc(company)}</SVCURRENTCOMPANY></STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>${vouchers.join("")}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;
}
