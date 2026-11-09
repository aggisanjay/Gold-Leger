"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, Gem, Home, Landmark, Menu, PackagePlus, Scale, Users, X, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS = { today: Home, issue: Scale, receive: PackagePlus, karigars: Users, oldgold: Gem, stock: Landmark, alerts: Bell } as const;
export interface NavItem { href: string; label: string; icon: keyof typeof ICONS; badge?: number }

const isActive = (path: string, href: string) => (href === "/today" ? path === "/today" : path === href || path.startsWith(href + "/"));

export function TopNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined}
          className={cn("relative rounded-md px-3 py-2 text-[14.5px] transition-colors", isActive(path, i.href) ? "font-medium text-ink" : "text-mute hover:text-ink")}>
          {i.label}
          {!!i.badge && <span className="ml-1.5 rounded-full bg-review px-1.5 py-px text-[11px] font-medium text-white">{i.badge}</span>}
          {isActive(path, i.href) && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 bg-gold-line" />}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ items, userName }: { items: NavItem[]; userName: string }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const main = items.slice(0, 4), rest = items.slice(4);
  const showMore = rest.length > 0 || true;
  return (
    <>
      <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {main.map((i) => {
            const Icon = ICONS[i.icon];
            const on = isActive(path, i.href);
            return (
              <li key={i.href}>
                <Link href={i.href} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11.5px]", on ? "font-medium text-ink" : "text-mute")}>
                  <span className="relative"><Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.2 : 1.7} />{!!i.badge && <span className="absolute -right-2 -top-1 rounded-full bg-review px-1 text-[10px] text-white">{i.badge}</span>}</span>
                  {i.label}
                </Link>
              </li>
            );
          })}
          {showMore && (
            <li>
              <button onClick={() => setMore(true)} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11.5px] text-mute"><Menu className="h-[22px] w-[22px]" strokeWidth={1.7} />More</button>
            </li>
          )}
        </ul>
      </nav>
      {more && (
        <div className="no-print fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button aria-label="Close" className="absolute inset-0 bg-ink/30" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-paper px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-lift">
            <div className="mb-3 flex items-center justify-between"><p className="text-[13px] text-mute">{userName}</p><button onClick={() => setMore(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-sunk"><X className="h-5 w-5" /></button></div>
            <ul className="divide-y divide-line">
              {rest.map((i) => { const Icon = ICONS[i.icon]; return <li key={i.href}><Link href={i.href} onClick={() => setMore(false)} className="flex h-14 items-center gap-3 text-[16px]"><Icon className="h-5 w-5 text-mute" />{i.label}{!!i.badge && <span className="ml-auto rounded-full bg-review px-2 text-[12px] text-white">{i.badge}</span>}</Link></li>; })}
              <li><SignOut className="flex h-14 w-full items-center gap-3 text-[16px]" /></li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export function SignOut({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <button className={className} onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}>
      <LogOut className="h-5 w-5 text-mute" />{children ?? "Sign out"}
    </button>
  );
}
