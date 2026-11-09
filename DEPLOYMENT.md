# Gold Ledger — Deployment & Operations Guide

**Live Deployed Application:** [https://goldleger.vercel.app](https://goldleger.vercel.app/)  
**GitHub Repository:** [https://github.com/aggisanjay/Gold-Leger](https://github.com/aggisanjay/Gold-Leger)  
**Client:** Company A, Coimbatore (5 Showrooms, Sullivan Street Workshop, ~40 Karigars)  
**App:** Gold Ledger (zero-float integer milligram ledger, local & cloud SQLite/Turso, AI scale/printout OCR, Tamil mobile portal)

---

## 1. Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Initialize environment (.env.local with a fresh random SESSION_SECRET)
npm run setup

# 3. Create and seed local SQLite database with 120 days of history & the brief's sample rows
npm run reset

# 4. Start local development server on port 3000
npm run dev

# 5. Run test suite (Vitest: domain maths, flows, and API route guards)
npm test
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Demo Sign-in Credentials

The sign-in page (`/login`) includes 1-click credential auto-fill when `DEMO_MODE=true`:

| Persona | Role | Identifier / Username | Password / PIN | Scope |
|---|---|---|---|---|
| **Issue Clerk** | `CLERK` | `clerk` | `Demo@2026` | Workshop issues & receipts, scale verification, old-gold counter |
| **Finance Head** | `FINANCE` | `finance` | `Demo@2026` | Vault bullion, refiner batches, rate setting, full stock statement, loss alerts |
| **Managing Partner** | `PARTNER` | `partner` | `Demo@2026` | Read-only executive oversight, stock statement & loss trend |
| **Artisan (Murugesan S)** | `KARIGAR` | `9000000001` | `123456` | Mobile phone portal (`/me`), Tamil slips & running fine-gold balance |

---

## 3. Production Deployment (Vercel + Turso Cloud Database)

Gold Ledger runs as a standard Next.js 15 App Router application with a serverless libSQL database hosted on **Turso** (cloud SQLite).

### Step 3A: Create Cloud Database on Turso (No CLI needed)

1. Open **[https://app.turso.tech](https://app.turso.tech)** in your browser and sign in with GitHub.
2. Click **"Create database"**:
   - **Name**: `goldledger`
   - **Region**: Choose the closest region (e.g., `BOM - Mumbai, India` or `SIN - Singapore`).
   - Click **Create**.
3. Copy your database credentials:
   - **Database URL**: (e.g. `libsql://goldledger-[your-username].turso.io`)
   - Click **"Generate Token"** &rarr; **CRITICAL**: Ensure permissions are set to **"Read & Write"** (do NOT check Read-Only). Copy the generated token string.

### Step 3B: Deploy on Vercel

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your `Gold-Leger` repository.
4. Under **Environment Variables**, add:

| Variable Name | Required | Value / Source |
|---|:---:|---|
| `SESSION_SECRET` | **Yes** | 64-character random hex string (copy from `.env.local`). |
| `DATABASE_URL` | **Yes** | Your Turso URL: `libsql://goldledger-[your-user].turso.io` |
| `DATABASE_AUTH_TOKEN` | **Yes** | Your Turso **Read & Write** Auth Token. |
| `DEMO_MODE` | Optional | Set to `true` to show demo account buttons on login screen. |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for multimodal secondary reading of scale LCDs. |

5. Click **Deploy**. Vercel will build and deploy the app in under 60 seconds.

---

## 4. Seeding Your Production Database

To populate your cloud Turso database with the master categories, 14 karigars, 120 days of historical transactions, and today's live sample rows (`TX-30411`, `TX-30437`, `TX-30438`):

### Windows (PowerShell):
```powershell
$env:DATABASE_URL="libsql://goldledger-[your-user].turso.io"
$env:DATABASE_AUTH_TOKEN="your_read_write_token_here"
npm run seed
```

### Linux / macOS / Bash:
```bash
DATABASE_URL="libsql://goldledger-[your-user].turso.io" DATABASE_AUTH_TOKEN="your_token" npm run seed
```

---

## 5. Alternative: Single-Container Deployment (Railway, Render, VPS)

If deploying to a single server with a persistent disk volume:
1. Mount a persistent disk to `/app/data`.
2. Configure:
   - `DATABASE_URL` = `file:data/goldledger.db`
   - `SESSION_SECRET` = *(from `.env.local`)*
   - `DEMO_MODE` = `true`
3. Run `npm run reset && npm run build && npm start`.

---

## 6. Pre-Flight Verification Checklist

Before client handover or evaluation:
1. **Sample Data Verification:** Verify Murugesan S sample rows on `/today` and `/me`:
   - `TX-30411`: Issue 120.000g @ 91.60% &rarr; 109.920g Fine Balance
   - `TX-30437`: Receipt Necklace 112.450g @ 91.60% &rarr; 103.004g Fine, Balance 6.916g
   - `TX-30438`: Receipt Scrap 3.300g @ 91.60% &rarr; 3.023g Fine, Balance 3.893g
2. **AI Scale / Karat Meter OCR:** Test on `/issue` or `/old-gold`; verify that typing a mismatched weight blocks submission until confirmed.
3. **Daily Stock Statement:** Accessible exclusively to Finance and Partner; download CSV and Tally XML; print preview formatted for A4.
4. **Mobile Karigar Portal (`/me`):** Sign in with `9000000001` / `123456`; verify large fine-gold balance (`3.893 g`), Tamil labels, and recent slips (`/slips/SL-XXXX`) at 360px width.
5. **Loss Drift Alerts:** Review open statistical Z-score alerts on `/alerts`; add explanatory notes and mark reviewed.
6. **Offline Outbox:** Turn off network; submit an issue or receipt; entry is safely queued in IndexedDB and flushes when network restores.
