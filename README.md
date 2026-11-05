# GoldTrack ERP — Jewellery Bullion Accounting & Inventory Platform

> **Client:** Company A, Coimbatore (5 Showrooms, Sullivan Street Workshop, Central Bullion Vault, ~40 Karigars, ₹220–₹260 Cr Annual Revenue)  
> **Target:** Eliminate ₹1.2 Cr/yr in unexplained gold loss (drop loss from 0.4% to <0.15%) and cut month-end reconciliation from 3 days to half a day (0.5 day).

---

## 💎 Executive Summary

GoldTrack ERP is a mission-critical jewellery bullion inventory and gold-accounting platform designed to replace fragile paper ledgers and disconnected spreadsheets with an immutable, 3-decimal precision ledger.

Every gram of gold is traceable from vault issue, workshop manufacturing, scrap smelting, and old-gold exchange to showroom stock.

---

## 🚀 Key Modules & Architecture (100% Completed)

### 1. Executive Loss Reduction Dashboard (`/`)
- **₹1.2 Cr Loss Recovery Tracker**: Live meter tracking progress from 0.4% loss (₹1.20 Cr baseline) to <0.15% target (< ₹45 Lakhs).
- **Consolidated Bullion Stock**: Real-time breakdown across Central Vault, Sullivan St Workshop, 5 Showrooms, and Government-approved Refineries.
- **Financial & Wastage Trends**: Interactive Recharts tracking Issued vs. Returned Fine Gold, Karigar Balances, and Wastage Drift.
- **Discrepancy Stream**: Confidential loss advisory alerts reserved exclusively for the Managing Partner and Head of Finance.

### 2. Karigar Master & Category Wastage Engine (`/karigars`)
- Dynamic wastage percentage allowances per jewellery category (e.g., Chains 1.0%, Rings 0.8%, Necklaces 1.2% / 3.0%, Bangles 0.9%).
- Individual artisan records with running fine-gold balances, phone numbers, assigned workshop benches, and active/inactive status.

### 3. Gold Issue Workflow (`/gold-issues/new`)
- Real-time bullion math: `Fine Gold = Gross Weight × (Purity % / 100)` to 3 decimal places (`0.001g`).
- Dual-signature official printable issue slip (`PrintSlipModal`).
- Automatic debit from source vault safe and addition to Karigar running account.
- **AI Scale OCR Reader**: Auto-reads scale LCD photos with side-by-side verification and mismatch blocking.

### 4. Finished Jewellery Receipt & Wastage Audit (`/gold-receipts/new`)
- Itemized returns for **Finished Pieces (with BIS HUID)**, **Scrap / Sprue Ends**, and **Bench Filings / Dust**.
- Live Wastage Calculation Engine:
  - $\text{Total Recovered Fine} = \text{Finished Fine} + \text{Scrap Fine} + \text{Filings Fine}$
  - $\text{Actual Wastage} = \text{Issued Fine} - \text{Total Recovered Fine}$
  - $\text{Allowed Wastage} = \text{Issued Fine} \times (\text{Agreed } \% / 100)$
  - $\text{Excess Wastage} = \max(0, \text{Actual} - \text{Allowed})$
- Auto-generates non-accusatory quiet review advisories for Finance Head when excess loss occurs.

### 5. Old Gold Exchange Desk (`/old-gold`)
- Customer old jewellery assessment: gross weight, stone deduction, karat meter / XRF tested purity.
- Valuation linked directly to exchange sales bill.
- **Income Tax Rule 114B Compliance**: Mandatory customer PAN card collection for transactions exceeding ₹2,00,000.
- **Section 269ST Compliance**: Hard block prohibiting cash payments $\ge$ ₹2,00,000.

### 6. Karigar Mobile Portal with Tamil Language Support (`/karigar-portal`)
- Responsive smartphone UI designed for workshop bench use.
- **Full Bilingual Toggle (English / தமிழ்)**:
  - *பணி அட்டை* (Job Card)
  - *வழங்கப்பட்ட சுத்த தங்கம்* (Issued Fine Gold)
  - *நிலுவை இருப்பு* (Outstanding Balance)
  - *கழிவு அனுமதி* (Allowed Wastage)
- Direct access to printable slips and running balance confirmation.

### 7. Power Cut & Outage Resilience
- Coimbatore workshop power outage detection via `OfflineSyncBanner`.
- Caches pending entries in browser storage and automatically syncs when electricity/network restores.

### 8. Auditing & Tally Integration (`/reports`, `/exports`)
- Immutable transaction audit log (`/audit-logs`) recording timestamp, user, source, destination, and reference.
- 1-click XML export compatible with **Tally Prime** and **Tally.ERP 9**.

---

## 📊 Sample Data Verification (Murugesan S)

The exact sample transaction chain from the specification is pre-seeded and tested:

| Txn ID | Artisan | Type | Gross Wt (g) | Purity % | Fine Wt (g) | Allowed % | Running Fine Balance (g) |
|---|---|---|---|---|---|---|---|
| **TX-30411** | Murugesan S | Issue (Necklace Gold) | 120.000 | 91.60 | **109.920** | 3.00% | **109.920** |
| **TX-30437** | Murugesan S | Receipt (Necklace `CB9142`) | 112.450 | 91.60 | **103.004** | 3.00% | **6.916** |
| **TX-30438** | Murugesan S | Receipt (Scrap / Sprue) | 3.300 | 91.60 | **3.023** | 3.00% | **3.893** |

*Resulting Reconciliation:*
- Total Recovered Fine = $103.004 + 3.023 = 106.027\text{g}$
- Actual Wastage = $109.920 - 106.027 = 3.893\text{g}$
- Allowed Wastage = $109.920 \times 3\% = 3.298\text{g}$
- Excess Wastage = $3.893 - 3.298 = 0.595\text{g}$ (Quiet Review Item created for Finance Head)

---

## 🛠️ Tech Stack & Standards

- **Framework:** Next.js 15 (App Router, React 19)
- **Styling:** Tailwind CSS (Warm Ivory `#FDFBF7`, Champagne Gold `#C5A059`, Deep Charcoal `#1C1917`)
- **Database:** PostgreSQL (Neon Serverless ready) via Prisma ORM (`@prisma/client@6.19.3`)
- **Precision:** `Decimal.js` with exact `@db.Decimal(12, 3)` (0.001g bullion precision)
- **Icons & Charts:** Lucide Icons, Recharts
- **Security:** JOSE JWT auth, bcryptjs password hashing, role-based route guards

---

## 🧪 Testing & Verification

Run the automated test suite verifying all 9 mission-critical calculations:
```bash
npm test
```
All tests pass with 0 failures:
- ✅ API Simulation: Gold Issue -> Finished Receipt -> Wastage Audit
- ✅ API Simulation: Excess Wastage Breached -> Alert Created
- ✅ API Simulation: Old Gold Exchange Valuation
- ✅ Sample Data TX-30411 — Issue to Murugesan S (109.920g)
- ✅ Sample Data TX-30437 — Receipt Necklace (112.450g -> 6.916g balance)
- ✅ Sample Data TX-30438 — Receipt Scrap (3.300g -> 3.893g balance)
- ✅ Income Tax Compliance — Mandatory PAN for > ₹2,00,000 Old-Gold
- ✅ Section 269ST Compliance — Prohibits Cash payment $\ge$ ₹2,00,000
- ✅ AI Karigar Loss Drift Detection (>25% from 6-month baseline)

