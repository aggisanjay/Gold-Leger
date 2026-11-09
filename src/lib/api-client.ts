export async function callApi(url: string, method: string, body?: unknown): Promise<{ ok: true; data: any } | { ok: false; message: string; fields?: Record<string, string> }> {
  try {
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, data: d } : { ok: false, message: d?.error?.message ?? "That could not be saved.", fields: d?.error?.fields };
  } catch { return { ok: false, message: "No connection. Check the network and try again." }; }
}
