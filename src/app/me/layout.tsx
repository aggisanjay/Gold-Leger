import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";

export const metadata = {
  title: "Karigar Portal — Gold Ledger",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function KarigarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.role !== "KARIGAR") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-sunk/30 text-ink antialiased">
      <div className="mx-auto min-h-screen max-w-md bg-paper border-x border-line shadow-sm flex flex-col">
        {children}
      </div>
    </div>
  );
}
