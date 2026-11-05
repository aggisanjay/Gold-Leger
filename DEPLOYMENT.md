# GoldTrack ERP — Deployment & Operational Guide

## 1. Overview
GoldTrack ERP is a production-quality jewellery bullion inventory and gold-accounting platform built with **Next.js (latest version)**, **Tailwind CSS**, **Prisma ORM**, and **Neon PostgreSQL**.

It provides centralized, high-precision bullion tracking across **5 Showrooms**, **1 Central Vault (Zaveri Bazaar)**, **1 Master Workshop (SEEPZ)**, **1 Refinery Transit Hub**, and **40+ Karigars**.

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env`:

```env
# Neon PostgreSQL Connection String
# Get this from your Neon Console (https://console.neon.tech)
DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require"

# JWT Secret for Session Signing
JWT_SECRET="goldtrack-erp-super-secret-jwt-key-2026-luxury-bullion"

# Application Environment
NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="GoldTrack ERP"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 3. Local Installation & Development

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Automated Mathematical & API Calculation Tests
```bash
npm test
```
*Validates fine-gold calculations, agreed wastage ceilings, excess wastage alert generation, and old-gold valuations.*

### Step 3: Neon Database Setup & Migrations
Once your `DATABASE_URL` is configured with your Neon PostgreSQL connection string:
```bash
# Push Prisma schema to Neon Database
npx prisma db push

# Seed realistic demonstration dataset
node prisma/seed.js
```

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Production Build & Deployment

To build an optimized production bundle:
```bash
npm run build
npm start
```

---

## 5. Demonstration Accounts & Personas

GoldTrack ERP includes built-in 1-click persona switching located in the top navigation bar and on `/login`:

| Role | Name | Email | Password | Scope |
|---|---|---|---|---|
| **Proprietor / Super Admin** | Rajeshwar Zaveri | `owner@goldtrack.com` | `GoldTrack@2026` | Consolidated (All Showrooms, Vault, Workshop) |
| **Branch Manager** | Vikramaditya Rathore | `branch.mgr@goldtrack.com` | `GoldTrack@2026` | Flagship Showroom — Colaba |
| **Inventory Manager** | Suresh Chandra Parekh | `inventory.mgr@goldtrack.com` | `GoldTrack@2026` | Zaveri Bazaar Central Strongroom Safe |
| **Chartered Accountant** | Kavita Shah, CA | `accountant@goldtrack.com` | `GoldTrack@2026` | Audit, Reconciliation & Tally Exports |
| **Master Artisan (Karigar)** | Ramesh Baburao Soni | `karigar.ramesh@goldtrack.com` | `GoldTrack@2026` | SEEPZ Bay A & Mobile Karigar Portal |
| **Appraisal Officer** | Nilesh Varma | `oldgold.staff@goldtrack.com` | `GoldTrack@2026` | Old-Gold Purchase & Exchange Desk |

---

## 6. Business Accounting & Mathematical Rules

1. **Fine Gold Calculation**:
   $$\text{Fine Gold} = \frac{\text{Gross Weight} \times \text{Purity Percentage}}{100}$$
   Calculated with 3 decimal places (0.001g milligram precision) using `decimal.js`.

2. **Total Recovered Fine Gold**:
   $$\text{Recovered Fine} = \text{Finished Jewellery Fine} + \text{Scrap Fine} + \text{Filings Fine}$$

3. **Wastage & Loss Audit**:
   - $\text{Actual Wastage} = \text{Issued Fine} - \text{Total Recovered Fine}$
   - $\text{Allowed Wastage} = \frac{\text{Issued Fine} \times \text{Agreed Karigar Category \%}}{100}$
   - $\text{Excess Wastage} = \max(0, \text{Actual Wastage} - \text{Allowed Wastage})$

   *When Excess Wastage > 0, the system automatically creates a `WastageAlert` requiring formal investigation and sign-off.*

4. **Old-Gold Valuation**:
   - $\text{Net Eligible Weight} = \text{Gross Weight} - \text{Approved Stone/Enamel Deduction}$
   - $\text{Fine Gold Equivalent} = \frac{\text{Net Eligible Weight} \times \text{Tested Purity \%}}{100}$
   - $\text{Exchange Value} = \text{Fine Gold Equivalent} \times \text{Gold Rate per Gram}$

