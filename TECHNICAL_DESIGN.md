# Gold Ledger — Technical Design Document

**Repository:** `https://github.com/company-a/gold-ledger`  
**Client:** Company A, Coimbatore (5 Showrooms, Sullivan Street Workshop, ~40 Karigars, ₹220–₹260 Cr Annual Revenue)  
**Author:** Software Engineering Team  
**Status:** Production-Ready Build  

---

## 1. Executive Summary & Architecture

### 1.1 The Business Problem
Company A operates five retail showrooms and a centralized manufacturing workshop on Sullivan Street, Coimbatore, issuing ~20 kg of fine gold monthly (240 kg/year). Historical gold movement relied on paper ledgers, manual Excel entry, and mental arithmetic by workshop clerks. 

This manual accounting created two severe financial leaks:
1. **Unexplained Gold Loss:** Beyond agreed wastage allowances, 0.4% (960 grams) vanished annually without an audit trail. At ₹12,500/g, this loss equaled **₹1.20 crore/year**.
2. **Reconciliation Overhead:** Month-end reconciliation required 6 accountants working 3 full days each month (216 person-days/year @ ₹2,500/day = **₹5.40 lakh/year**).

### 1.2 Architectural Decisions & Rationale
- **Next.js 15 App Router & Server Components:** Server-rendered pages fetch immutable ledger data directly from libSQL via read-only transactions, ensuring stock statements and karigar balances cannot be tampered with on client devices.
- **Strict Integer-Only Mathematics (Zero Floats):** JavaScript floating-point arithmetic (`0.1 + 0.2 = 0.30000000000000004`) is strictly banned. All gold weights are represented as **integer milligrams** (`120.000g = 120,000 mg`), purities as **integer basis points** (`91.60% = 9,160 bp`), and currency as **integer paise** (`₹12,500.00 = 1,250,000 paise`).
- **libSQL / SQLite Database:** Zero-configuration, sub-millisecond local SQLite file (`data/goldledger.db`) for local workshop deployment, running identical SQL syntax on cloud Turso clusters when replicated to cloud environments.
- **Offline-First Resilience:** Shared Android tablets on the workshop bench experience periodic power cuts and Wi-Fi drops. The app employs an IndexedDB outbox with client-generated UUID idempotency keys; transactions are parked offline and retried automatically when power/network restores.

---

## 2. Double-Entry Data Model

GoldTrack ERP operates as an **append-only, zero-sum double-entry ledger**. Gold is never created, deleted, or silently modified; every transaction consists of balanced debit and credit ledger lines where $\sum \text{fine\_mg} = 0$.

```
[EXTERNAL]  ──(+Bullion)──>  [VAULT]  ──(+Issue)──>  [KARIGAR:id]
                                 ^                        │
                                 │                   (+Receipt)
                                 │                        ▼
                            [REFINER]  <──(+Scrap)──  [SCRAP / JEWELLERY]
                                                          │
                                                    (+Settlement)
                                                          ▼
                                                [ALLOWANCE] & [LOSS]
```

### 2.1 Ledger Accounts
- `VAULT`: Pure bullion bars and stock kept in the workshop safe.
- `JEWELLERY`: Finished ornaments received from karigars awaiting showroom delivery.
- `SCRAP`: Recovered scrap wire, sprue ends, filings, and old gold exchange jewellery.
- `KARIGAR:<id>`: Running fine-gold balance held by a specific artisan.
- `REFINER`: Gold currently dispatched to an accredited refinery for smelting and assaying.
- `ALLOWANCE`: Legitimate craft wastage written off against agreed category allowances.
- `LOSS`: Shortfall exceeding agreed allowances, isolated for review by the Finance Head.
- `EXTERNAL`: The outside world (supplier purchases, opening inventory, customer exchanges).

### 2.2 Relational Schema
- `txns`: Header recording `txn_no` (e.g. `TX-30411`), `kind` (`ISSUE`, `RECEIPT`, `OLD_GOLD`, etc.), `gross_mg`, `purity_bp`, `fine_mg`, `huid`, `verification`, and `idempotency_key`.
- `ledger_lines`: Zero-sum balance entries linking each transaction to source and destination accounts.
- `jobs`: Lifecycle tracking for each ornament batch (`OPEN` &rarr; `CLOSED`), category, agreed wastage percentage, allowed mg, and loss mg.
- `karigars`: Artisan master with name, Tamil name (`name_ta`), phone, assigned bench, and active flag.
- `karigar_wastage`: Per-karigar, per-category wastage overrides (e.g., Murugesan S @ 3.00% for Necklaces).
- `readings`: Scale and karat-meter photos, SHA-256 hash, OCR status, parsed value, and audit bindings.
- `old_gold`: Counter exchange purchases with customer name, phone, PAN, payment mode, and billing link.
- `alerts`: Drift and excess wastage flags (`WATCH` or `REVIEW`) with resolution audit notes.

---

## 3. Core Business Flows

### 3.1 Gold Issue Flow
1. Inventory Clerk selects karigar, jewellery category, and inputs gross weight and purity.
2. Clerk snaps or uploads scale photo; OCR extracts weight; visual mismatch blocks saving.
3. System calculates exact fine gold: $\text{fine\_mg} = \lfloor \frac{\text{gross\_mg} \times \text{purity\_bp}}{10,000} \rfloor$.
4. Atomically debits `VAULT` and credits `KARIGAR:<id>`.
5. Prints bilingual dual-signature A5 voucher (`/slips/SL-xxxxx`) with post-transaction running balance.

### 3.2 Gold Receipt & Job Settlement Flow
1. Karigar returns finished ornaments (with mandatory 6-character alphanumeric BIS HUID), scrap, and filings.
2. Live settlement engine calculates:
   - $\text{Total Recovered} = \text{Finished} + \text{Scrap} + \text{Filings}$
   - $\text{Actual Wastage} = \text{Issued} - \text{Total Recovered}$
   - $\text{Allowed Wastage} = \lfloor \text{Issued} \times \text{Agreed \%} \rfloor$
   - $\text{Excess Loss} = \max(0, \text{Actual Wastage} - \text{Allowed Wastage})$
3. When closing the job, `ALLOWANCE` absorbs the agreed wastage; any excess is posted to `LOSS` and raises an advisory alert.

### 3.3 Old Gold Exchange Desk
1. Counter clerk inputs gross weight, stone deduction, tested karat/purity, and customer invoice number.
2. Value calculated at live bullion rate ($\text{paise} = \lfloor \frac{\text{net\_mg} \times \text{purity\_bp} \times \text{rate\_paise}}{10,000,000} \rfloor$).
3. **Statutory Tax Rule Enforcement:**
   - **Income Tax Rule 114B:** PAN card mandatory for transactions $> ₹2,00,000$.
   - **Section 269ST:** Cash payments $\ge ₹2,00,000$ are strictly blocked by the UI and API.

---

## 4. How the AI Works

The AI vision and drift advisory subsystems operate under strict defensive principles: **an AI reading is only ever a second pair of eyes; it never silently writes values into the ledger.**

### 4.1 Multi-Engine Optical Vision Pipeline
1. **Local Seven-Segment CV Reader (`sevenseg.ts`):** Client and server image processing for digital scale LCDs. Normalizes lighting, binarizes digits, segments character bounding boxes, and decodes 7-segment states without network roundtrips.
2. **Tesseract.js OCR Engine (`printout.ts`):** Specialized for thermal printouts from XRF karat meters (e.g. Niton, Olympus), extracting gold purity percentages and Karat designations.
3. **Optional Google Gemini 2.0 Flash Vision (`gemini.ts`):** When `GEMINI_API_KEY` is provided, high-resolution scale photos are analyzed via multimodal vision to extract weight, purity, confidence, and device metadata.
4. **Validation Triad:**
   - `READ`: High confidence ($\ge 0.80$); value matches plausible balance envelope ($0.001\text{g} - 5,000.000\text{g}$).
   - `UNSURE`: Partial OCR detection; forces clerk to manually confirm the photo by eye.
   - `UNREADABLE`: Glare, obstruction, or uncalibrated pan; clerk must tick physical eye-check box.
5. **Enforced Safeguards:**
   - **Mismatch Blocking:** If typed weight differs from confirmed scale OCR reading, the submit button is locked.
   - **Anti-Replay Protection:** Every photo's SHA-256 hash is recorded in `readings`; the same photo cannot back two entries.

---

## 5. Loss Drift Detector: Why Not an LLM?

Rather than sending sensitive artisan records to a non-deterministic Large Language Model, GoldTrack ERP uses a **statistical robust Z-score detector** over a 6-month rolling window of completed jobs.

$$\text{Use of Allowance} = \frac{\text{Actual Wastage mg}}{\text{Allowed Wastage mg}}$$

- **Median Absolute Deviation (MAD):** Resistant to single-job outliers (e.g. catastrophic crucible crack).
- **Classification Thresholds:**
  - `WATCH`: Karigar's loss ratio is $> 1.8 \times$ their historical median.
  - `REVIEW`: Karigar's loss ratio is $> 2.5 \times$ their historical median with $\ge 5$ completed jobs.
- **Why Not an LLM?**
  1. *Determinism:* Mathematical auditability is essential for financial compliance.
  2. *Zero Hallucination:* An LLM might invent accusations or overlook micro-gram drift.
  3. *Privacy & Speed:* Operates locally in $< 1\text{ ms}$ without transmitting artisan names across public APIs.
  4. *Quiet Tone:* Alerts are displayed exclusively to the Finance Head as technical review advisories (checking bench suction filter saturation or soldering alloy ratio), never as accusations.

---

## 6. UI & Design System

The visual identity is designed for a luxury retail jewellery business:
- **Palette:** Clean white canvas (`#ffffff`), cool ink typography (`#14161a`), subtle hairline dividers (`#e4e6ea`), and a single muted gold accent (`#8f6f12` text, `#c9a227` rule) reserved exclusively for running balances.
- **Alert Colors:** Muted slate-blue (`text-review`, `#2f4ea2`) for loss advisories so they read as quiet review items; red is strictly reserved for blocking validation errors.
- **Typography:**
  - UI prose: *Hanken Grotesk*
  - Bullion weights and currency: *IBM Plex Mono* (fixed-width tabular digits with slashed zeros, decimals aligned)
  - Karigar mobile portal: *Noto Sans Tamil*
- **Tape Component:** An adding-machine strip that exposes every intermediate addition and subtraction so the arithmetic is transparent to karigars and auditors.

---

## 7. Explicit Assumptions

Every domain assumption is formally documented:
1. **[ASSUMPTION: WASTAGE_DEFAULTS]** Default category wastage rates are set to: Chain 1.00% (100 bp), Ring 0.80% (80 bp), Necklace 1.20% (120 bp), Bangles 0.90% (90 bp). Individual artisans may have higher agreed allowances (e.g. Murugesan S has 3.00% for complex temple necklaces).
2. **[ASSUMPTION: TAX_THRESHOLDS]** Income Tax Rule 114B PAN requirement threshold is ₹2,00,000 (20,000,000 paise). Section 269ST cash ceiling is ₹2,00,000.
3. **[ASSUMPTION: BULLION_RATE]** Benchmark bullion valuation rate is pre-configured to ₹12,500/g (1,250,000 paise/g) and editable by Finance.
4. **[ASSUMPTION: TALLY_EXPORT]** Tally XML export follows the standard Tally Stock Journal voucher format with godowns mapped to *Vault - Fine Gold*, *Vault - Finished Jewellery*, *Refiner*, and *Karigar - Name*.
5. **[ASSUMPTION: AUTH_MODEL]** Staff sign in with username/password (`clerk`, `finance`, `partner` / `Demo@2026`). Karigars authenticate using their 10-digit mobile phone and 6-digit PIN (`9000000001` / `123456`).
6. **[ASSUMPTION: SEEDED_ARTISANS]** 14 representative karigars out of the ~40 workshop goldsmiths are pre-seeded with ~120 days of simulated transactions.
7. **[ASSUMPTION: SYNTHETIC_PHOTOS]** Pre-packaged scale LCD and karat printout photos in `public/samples/` are synthetic test fixtures representing standard laboratory instruments (Mettler Toledo, Niton XRF).

---

## 8. Out of Scope & Future Roadmap

### 8.1 Explicitly Cut / Out of Scope (Per Specification)
- Showroom retail Point-of-Sale (POS) customer billing software replacement.
- Customer-facing gold savings schemes and loyalty apps.
- Gold loan pledging and interest calculation.

### 8.2 What Next
- Direct RS-232 serial cable integration for live physical scale tethering on Chrome via Web Serial API.
- Live WebRTC camera stream with real-time on-device WASM OCR scanning.
- Automated WhatsApp/SMS slip dispatch via Indian telecom DLT-registered gateway.

---

## 9. Honest Technical Limits
1. **OCR on Synthetic Images:** The local seven-segment reader is optimized for high-contrast digital scale LCDs. Extreme glare or dirty lenses trigger the `UNSURE` state, requiring visual clerk confirmation.
2. **Offline Photo Verification:** While transaction data queues offline in IndexedDB, cloud Gemini vision API calls require network connectivity (local fallback OCR runs offline).
3. **In-Memory Login Rate-Limiter:** The 6-attempt/10-minute brute-force throttle runs in memory; multi-instance cloud deployments should back this with Redis or Turso.

