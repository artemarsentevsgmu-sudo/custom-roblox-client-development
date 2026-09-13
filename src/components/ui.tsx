"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="muted mt-0.5 text-sm">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  accent = "#7c5cff",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="panel hoverable relative overflow-hidden p-4">
      <div
        className="absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: accent }}>
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-white">{value}</div>
      {hint ? <div className="muted mt-1 text-xs">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  emoji = "✨",
  action,
}: {
  title: string;
  hint?: string;
  emoji?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="text-4xl">{emoji}</div>
      <div className="text-base font-semibold text-white">{title}</div>
      {hint ? <div className="muted max-w-md text-sm">{hint}</div> : null}
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className={`panel pop relative z-10 w-full ${width} overflow-hidden`}>{children}</div>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number | null }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="rail flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`chip whitespace-nowrap ${value === t.id ? "chip-active" : ""}`}
        >
          {t.label}
          {typeof t.count === "number" ? (
            <span className="rounded-full bg-black/25 px-1.5 text-[10px]">{t.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Robux({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M5.5 3.2 17 .1c.8-.2 1.6.3 1.8 1.1l3.1 11.5c.2.8-.3 1.6-1.1 1.8L9.3 17.6c-.8.2-1.6-.3-1.8-1.1L4.4 5c-.2-.8.3-1.6 1.1-1.8Zm4.7 5.1 1.2 4.4 4.4-1.2-1.2-4.4-4.4 1.2Z" />
    </svg>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Avatar({
  src,
  alt,
  size = 40,
  ring,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  ring?: string;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-white/5"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
          {alt.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
