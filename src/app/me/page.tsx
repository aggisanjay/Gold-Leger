import Link from "next/link";
import { redirect } from "next/navigation";
import { ctxFor, requireUser } from "@/server/auth";
import { read } from "@/server/db";
import { karigarPortal } from "@/server/services/queries";
import { Gold, Purity, Pct } from "@/components/figures";
import { fmtDay } from "@/lib/format";
import { MeHeader } from "./me-header";

export default async function KarigarMePage(props: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "KARIGAR") {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  const lang = searchParams.lang === "en" ? "en" : "ta";
  const isTa = lang === "ta";

  const ctx = ctxFor(user);
  const data = await read((c) => karigarPortal(c, ctx));

  const T = {
    balance: isTa ? "நிலுவை" : "Balance",
    balanceDesc: isTa ? "தூய தங்கம் (நிலுவை இருப்பு)" : "Fine gold with you right now",
    openJobs: isTa ? "செயலில் உள்ள வேலைகள்" : "Open Jobs",
    noOpenJobs: isTa ? "தற்போது செயலில் வேலைகள் இல்லை" : "No open jobs right now",
    jobNo: isTa ? "வேலை எண்" : "Job No.",
    item: isTa ? "உருப்படி" : "Item",
    issued: isTa ? "வழங்கியது" : "Issued",
    returned: isTa ? "திரும்பப் பெற்றது" : "Returned",
    stillWithMe: isTa ? "நிலுவை" : "Still with me",
    allowedWastage: isTa ? "அனுமதிக்கப்பட்ட கழிவு" : "Allowed wastage",
    recentSlips: isTa ? "சமீபத்திய சீட்டுகள்" : "Recent Slips",
    slip: isTa ? "சீட்டு" : "Slip",
    gross: isTa ? "மொத்த எடை" : "Gross",
    purity: isTa ? "தூய்மை" : "Purity",
    fineGold: isTa ? "தூய தங்கம்" : "Fine gold",
    balanceAfter: isTa ? "நிலுவை" : "Balance after",
    emptySlips: isTa ? "சீட்டுகள் எதுவும் இல்லை" : "No recent slips",
    viewSlip: isTa ? "சீட்டைப் பார்க்க" : "View slip",
  };

  const displayName = isTa && data.karigar.nameTa ? data.karigar.nameTa : data.karigar.name;

  return (
    <div className={`flex flex-col flex-1 pb-12 ${isTa ? "font-tamil" : ""}`}>
      <MeHeader
        name={displayName}
        code={data.karigar.code}
        lang={lang}
      />

      <div className="p-4 space-y-6">
        {/* Giant Fine-Gold Balance Card */}
        <div className="rounded-2xl border border-line bg-sunk/60 p-5 text-center">
          <p className="text-[13px] font-medium text-mute tracking-wide uppercase">
            {T.balance} / {isTa ? "Fine Balance" : "நிலுவை"}
          </p>
          <div className="mt-2 flex items-baseline justify-center gap-1.5">
            <span className="balance text-[36px] sm:text-[42px] leading-none font-bold text-ink">
              <Gold mg={data.balanceMg} />
            </span>
            <span className="text-[16px] text-mute font-medium">g</span>
          </div>
          <p className="mt-2 text-[12.5px] text-mute">
            {T.balanceDesc}
          </p>
        </div>

        {/* Open Jobs Section */}
        <section>
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
            <h2 className="text-[16px] font-bold text-ink">
              {T.openJobs}
            </h2>
            <span className="fig text-[13px] text-mute font-medium">
              {data.openJobs.length}
            </span>
          </div>

          {data.openJobs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-[13.5px] text-mute">
              {T.noOpenJobs}
            </p>
          ) : (
            <div className="space-y-3">
              {data.openJobs.map((j) => (
                <div
                  key={j.id}
                  className="rounded-xl border border-line bg-paper p-4 shadow-xs space-y-3 text-[13.5px]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="fig font-bold text-[15px] text-ink block">
                        {j.jobNo}
                      </span>
                      <span className="text-[13px] text-mute block mt-0.5">
                        {j.categoryName} {j.description ? `• ${j.description}` : ""}
                      </span>
                    </div>
                    <span className="rounded-full bg-sunk px-2.5 py-0.5 text-[11.5px] font-medium text-mute">
                      {fmtDay(j.openedOn)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-line/60 pt-2 text-[12.5px]">
                    <div>
                      <span className="text-mute block">{T.issued}:</span>
                      <span className="fig font-semibold text-ink">
                        <Gold mg={j.position.issuedFineMg} /> g
                      </span>
                    </div>
                    <div>
                      <span className="text-mute block">{T.returned}:</span>
                      <span className="fig font-semibold text-ink">
                        <Gold mg={j.position.recoveredFineMg} /> g
                      </span>
                    </div>
                    <div>
                      <span className="text-mute block">{T.stillWithMe}:</span>
                      <span className="fig font-bold text-gold">
                        <Gold mg={j.position.balanceMg} /> g
                      </span>
                    </div>
                    <div>
                      <span className="text-mute block">{T.allowedWastage}:</span>
                      <span className="fig text-ink-2">
                        <Gold mg={j.position.allowedMg} /> g{" "}
                        <span className="text-[11px] text-mute">
                          (<Pct bp={j.wastageBp} />)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Last 15 Slips Section */}
        <section>
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
            <h2 className="text-[16px] font-bold text-ink">
              {T.recentSlips}
            </h2>
            <span className="text-[12px] text-mute">
              {data.slips.length} {T.slip}
            </span>
          </div>

          {data.slips.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-[13.5px] text-mute">
              {T.emptySlips}
            </p>
          ) : (
            <div className="space-y-3">
              {data.slips.map((s) => {
                const isIssue = s.kind === "ISSUE";
                return (
                  <div
                    key={s.slipNo}
                    className="rounded-xl border border-line bg-paper p-3.5 shadow-xs space-y-2.5 text-[13px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="fig font-bold text-ink">
                          {s.slipNo}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            isIssue
                              ? "bg-gold-soft text-gold"
                              : "bg-ok-soft text-ok"
                          }`}
                        >
                          {isIssue ? T.issued : T.returned}
                        </span>
                      </div>
                      <span className="text-[11.5px] text-mute">
                        {fmtDay(s.businessDate)}
                      </span>
                    </div>

                    <div className="divide-y divide-line/60 border-y border-line/60">
                      {s.lines.map((l, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-1.5 text-[12.5px]"
                        >
                          <div>
                            <span className="text-ink font-medium">
                              {l.itemDesc || (isIssue ? T.issued : T.returned)}
                            </span>
                            <span className="fig text-[11px] text-mute ml-1">
                              (<Gold mg={l.grossMg} />g @ <Purity bp={l.purityBp} />)
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="fig font-semibold text-ink block">
                              <Gold mg={l.fineMg} /> g
                            </span>
                            {l.balanceAfterMg !== null && (
                              <span className="fig text-[11px] text-mute block">
                                {T.balanceAfter}: <Gold mg={l.balanceAfterMg} />g
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/slips/${s.slipNo}`}
                        className="text-[12px] font-medium text-ink-2 hover:text-ink underline underline-offset-2"
                      >
                        {T.viewSlip} &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
