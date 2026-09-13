"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/Icons";
import { useSession } from "@/components/SessionProvider";
import { Avatar, SectionHeader } from "@/components/ui";
import { api, dateLabel, fetcher, full } from "@/lib/client";
import { toast } from "@/lib/toast";

type Health = { ok: boolean };

export default function SettingsPage() {
  const { me, openLogin, logout, refresh } = useSession();
  const { data: health } = useSWR<Health>("/api/health", fetcher, { refreshInterval: 60_000 });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [checking, setChecking] = useState(false);
  const [apiPing, setApiPing] = useState<number | null>(null);

  useEffect(() => {
    setAutoRefresh(localStorage.getItem("nova.autoRefresh") !== "0");
    setReduceMotion(localStorage.getItem("nova.reduceMotion") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--nova-motion",
      reduceMotion ? "none" : "running",
    );
    if (reduceMotion) document.body.classList.add("motion-reduce");
    else document.body.classList.remove("motion-reduce");
  }, [reduceMotion]);

  async function pingRoblox() {
    setChecking(true);
    const started = performance.now();
    try {
      await api("/api/rbx?p=" + encodeURIComponent("users.roblox.com/v1/users/1"));
      setApiPing(Math.round(performance.now() - started));
      toast("Roblox API отвечает", "ok");
    } catch (err) {
      setApiPing(null);
      toast((err as Error).message, "err");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="panel p-6">
        <SectionHeader title="Аккаунт" subtitle="Активная сессия Nova" />
        {me?.authenticated ? (
          <div className="flex flex-wrap items-center gap-4">
            <Avatar src={me.user?.avatarUrl} alt={me.user?.name ?? ""} size={72} />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-white">
                {me.user?.displayName} {me.user?.hasVerifiedBadge ? "☑️" : ""}
              </div>
              <div className="muted text-sm">
                @{me.user?.name} · ID {me.user?.id}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="chip">
                  Вход: {me.user?.loginMethod === "cookie" ? "по cookie" : "логин + пароль"}
                </span>
                <span className="chip">Регистрация: {dateLabel(me.user?.created)}</span>
                {me.user?.isPremium ? (
                  <span className="chip border-amber-300/30 bg-amber-400/15 text-amber-200">
                    Premium
                  </span>
                ) : null}
                <span className="chip">Robux: {full(me.stats?.robux ?? null)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={refresh}>
                <Icon name="refresh" className="h-4 w-4" /> Обновить
              </button>
              <button
                className="btn border-rose-400/40 text-rose-300"
                onClick={async () => {
                  await logout();
                  toast("Сессия завершена, cookie удалён с сервера");
                }}
              >
                <Icon name="logout" className="h-4 w-4" /> Выйти
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="muted text-sm">
              Вы не авторизованы. Войдите по логину и паролю (поддерживается 2FA) или по cookie
              .ROBLOSECURITY.
            </p>
            <button className="btn btn-primary" onClick={openLogin}>
              Войти в аккаунт
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-6">
          <SectionHeader title="Интерфейс лаунчера" subtitle="Настройки сохраняются в браузере" />
          <div className="space-y-3">
            {[
              {
                label: "Автообновление списка серверов",
                hint: "Обновлять серверы каждые 25 секунд",
                value: autoRefresh,
                set: (v: boolean) => {
                  setAutoRefresh(v);
                  localStorage.setItem("nova.autoRefresh", v ? "1" : "0");
                },
              },
              {
                label: "Уменьшить анимацию",
                hint: "Отключить фоновые градиенты и переходы",
                value: reduceMotion,
                set: (v: boolean) => {
                  setReduceMotion(v);
                  localStorage.setItem("nova.reduceMotion", v ? "1" : "0");
                },
              },
            ].map((row) => (
              <div
                key={row.label}
                className="panel-soft flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{row.label}</div>
                  <div className="muted text-[11px]">{row.hint}</div>
                </div>
                <button
                  onClick={() => row.set(!row.value)}
                  className={`relative h-6 w-11 rounded-full transition ${row.value ? "bg-violet-500" : "bg-white/15"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${row.value ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </div>
            ))}
            <button
              className="btn w-full"
              onClick={async () => {
                await api("/api/library", {
                  method: "POST",
                  body: JSON.stringify({ action: "clearHistory" }),
                });
                toast("История запусков очищена");
              }}
            >
              Очистить историю запусков
            </button>
          </div>
        </div>

        <div className="panel p-6">
          <SectionHeader title="Состояние системы" subtitle="Диагностика Nova и Roblox API" />
          <div className="space-y-2 text-sm">
            <div className="panel-soft flex items-center justify-between px-4 py-3">
              <span>База данных Nova</span>
              <span className={health?.ok ? "text-emerald-300" : "text-rose-300"}>
                {health?.ok ? "● работает" : "● недоступна"}
              </span>
            </div>
            <div className="panel-soft flex items-center justify-between px-4 py-3">
              <span>Roblox API</span>
              <span className="text-emerald-300">
                {apiPing !== null ? `● ${apiPing} мс` : "не проверено"}
              </span>
            </div>
            <button className="btn w-full" disabled={checking} onClick={() => void pingRoblox()}>
              {checking ? "Проверяем…" : "Проверить соединение с Roblox"}
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
            <div className="text-sm font-bold text-white">Безопасность</div>
            <ul className="muted mt-2 space-y-1 text-[12px]">
              <li>• Cookie .ROBLOSECURITY шифруется AES-256-GCM в базе данных</li>
              <li>• Браузер получает только идентификатор сессии (httpOnly)</li>
              <li>• Пароль используется один раз для получения cookie и не хранится</li>
              <li>• Все запросы к Roblox выполняются с сервера, без CORS-прокси</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <SectionHeader title="О Nova Launcher" subtitle="Версия 1.0 · неофициальный клиент Roblox" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Браузер серверов", d: "Пинг, FPS, заполненность, аватары игроков, реальный IP и дата-центр" },
            { t: "Умный запуск", d: "roblox-player:// с тикетом авторизации и выбором лучшего сервера" },
            { t: "Полная статистика", d: "Robux, транзакции, друзья, группы, инвентарь, значки" },
            { t: "История и закладки", d: "Сохранение серверов и недавно запущенных игр в базе" },
          ].map((f) => (
            <div key={f.t} className="panel-soft p-4">
              <div className="text-sm font-bold text-white">{f.t}</div>
              <p className="muted mt-1 text-[11px]">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
