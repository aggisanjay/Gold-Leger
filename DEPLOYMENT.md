# Gold Ledger — Deployment & Operations Guide

> **Client:** Company A, Coimbatore (5 Showrooms, Sullivan Street Workshop, ~40 Karigars)  
> **App:** Gold Ledger (zero-float integer milligram ledger, local & cloud SQLite/Turso, AI scale/printout OCR, Tamil mobile portal)

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

| Persona | Role | Identifier / Username | Password / PIN | Scope |
|---|---|---|---|---|
| **Issue Clerk** | `CLERK` | `clerk` | `Demo@2026` | Workshop issues & receipts, scale verification |
| **Finance Head** | `FINANCE` | `finance` | `Demo@2026` | Vault bullion, refiner batches, rate setting, full stock statement, alerts |
| **Managing Partner** | `PARTNER` | `partner` | `Demo@2026` | Read-only executive oversight, stock statement & loss trend |
| **Artisan (Murugesan S)** | `KARIGAR` | `9000000001` | `123456` | Mobile phone portal (`/me`), Tamil slips & running fine-gold balance |

---

## 3. Production Deployment (Vercel / Render + Turso)

Gold Ledger runs as a standard Next.js 15 App Router application.

### Database: Turso (libSQL)
Create a managed database on [Turso](https://turso.tech/):
```bash
turso db create goldledger
turso db tokens create goldledger
```

### Environment Variables
Configure the following environment variables in your deployment dashboard (e.g. Vercel Project Settings or Render Environment):

| Variable Name | Required | Description |
|---|:---:|---|
| `SESSION_SECRET` | **Yes** | 64-character random hex string for signing JWT session cookies. Generated via `npm run setup`. Has no hardcoded fallback. |
| `DATABASE_URL` | **Yes** | Database connection string. In production: `libsql://your-db-org.turso.io`. (Locally: `file:data/goldledger.db`). |
| `DATABASE_AUTH_TOKEN` | In Cloud | Auth token provided by Turso (`turso db tokens create ...`). Not needed for local file databases. |
| `DEMO_MODE` | Optional | Set to `1` or `true` to display pre-filled demo login buttons on the login screen. |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for multimodal secondary reading of scale LCDs and karat printouts. |
| `INSECURE_COOKIES` | Optional | Set to `1` only if testing over plain HTTP without TLS (disables `Secure` cookie attribute). Never set in production. |

---

## 4. Database Seeding in Production

To seed your production Turso database with categories, staff users, initial vault bullion, and karigars:
```bash
DATABASE_URL="libsql://your-db-org.turso.io" DATABASE_AUTH_TOKEN="your-token" npm run seed
```

---

## 5. Verification Checklist

1. **Exact Sample Data:** Verify Murugesan S sample rows:
   - `TX-30411`: Issue 120.000g @ 91.60% &rarr; 109.920g Fine Balance
   - `TX-30437`: Receipt Necklace 112.450g @ 91.60% &rarr; 103.004g Fine, Balance 6.916g
   - `TX-30438`: Receipt Scrap 3.300g @ 91.60% &rarr; 3.023g Fine, Balance 3.893g
2. **AI Scale / Karat Meter OCR:** Upload scale display; verify that typing a mismatched weight blocks submission.
3. **Daily Stock Statement:** Accessible only to Finance and Partner; download CSV and Tally XML; print preview formatted for A4.
4. **Mobile Karigar Portal (`/me`):** Sign in with `9000000001` / `123456`; verify large fine-gold balance, Tamil labels, and recent slips at 360px width.
5. **Offline Outbox:** Turn off network; submit issue or receipt; entry is safely queued in IndexedDB and flushes when network restores.
