"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { callApi } from "@/lib/api-client";

export function MeHeader({
  name,
  code,
  lang,
}: {
  name: string;
  code: string;
  lang: "ta" | "en";
}) {
  const router = useRouter();

  async function handleLogout() {
    await callApi("/api/auth/logout", "POST");
    router.push("/login");
  }

  const isTa = lang === "ta";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-sm">
      <div>
        <h1 className="text-[16px] font-bold text-ink leading-tight truncate max-w-[180px] xs:max-w-[220px]">
          {name}
        </h1>
        <span className="fig text-[11px] text-mute">#{code}</span>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={isTa ? "/me?lang=en" : "/me"}
          className="rounded-lg border border-line-strong bg-paper px-2.5 py-1 text-[12px] font-medium text-ink hover:bg-sunk transition-colors"
        >
          {isTa ? "English" : "தமிழ்"}
        </a>

        <button
          onClick={handleLogout}
          title={isTa ? "வெளியேறு" : "Sign out"}
          className="inline-flex items-center gap-1 rounded-lg border border-line-strong bg-paper px-2.5 py-1 text-[12px] font-medium text-mute hover:text-bad transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className={isTa ? "font-tamil" : ""}>
            {isTa ? "வெளியேறு" : "Sign out"}
          </span>
        </button>
      </div>
    </header>
  );
}

