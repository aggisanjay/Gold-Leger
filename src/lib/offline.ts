/**
 * Shared tablets lose power and network. Entries are therefore never lost or doubled:
 *  - every entry carries an idempotency key generated when the form opens,
 *  - if the network is down the entry is parked in IndexedDB on the tablet and retried,
 *  - the server answers a retried key with the original result, so a retry can never post twice.
 */
const DB = "gl-outbox", STORE = "entries";
export interface OutboxItem { id: string; url: string; body: unknown; label: string; createdAt: number; error?: string }
export type SendResult = { ok: true; data: any } | { ok: false; queued: true } | { ok: false; queued?: false; message: string; fields?: Record<string, string>; code?: string };

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const tx = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise((res, rej) => { const q = f(db.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
};
const notify = () => window.dispatchEvent(new Event("gl-outbox"));

export const outboxList = (): Promise<OutboxItem[]> => tx("readonly", (s) => s.getAll()).then((x) => x.sort((a, b) => a.createdAt - b.createdAt)).catch(() => []);
export async function outboxPut(item: OutboxItem) { await tx("readwrite", (s) => s.put(item)); notify(); }
export async function outboxRemove(id: string) { await tx("readwrite", (s) => s.delete(id)); notify(); }

/** Send an entry. Network trouble parks it for later; a clear refusal from the server is returned to the clerk to fix. */
export async function sendEntry(url: string, body: { idempotencyKey: string } & Record<string, unknown>, label: string): Promise<SendResult> {
  const park = async (): Promise<SendResult> => { await outboxPut({ id: body.idempotencyKey, url, body, label, createdAt: Date.now() }); return { ok: false, queued: true }; };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return park();
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data };
    if (res.status >= 500 || res.status === 408 || res.status === 429) return park();
    if (res.status === 401) return { ok: false, message: "You were signed out. Sign in again; your entry is still on this screen." };
    return { ok: false, message: data?.error?.message ?? "That could not be saved.", fields: data?.error?.fields, code: data?.error?.code };
  } catch {
    return park();
  }
}

let flushing = false;
/** Try to send everything waiting. Entries the server refuses are kept, marked, for the clerk to look at. */
export async function flushOutbox(): Promise<void> {
  if (flushing || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
  flushing = true;
  try {
    for (const item of await outboxList()) {
      if (item.error) continue;
      try {
        const res = await fetch(item.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item.body), signal: AbortSignal.timeout(20000) });
        if (res.ok) await outboxRemove(item.id);
        else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          const d = await res.json().catch(() => ({}));
          await outboxPut({ ...item, error: res.status === 401 ? "Sign in again to send this entry." : d?.error?.message ?? "The server did not accept this entry." });
        } else break;
      } catch { break; }
    }
  } finally { flushing = false; }
}
