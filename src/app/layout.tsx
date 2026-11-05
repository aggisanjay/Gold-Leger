import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppContext";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { OfflineSyncBanner } from "@/components/OfflineSyncBanner";

export const metadata: Metadata = {
  title: "GoldTrack ERP — Company A, Coimbatore Bullion Ledger",
  description: "Enterprise bullion inventory and gold-accounting platform for luxury jewellery chains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FDFBF7] text-[#1C1917] min-h-screen antialiased flex flex-col">
        <AppProvider>
          <div className="flex min-h-screen bg-[#FDFBF7]">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ml-64">
              <TopNav />
              <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </div>
          <OfflineSyncBanner />
        </AppProvider>
      </body>
    </html>
  );
}
