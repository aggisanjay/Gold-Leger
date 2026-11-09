"use client";
import { useCallback, useEffect, useState } from "react";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { flushOutbox, outboxList, outboxRemove, type OutboxItem } from "@/lib/offline";

/** Tells the clerk, plainly, what is saved on this tablet and what still needs attention. */
export function OutboxBanner() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [online, setOnline] = useState(true);
  const refresh = useCallback(async () => setItems(await outboxList()), []);
  useEffect(() => {
    setOnline(navigator.onLine);
    refresh(); flushOutbox().then(refresh);
    const on = () => { setOnline(true); flushOutbox().then(refresh); };
    const off = () => setOnline(false);
    const change = () => refresh();
    window.addEventListener("online", on); window.addEventListener("offline", off); window.addEventListener("gl-outbox", change);
    const t = setInterval(() => flushOutbox().then(refresh), 20000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("gl-outbox", change); clearInterval(t); };
  }, [refresh]);

  const waiting = items.filter((i) => !i.error), failed = items.filter((i) => i.error);
  if (online && !items.length) return null;
  return (
    <div className="no-print sticky top-[57px] z-20 border-b border-line bg-gold-soft/70 backdrop-blur" role="status">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13.5px] sm:px-6">
        {!online && <span className="flex items-center gap-2 font-medium"><WifiOff className="h-4 w-4" />Offline. Keep working.</span>}
        {waiting.length > 0 && <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />{waiting.length} {waiting.length === 1 ? "entry is" : "entries are"} saved on this tablet and will be recorded when the network returns.</span>}
        {failed.map((f) => (
          <span key={f.id} className="flex items-center gap-2 text-bad"><AlertTriangle className="h-4 w-4" /><b>{f.label}:</b> {f.error}<button className="underline" onClick={() => outboxRemove(f.id)}>Discard</button></span>
        ))}
      </div>
    </div>
  );
}
