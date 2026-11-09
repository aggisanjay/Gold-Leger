import { createClient, type Client, type InValue, type Transaction } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";

/**
 * One SQL database for everything. Locally it is a SQLite file (zero setup). In production set
 * DATABASE_URL to a libSQL/Turso URL and DATABASE_AUTH_TOKEN: the same code runs unchanged.
 */
let client: Client | null = null;
let ready: Promise<void> | null = null;

export function dbUrl(): string {
  return process.env.DATABASE_URL || "file:data/goldledger.db";
}

export function db(): Client {
  if (!client) {
    const url = dbUrl();
    if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice(5)) || ".", { recursive: true });
    client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return client;
}

export async function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const c = db();
      if (dbUrl().startsWith("file:")) {
        await c.execute("PRAGMA foreign_keys = ON");
        await c.execute("PRAGMA journal_mode = WAL");
        await c.execute("PRAGMA busy_timeout = 10000");
      } else {
        await c.execute("PRAGMA foreign_keys = ON").catch(() => {});
      }
      await c.executeMultiple(SCHEMA);
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

export function closeDb() {
  client?.close();
  client = null; ready = null;
}

/** For tests: point at a fresh database. */
export function resetDbForTests(url: string) {
  closeDb();
  process.env.DATABASE_URL = url;
}

type Executor = Client | Transaction;
export type Row = Record<string, any>;

export async function all<T = Row>(c: Executor, sql: string, args: InValue[] = []): Promise<T[]> {
  const r = await c.execute({ sql, args });
  return r.rows.map((row) => ({ ...row })) as unknown as T[];
}
export async function one<T = Row>(c: Executor, sql: string, args: InValue[] = []): Promise<T | null> {
  return (await all<T>(c, sql, args))[0] ?? null;
}
export async function run(c: Executor, sql: string, args: InValue[] = []) {
  return c.execute({ sql, args });
}

/** Run `fn` in one write transaction: all of it happens, or none of it. */
export async function withTx<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
  await ensureSchema();
  const t = await db().transaction("write");
  try {
    const v = await fn(t);
    await t.commit();
    return v;
  } catch (e) {
    await t.rollback().catch(() => {});
    throw e;
  } finally {
    t.close();
  }
}

export async function read<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await ensureSchema();
  return fn(db());
}
