import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { LoginForm } from "./login-form";
import { Tape } from "@/components/tape";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const u = await currentUser();
  if (u) redirect(u.role === "KARIGAR" ? "/me" : "/today");
  const demo = process.env.DEMO_MODE === "true";
  return (
    <main className="mx-auto grid min-h-dvh max-w-[1040px] items-center gap-12 px-5 py-10 md:grid-cols-[1fr_420px] md:gap-20">
      <section className="hidden md:block">
        <p className="mb-5 flex items-center gap-2.5 text-[17px] font-semibold"><span aria-hidden className="inline-block h-3 w-3 rounded-[3px] bg-gold-line" />Gold Ledger</p>
        <h1 className="max-w-md text-[40px] leading-[1.08]">Every gram that leaves the vault, accounted for.</h1>
        <p className="mt-4 max-w-md text-[16px] text-mute">Issue gold to a karigar, take back pieces, scrap and filings, and see the balance after every entry.</p>
        <div className="mt-9 max-w-sm" aria-hidden>
          <Tape title="A job for Murugesan S, as the ledger shows it" rows={[
            { label: "Issued, fine", mg: 109920 },
            { label: "Necklace", mg: 103004, op: "−" },
            { label: "Scrap", mg: 3023, op: "−" },
            { label: "Still with the karigar", mg: 3893, op: "=", rule: true, total: true, balance: true },
            { label: "Agreed wastage, 3.00%", mg: 3298, muted: true },
          ]} />
        </div>
      </section>
      <section>
        <p className="mb-6 flex items-center gap-2.5 text-[17px] font-semibold md:hidden"><span aria-hidden className="inline-block h-3 w-3 rounded-[3px] bg-gold-line" />Gold Ledger</p>
        <h2 className="text-[24px]">Sign in</h2>
        <p className="mb-6 mt-1 text-mute">Karigars sign in with their phone number and PIN.</p>
        <LoginForm demo={demo} />
      </section>
    </main>
  );
}
