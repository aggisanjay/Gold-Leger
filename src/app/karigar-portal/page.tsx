"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Smartphone,
  Scale,
  Printer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronRight,
  Globe,
} from "lucide-react";
import { PrintSlipModal } from "@/components/PrintSlipModal";

export default function KarigarMobilePortal() {
  const [karigar, setKarigar] = useState<any | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [lang, setLang] = useState<"ta" | "en">("ta"); // Default to Tamil as karigars in Coimbatore read Tamil!

  // Tamil / English Dictionary
  const t = {
    ta: {
      portalTitle: "பொற்கொல்லர் தளம்",
      subTitle: "கோல்ட்டிராக் மொபைல் போர்ட்டல்",
      runningBalance: "நிலுவையில் உள்ள சுத்த தங்கம்",
      activeJobs: "நடைமுறையில் உள்ள வேலைகள்",
      completedJobs: "முடிந்த கணக்குகள்",
      issuedFine: "வழங்கப்பட்ட தங்கம்",
      agreedWastage: "ஒப்புக்கொண்ட சேதாரம்",
      targetDate: "முடிக்க வேண்டிய நாள்",
      printSlip: "வேலை ரசீது",
      statusCompleted: "சரிபார்க்கப்பட்டது",
      statusInProgress: "செயல்பாட்டில் உள்ளது",
      noActiveJobs: "நிலுவை வேலைகள் எதுவும் இல்லை",
      allAccounted: "அனைத்து தங்க விநியோகங்களும் சரியாக கணக்கிடப்பட்டுள்ளன.",
      switchLang: "English",
      artisanBay: "பட்டறை பிரிவு",
    },
    en: {
      portalTitle: "Artisan Companion",
      subTitle: "GoldTrack Mobile Portal",
      runningBalance: "Running Fine Gold",
      activeJobs: "Active Job Cards",
      completedJobs: "Reconciled History",
      issuedFine: "Fine Gold Issued",
      agreedWastage: "Agreed Wastage",
      targetDate: "Target Date",
      printSlip: "Job Slip",
      statusCompleted: "Completed",
      statusInProgress: "In Progress",
      noActiveJobs: "No outstanding jobs in this tab",
      allAccounted: "All bullion receipts are currently accounted for.",
      switchLang: "தமிழ்",
      artisanBay: "Workshop Bay",
    },
  }[lang];

  useEffect(() => {
    // For artisan Murugesan S (KRG-304) from Coimbatore Sullivan Street workshop
    fetch("/api/karigars")
      .then((r) => r.json())
      .then((kList) => {
        const murugesan = kList.find((k: any) => k.name.includes("Murugesan")) || kList[0];
        fetch(`/api/gold-issues?karigarId=${murugesan.id}`)
          .then((r) => r.json())
          .then((jobs) => {
            setKarigar({ ...murugesan, jobs });
          });
      });
  }, []);

  if (!karigar) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-xs text-[#78716C]">
        Connecting to Coimbatore Artisan Mobile Gateway...
      </div>
    );
  }

  const jobs = karigar.jobs || [];
  const activeJobs = jobs.filter((j: any) => j.status === "IN_PROGRESS");
  const completedJobs = jobs.filter((j: any) => j.status === "COMPLETED");
  const displayJobs = activeTab === "ACTIVE" ? activeJobs : completedJobs;

  return (
    <div className="max-w-md mx-auto space-y-5 pb-12 font-sans">
      {/* Mobile Top App Bar */}
      <div className="bg-gradient-to-r from-[#1C1917] to-[#2E2823] text-white p-5 rounded-2xl shadow-xl border border-[#C5A059]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#C5A059] flex items-center justify-center font-serif font-bold text-sm text-black">
              G
            </div>
            <div>
              <h2 className="font-serif font-bold text-sm tracking-wide">{t.portalTitle}</h2>
              <p className="text-[10px] text-[#DBC485]">{t.subTitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Tamil / English Toggle */}
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 hover:bg-white/20 text-[#DBC485] border border-white/20 transition"
              title="Toggle Language"
            >
              <Globe className="w-3 h-3" />
              <span>{t.switchLang}</span>
            </button>
            <span className="text-[10px] bg-[#C5A059]/20 text-[#DBC485] px-2 py-0.5 rounded font-mono border border-[#C5A059]/40">
              {karigar.code}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#E7E2DA]">
              {lang === "ta" && karigar.nameTamil ? karigar.nameTamil : karigar.name}
            </p>
            <p className="text-[10px] text-[#A8A29E]">{t.artisanBay}: {karigar.workshop}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#DBC485] uppercase tracking-wider block font-semibold">{t.runningBalance}</span>
            <span className="text-2xl font-serif font-bold text-white font-mono">
              {Number(karigar.runningBalanceFine).toFixed(3)}
              <span className="text-xs font-sans font-normal text-[#DBC485] ml-1">g</span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Tabs */}
      <div className="flex rounded-xl bg-[#FAF7F2] p-1 border border-[#E7E2DA] text-xs font-semibold">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === "ACTIVE"
              ? "bg-[#C5A059] text-white shadow-sm"
              : "text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          {t.activeJobs} ({activeJobs.length})
        </button>
        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === "COMPLETED"
              ? "bg-[#C5A059] text-white shadow-sm"
              : "text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          {t.completedJobs} ({completedJobs.length})
        </button>
      </div>

      {/* Job Slips List */}
      <div className="space-y-3">
        {displayJobs.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-[#E7E2DA] p-6">
            <CheckCircle2 className="w-8 h-8 text-[#0D5C3A] mx-auto mb-2" />
            <p className="text-xs font-bold text-[#1C1917]">{t.noActiveJobs}</p>
            <p className="text-[11px] text-[#78716C] mt-1">{t.allAccounted}</p>
          </div>
        ) : (
          displayJobs.map((job: any) => (
            <div
              key={job.id}
              className="bg-white border border-[#E7E2DA] rounded-xl p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#F4EFE6] pb-2">
                <div>
                  <span className="font-mono font-bold text-xs text-[#1C1917]">{job.jobNumber}</span>
                  <p className="text-[11px] text-[#78716C]">{job.categoryName}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    job.status === "COMPLETED"
                      ? "bg-[#ECFDF5] text-[#0D5C3A]"
                      : "bg-[#FFFBEB] text-[#B45309]"
                  }`}
                >
                  {job.status === "COMPLETED" ? t.statusCompleted : t.statusInProgress}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF7F2] p-2.5 rounded-lg font-mono">
                <div>
                  <span className="text-[10px] font-sans text-[#78716C]">{t.issuedFine}:</span>
                  <p className="font-bold text-[#1C1917]">{Number(job.issue?.fineGoldWeight || 0).toFixed(3)}g</p>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-[#78716C]">{t.agreedWastage}:</span>
                  <p className="font-bold text-[#0D5C3A]">{Number(job.agreedWastagePct).toFixed(2)}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-[#78716C]">
                  {t.targetDate}: {new Date(job.targetCompletionDate).toLocaleDateString()}
                </span>
                <button
                  onClick={() =>
                    setSelectedSlip({
                      title: lang === "ta" ? "பொற்கொல்லர் வேலை ரசீது (JOB SLIP)" : "ARTISAN JOB CARD SLIP",
                      slipNumber: job.issue?.slipNumber || job.jobNumber,
                      date: job.createdAt,
                      partyName: lang === "ta" && karigar.nameTamil ? karigar.nameTamil : karigar.name,
                      categoryOrDesc: job.categoryName,
                      items: [
                        {
                          label: lang === "ta" ? "வழங்கப்பட்ட சுத்த தங்கம் (Bullion)" : "Issued Raw Bullion",
                          grossWeight: job.issue?.grossWeight || 0,
                          purity: job.issue?.purityPct || 91.6,
                          fineWeight: job.issue?.fineGoldWeight || 0,
                        },
                      ],
                      notes: `${t.agreedWastage}: ${job.agreedWastagePct}%. Sullivan St Goldsmith Workshop, Coimbatore.`,
                    })
                  }
                  className="flex items-center space-x-1 text-xs font-semibold text-[#8C6A30] bg-[#FAF7F2] hover:bg-[#F3ECD7] border border-[#DBC485] px-2.5 py-1 rounded"
                >
                  <Printer className="w-3 h-3" />
                  <span>{t.printSlip}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedSlip && (
        <PrintSlipModal
          isOpen={!!selectedSlip}
          onClose={() => setSelectedSlip(null)}
          {...selectedSlip}
        />
      )}
    </div>
  );
}
