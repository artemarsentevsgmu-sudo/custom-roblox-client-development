"use client";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data as { error?: string; errors?: { message?: string }[] })?.error ??
      (data as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
      `Ошибка ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const fetcher = <T,>(url: string) => api<T>(url);

/** Calls any Roblox endpoint through the signed server proxy. */
export function rbxUrl(path: string, ttlMs?: number) {
  return `/api/rbx?p=${encodeURIComponent(path)}${ttlMs ? `&__ttl=${ttlMs}` : ""}`;
}
export function rbxGet<T>(path: string, ttlMs?: number) {
  return api<T>(rbxUrl(path, ttlMs));
}
export function rbxPost<T>(path: string, body: unknown) {
  return api<T>("/api/rbx", { method: "POST", body: JSON.stringify({ p: path, body }) });
}

export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function full(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("ru-RU");
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн назад`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} мес назад`;
  return `${Math.floor(diff / 31536000)} г назад`;
}

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export const PRESENCE = {
  0: { label: "Не в сети", color: "#6b7394", glow: false },
  1: { label: "В сети", color: "#3ddc84", glow: true },
  2: { label: "В игре", color: "#2ee6c7", glow: true },
  3: { label: "В Studio", color: "#ffb020", glow: true },
  4: { label: "Невидимка", color: "#6b7394", glow: false },
} as const;

export function presenceOf(type: number | undefined | null) {
  return PRESENCE[(type ?? 0) as keyof typeof PRESENCE] ?? PRESENCE[0];
}

export function ratingOf(up?: number | null, down?: number | null): number | null {
  if (!up && !down) return null;
  const u = up ?? 0;
  const d = down ?? 0;
  if (u + d === 0) return null;
  return Math.round((u / (u + d)) * 100);
}

export function pingClass(ping: number): string {
  if (ping <= 60) return "text-emerald-400";
  if (ping <= 140) return "text-amber-300";
  return "text-rose-400";
}

export function regionFlag(code?: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}
