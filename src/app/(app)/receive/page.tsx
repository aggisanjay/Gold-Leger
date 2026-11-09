import { redirect } from "next/navigation";
import { ctxFor, requireUser } from "@/server/auth";
import { all, read } from "@/server/db";
import { openJobs } from "@/server/services/queries";
import { PageHeader } from "@/components/ui";
import { ReceiveForm } from "./receive-form";

export const metadata = { title: "Receive gold" };

export default async function ReceivePage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const user = await requireUser(["CLERK", "FINANCE", "PARTNER"]);
  if (user.role === "PARTNER") redirect("/today");
  const sp = await searchParams;
  void ctxFor(user);
  const { jobs, purities } = await read(async (c) => ({
    jobs: await openJobs(c),
    purities: await all<{ job_id: string; purity_bp: number }>(c, "SELECT job_id, purity_bp FROM txns WHERE kind = 'ISSUE' AND reversed_by IS NULL ORDER BY created_at"),
  }));
  const purityOfJob = Object.fromEntries(purities.map((p) => [p.job_id, Number(p.purity_bp)]));
  return (
    <>
      <PageHeader title="Receive gold" sub="Finished pieces, scrap and filings. The allowed and the actual wastage are worked out as you type." />
      <ReceiveForm initialJob={sp.job} jobs={jobs.map((j) => ({
        id: j.id, jobNo: j.jobNo, karigarId: j.karigarId, karigarName: j.karigarName, categoryName: j.categoryName, wastageBp: j.wastageBp, purityBp: purityOfJob[j.id] ?? 9160,
        issuedMg: j.position.issuedFineMg, pieceMg: j.position.pieceFineMg, scrapMg: j.position.scrapFineMg, filingsMg: j.position.filingsFineMg,
      }))} />
    </>
  );
}
