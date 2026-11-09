import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { read, one } from "@/server/db";
import { BottomNav, SignOut, TopNav, type NavItem } from "@/components/nav";
import { OutboxBanner } from "@/components/outbox-banner";

const ROLE_LABEL = { CLERK: "Issue clerk", FINANCE: "Finance head", PARTNER: "Managing partner", KARIGAR: "Karigar" } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role === "KARIGAR") redirect("/me");

  const finance = user.role === "FINANCE" || user.role === "PARTNER";
  const open = finance ? Number((await read((c) => one<{ n: number }>(c, "SELECT COUNT(*) AS n FROM alerts WHERE status = 'OPEN'")))?.n ?? 0) : 0;
  const items: NavItem[] = [
    { href: "/today", label: "Today", icon: "today" },
    ...(user.role !== "PARTNER" ? [{ href: "/issue", label: "Issue", icon: "issue" as const }, { href: "/receive", label: "Receive", icon: "receive" as const }] : []),
    { href: "/karigars", label: "Karigars", icon: "karigars" },
    { href: "/old-gold", label: "Old gold", icon: "oldgold" },
    ...(finance ? [{ href: "/stock", label: "Stock", icon: "stock" as const }, { href: "/alerts", label: "Alerts", icon: "alerts" as const, badge: open || undefined }] : []),
  ];

  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-[57px] max-w-[1120px] items-center justify-between gap-6 px-4 sm:px-6">
          <Link href="/today" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
            <span aria-hidden className="inline-block h-3 w-3 rounded-[3px] bg-gold-line" />Gold Ledger
          </Link>
          <TopNav items={items} />
          <div className="hidden items-center gap-4 md:flex">
            <div className="text-right leading-tight"><p className="text-[13.5px] font-medium">{user.name}</p><p className="text-[12px] text-mute">{ROLE_LABEL[user.role]}</p></div>
            <SignOut className="flex h-9 items-center gap-2 rounded-md px-2 text-[13.5px] text-mute hover:bg-sunk hover:text-ink">Sign out</SignOut>
          </div>
        </div>
      </header>
      <OutboxBanner />
      <main className="mx-auto max-w-[1120px] px-4 pb-28 pt-8 sm:px-6 md:pb-16">{children}</main>
      <BottomNav items={items} userName={`${user.name}, ${ROLE_LABEL[user.role]}`} />
    </div>
  );
}
