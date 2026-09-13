"use client";

export function toast(message: string, kind: "ok" | "err" | "info" = "ok") {
  if (typeof document === "undefined") return;
  let host = document.getElementById("nova-toasts");
  if (!host) {
    host = document.createElement("div");
    host.id = "nova-toasts";
    host.style.cssText =
      "position:fixed;z-index:200;bottom:88px;right:18px;display:flex;flex-direction:column;gap:10px;pointer-events:none";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  const accent =
    kind === "ok" ? "#3ddc84" : kind === "err" ? "#ff5c8a" : "#8b7bff";
  el.style.cssText = `pointer-events:auto;max-width:340px;padding:12px 16px;border-radius:16px;font-size:13px;font-weight:600;color:#eef0ff;background:rgba(12,14,26,.92);border:1px solid ${accent}55;box-shadow:0 18px 40px -20px ${accent};backdrop-filter:blur(14px);transform:translateY(12px);opacity:0;transition:all .28s cubic-bezier(.2,.8,.2,1)`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = "none";
    el.style.opacity = "1";
  });
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    setTimeout(() => el.remove(), 300);
  }, 3600);
}

export async function launchGame(params: {
  placeId: number;
  gameId?: string | null;
  universeId?: number | null;
  name?: string;
  thumbUrl?: string | null;
}) {
  try {
    const res = await fetch("/api/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as {
      deepLink?: string;
      ticketIssued?: boolean;
      error?: string;
    };
    if (!data.deepLink) throw new Error(data.error ?? "Не удалось собрать ссылку запуска");
    toast(
      data.ticketIssued
        ? "Запускаем Roblox Player с авторизацией…"
        : "Открываем Roblox (без тикета — войдите для прямого запуска)",
      data.ticketIssued ? "ok" : "info",
    );
    window.location.href = data.deepLink;
  } catch (err) {
    toast((err as Error).message, "err");
  }
}
