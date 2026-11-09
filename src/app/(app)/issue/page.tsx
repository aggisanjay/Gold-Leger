import { redirect } from "next/navigation";
import { ctxFor, requireUser } from "@/server/auth";
import { all, read } from "@/server/db";
import { categories, listKarigars, openJobs } from "@/server/services/queries";
import { PageHeader } from "@/components/ui";
import { IssueForm } from "./issue-form";

export const metadata = { title: "Issue gold" };

export default async function IssuePage({ searchParams }: { searchParams: Promise<{ karigar?: string }> }) {
  const user = await requireUser(["CLERK", "FINANCE", "PARTNER"]);
  if (user.role === "PARTNER") redirect("/today");
  const sp = await searchParams;
  const ctx = ctxFor(user);
  const data = await read(async (c) => ({
    karigars: (await listKarigars(c, ctx)).filter((k) => k.active),
    cats: await categories(c),
    jobs: await openJobs(c),
    wastage: await all<{ karigar_id: string; category_id: string; wastage_bp: number }>(c, "SELECT karigar_id, category_id, wastage_bp FROM karigar_wastage"),
  }));
  return (
    <>
      <PageHeader title="Issue gold" sub="Weigh it, check the purity, and the fine weight and the karigar's new balance are worked out below." />
      <IssueForm initialKarigar={sp.karigar} karigars={data.karigars.map((k) => ({ id: k.id, name: k.name, balanceMg: k.balanceMg }))} cats={data.cats}
        jobs={data.jobs.map((j) => ({ id: j.id, jobNo: j.jobNo, karigarId: j.karigarId, categoryId: j.categoryId, categoryName: j.categoryName, balanceMg: j.position.balanceMg, wastageBp: j.wastageBp }))}
        wastage={Object.fromEntries(data.wastage.map((w) => [`${w.karigar_id}:${w.category_id}`, Number(w.wastage_bp)]))} />
    </>
  );
}
