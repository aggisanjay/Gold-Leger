# Gold Ledger — Jewellery Bullion Accounting & Inventory Platform

> **Live Deployed App:** [https://goldleger.vercel.app](https://goldleger.vercel.app/)  
> **GitHub Repository:** [https://github.com/aggisanjay/Gold-Leger](https://github.com/aggisanjay/Gold-Leger)  
> **Client:** Company A, Coimbatore (5 Showrooms, Sullivan Street Workshop, ~40 Karigars, ₹220–₹260 Cr Revenue)  
> **Objective:** Reduce unexplained gold loss from 0.4% (₹1.2 Cr/yr) to under 0.15% (< ₹45 Lakhs), and cut month-end reconciliation from 3 days to half a day (0.5 day).

---

## 💎 Overview

Gold Ledger is an immutable, double-entry fine-gold accounting platform built specifically for gold jewellery manufacturing chains. Every single gram of gold that leaves the central vault is accounted for in pieces, scrap, filings, or agreed wastage allowances.

### Core Architecture & Guarantees

1. **Zero-Float Integer Ledger**: All weights are stored and calculated in integer milligrams (`Mg`), purity in integer basis points (`Bp`, where $91.60\% = 9160$), and currency in integer paise. No floating-point inaccuracies or IEEE 754 rounding drift can ever occur.
2. **Double-Entry Balance Constraint**: Every transaction consists of two balancing ledger lines whose sum is exactly zero:
   $$\sum \Delta \text{fine\mg} = 0$$
   Gold can only move between accounts (`VAULT`, `KARIGAR:<id>`, `SCRAP`, `FILINGS`, `REFINER`, `ALLOWANCE`, `LOSS`, `SUPPLIER`, `COUNTER`), never appear or vanish silently.
4. **Multi-Engine Vision OCR**: Reads scale weights and karat-meter purity printouts locally using an algorithmic 7-segment heuristic and Tesseract, with optional Gemini AI fallback. Clerks review photo and extracted values side-by-side; any unconfirmed mismatch blocks saving.
5. **Statistical Loss-Drift Detection**: Tracks karigar rolling wastage against their own personal historical mean and standard deviation (Z-score), raising non-accusatory review advisories for the Finance Head and Managing Partner before month-end.
6. **Power & Network Cut Resilience**: Coimbatore workshops face frequent outages. Gold Ledger operates offline via service workers, queues entries in IndexedDB, and synchronizes deterministically using client-generated UUID idempotency keys.
7. **Bilingual Karigar Mobile Portal**: Dedicated Tamil interface (`/me`) designed for 360px workshop smartphones with large, prominent balance displays and dual-language slips.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Initialize environment (.env.local with a fresh random SESSION_SECRET)
npm run setup

# 3. Create and seed database with 120 days of history and the sample data
npm run reset

# 4. Start local development server on port 3000
npm run dev

# 5. Run automated test suite (65 passing tests across domain, API guards, and flows)
npm test
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Demo Sign-in Credentials

The sign-in page (`/login`) includes 1-click credential auto-fill when `DEMO_MODE=true`:

| Role | Username / Identifier | Password / PIN | Access & Scope |
|---|---|---|---|
| **Issue Clerk** | `clerk` | `Demo@2026` | Issues and receives gold (`/today`, `/issue`, `/receive`), photo checks, old-gold desk (`/old-gold`), printable slips |
| **Finance Head** | `finance` | `Demo@2026` | Full oversight: daily stock statement (`/stock`), bullion vault & refiner movements, Tally XML & CSV exports, loss drift alerts (`/alerts`) |
| **Managing Partner** | `partner` | `Demo@2026` | Read-only executive oversight: daily stock statement, loss trend, and discrepancy reviews |
| **Artisan (Murugesan S)** | `9000000001` | `123456` | Karigar mobile portal (`/me`) in Tamil with open jobs, running fine-gold balance (`3.893 g`), and slips |

---

## 📊 Sample Data Verification (Murugesan S)

The exact sample transaction chain from the product specification is seeded and verified:

| Txn ID | Artisan | Type | Gross Wt (g) | Purity (%) | Fine Wt (g) | Allowed Wastage % | Running Fine Balance (g) |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| **TX-30411** | Murugesan S | Issue (Necklace) | 120.000 | 91.60 | 109.920 | 3.00% | **109.920** |
| **TX-30437** | Murugesan S | Receipt (Necklace) | 112.450 | 91.60 | 103.004 | 3.00% | **6.916** |
| **TX-30438** | Murugesan S | Receipt (Scrap) | 3.300 | 91.60 | 3.023 | 3.00% | **3.893** |

Reconciliation logic verified:
- **Total Recovered Fine**: $103.004 + 3.023 = 106.027\text{ g}$
- **Actual Wastage**: $109.920 - 106.027 = 3.893\text{ g}$
- **Agreed Wastage Allowance ($3.00\%$)**: $109.920 \times 0.03 = 3.298\text{ g}$
- **Excess Loss**: $3.893 - 3.298 = 0.595\text{ g}$ (Flagged for quiet review, zero-sum cleared to `LOSS` account on settlement)

---

## 🛠️ Technology Stack

- **Framework:** Next.js 15 (App Router, Server Actions, Server Components, standalone viewport)
- **Runtime:** Node.js 20+
- **Database:** SQLite / libSQL (`@libsql/client`) — local zero-setup file (`data/goldledger.db`) or cloud Turso
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) with custom luxury jewellery tokens:
  - Paper white (`#ffffff`), sunk cream (`#f5f6f7`), hairlines (`#e4e6ea`), cool ink (`#14161a`)
  - Assay gold accent (`#8f6f12` / `#c9a227`) reserved strictly for balances and focus rings
- **Typography:** 
  - `Hanken Grotesk Variable` (clean modern UI)
  - `IBM Plex Mono` (tabular numerals with slashed zeros for all weights and purity figures)
  - `Noto Sans Tamil Variable` (native Tamil font for artisan phone view)
- **Computer Vision:** Local 7-segment digital scale recognizer, Tesseract.js printout OCR, Sharp image normalizer, optional Gemini 2.5 Flash Vision
- **Testing:** Vitest 3.2 (65 unit and integration tests across arithmetic, API security guards, and full business flows)

---

## 📖 Documentation

- **[TECHNICAL_DESIGN.md](file:///c:/Users/aggis/Desktop/Gold-Leger/TECHNICAL_DESIGN.md)**: Comprehensive architectural specification, double-entry mathematical proofs, Z-score loss drift algorithm, and honest technical boundaries.
- **[DEPLOYMENT.md](file:///c:/Users/aggis/Desktop/Gold-Leger/DEPLOYMENT.md)**: Complete deployment guide for Vercel, Render, Turso cloud database, and environment configuration.
