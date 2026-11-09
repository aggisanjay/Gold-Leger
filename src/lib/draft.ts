"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** A half-filled form survives a power cut or a refresh: saved to the tablet as you type, cleared on save. */
export function useDraft<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, () => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem(`gl-draft:${key}`); if (raw) { setValue({ ...initial, ...JSON.parse(raw) }); setRestored(true); } } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((v: T | ((p: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { try { localStorage.setItem(`gl-draft:${key}`, JSON.stringify(next)); } catch { /* full */ } }, 350);
      return next;
    });
  }, [key]);
  const clear = useCallback(() => { try { localStorage.removeItem(`gl-draft:${key}`); } catch { /* ignore */ } setRestored(false); }, [key]);
  return [value, set, clear, restored];
}
