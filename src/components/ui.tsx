"use client";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger"; size?: "md" | "lg"; busy?: boolean };
export function Button({ variant = "primary", size = "md", busy, className, children, disabled, ...p }: BtnProps) {
  const v = {
    primary: "bg-ink text-white hover:bg-ink-2 disabled:bg-line-strong disabled:text-mute",
    secondary: "border border-line-strong bg-paper text-ink hover:bg-sunk disabled:text-mute",
    quiet: "text-ink-2 hover:bg-sunk",
    danger: "border border-line-strong text-bad hover:bg-bad-soft",
  }[variant];
  return (
    <button
      {...p} disabled={disabled || busy}
      className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors active:translate-y-px disabled:cursor-not-allowed", size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-sm", v, className)}
    >
      {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">{label}</label>
      {children}
      {error ? <p role="alert" className="text-[13px] text-bad">{error}</p> : hint ? <p className="text-[13px] text-mute">{hint}</p> : null}
    </div>
  );
}

const control = "w-full rounded-lg border bg-paper px-3.5 text-[15px] text-ink placeholder:text-mute/70 focus:border-gold-line focus:outline-none focus:ring-2 focus:ring-gold-line/25 disabled:bg-sunk disabled:text-mute";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; figure?: boolean }>(function Input({ invalid, figure, className, ...p }, ref) {
  return <input ref={ref} {...p} className={cn(control, "h-12", figure && "fig text-right text-lg", invalid ? "border-bad" : "border-line-strong", className)} />;
});
export function Select({ invalid, className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select {...p} className={cn(control, "h-12 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", invalid ? "border-bad" : "border-line-strong", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23646c79' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")" }}>{children}</select>;
}
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(control, "min-h-20 py-2.5", "border-line-strong", className)} />;
}

const pill: Record<string, string> = {
  neutral: "bg-sunk text-ink-2", review: "bg-review-soft text-review", watch: "bg-gold-soft text-gold", ok: "bg-ok-soft text-ok", bad: "bg-bad-soft text-bad",
};
export function Pill({ tone = "neutral", children, className }: { tone?: keyof typeof pill; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12.5px] font-medium", pill[tone], className)}>{children}</span>;
}

export function Notice({ tone = "neutral", title, children, className }: { tone?: "neutral" | "review" | "bad" | "ok" | "watch"; title?: string; children?: ReactNode; className?: string }) {
  const t = { neutral: "bg-sunk border-line", review: "bg-review-soft border-review/20", bad: "bg-bad-soft border-bad/25", ok: "bg-ok-soft border-ok/20", watch: "bg-gold-soft border-gold-line/40" }[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-[14px]", t, className)}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={cn(title && "mt-0.5", "text-ink-2")}>{children}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight sm:text-[32px]">{title}</h1>
        {sub && <p className="mt-1 text-[15px] text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-[14px] text-mute">{children}</p>}
    </div>
  );
}

export function Section({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mb-10", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
        <h2 className="text-[17px]">{title}</h2>
        {aside && <div className="text-[13px] text-mute">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
