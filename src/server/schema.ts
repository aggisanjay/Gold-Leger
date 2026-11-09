/**
 * Database schema. Weights are INTEGER milligrams, purities INTEGER basis points (91.60% = 9160),
 * money INTEGER paise. The ledger is append-only: nothing is updated or deleted, mistakes are
 * corrected with a reversal that leaves the original visible.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('CLERK','FINANCE','PARTNER','KARIGAR')),
  password_hash TEXT NOT NULL, karigar_id TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS karigars (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, name_ta TEXT, phone TEXT, bench TEXT,
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, name_ta TEXT, default_wastage_bp INTEGER NOT NULL CHECK (default_wastage_bp BETWEEN 0 AND 2000)
);
CREATE TABLE IF NOT EXISTS karigar_wastage (
  karigar_id TEXT NOT NULL REFERENCES karigars(id), category_id TEXT NOT NULL REFERENCES categories(id),
  wastage_bp INTEGER NOT NULL CHECK (wastage_bp BETWEEN 0 AND 2000), updated_by TEXT, updated_at TEXT NOT NULL,
  PRIMARY KEY (karigar_id, category_id)
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, job_no TEXT NOT NULL UNIQUE, karigar_id TEXT NOT NULL REFERENCES karigars(id),
  category_id TEXT NOT NULL REFERENCES categories(id), description TEXT,
  wastage_bp INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('OPEN','CLOSED')),
  opened_on TEXT NOT NULL, closed_on TEXT, allowance_mg INTEGER, loss_mg INTEGER, closed_by TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_jobs_karigar ON jobs(karigar_id, status);
CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY, sha256 TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('WEIGHT','PURITY')),
  engine TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('READ','UNSURE','UNREADABLE')),
  value INTEGER, raw_text TEXT, confidence REAL NOT NULL, reason TEXT, mime TEXT NOT NULL, photo BLOB NOT NULL,
  used_by TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS txns (
  id TEXT PRIMARY KEY, txn_no TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('OPENING','ISSUE','RECEIPT','ALLOWANCE','LOSS','OLD_GOLD','TO_REFINER','FROM_REFINER','REVERSAL')),
  subtype TEXT CHECK (subtype IS NULL OR subtype IN ('PIECE','SCRAP','FILINGS')),
  job_id TEXT REFERENCES jobs(id), karigar_id TEXT REFERENCES karigars(id), slip_no TEXT,
  gross_mg INTEGER, purity_bp INTEGER, fine_mg INTEGER NOT NULL CHECK (fine_mg >= 0),
  huid TEXT, item_desc TEXT, weight_reading_id TEXT, purity_reading_id TEXT, verification TEXT, note TEXT,
  reverses TEXT, reversed_by TEXT, business_date TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
  idempotency_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS ix_txns_job ON txns(job_id);
CREATE INDEX IF NOT EXISTS ix_txns_date ON txns(business_date);
CREATE UNIQUE INDEX IF NOT EXISTS ux_txns_huid ON txns(huid) WHERE huid IS NOT NULL AND reversed_by IS NULL;
CREATE TABLE IF NOT EXISTS ledger_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT, txn_id TEXT NOT NULL REFERENCES txns(id), account TEXT NOT NULL,
  fine_mg INTEGER NOT NULL, business_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lines_account ON ledger_lines(account, business_date);
CREATE INDEX IF NOT EXISTS ix_lines_txn ON ledger_lines(txn_id);
CREATE TABLE IF NOT EXISTS old_gold (
  id TEXT PRIMARY KEY, purchase_no TEXT NOT NULL UNIQUE, txn_id TEXT NOT NULL REFERENCES txns(id), bill_no TEXT NOT NULL,
  customer_name TEXT NOT NULL, customer_phone TEXT, gross_mg INTEGER NOT NULL, deduction_mg INTEGER NOT NULL, net_mg INTEGER NOT NULL,
  purity_bp INTEGER NOT NULL, fine_mg INTEGER NOT NULL, rate_paise INTEGER NOT NULL, value_paise INTEGER NOT NULL,
  payment_mode TEXT NOT NULL, pan TEXT, weight_reading_id TEXT, purity_reading_id TEXT, verification TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','VOID')), void_reason TEXT, voided_by TEXT,
  business_date TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_old_gold_bill ON old_gold(bill_no) WHERE status = 'ACTIVE';
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('DRIFT','JOB_EXCESS')), level TEXT NOT NULL CHECK (level IN ('WATCH','REVIEW')),
  karigar_id TEXT NOT NULL REFERENCES karigars(id), job_id TEXT, title TEXT NOT NULL, summary TEXT NOT NULL, evidence TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN','REVIEWED','EXPLAINED','DISMISSED')), note TEXT, resolved_by TEXT, resolved_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_alerts_status ON alerts(status, karigar_id);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sequences (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, user_id TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT, detail TEXT
);
`;
