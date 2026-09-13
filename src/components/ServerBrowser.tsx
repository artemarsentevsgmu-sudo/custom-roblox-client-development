"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/Icons";
import { Avatar, Skeleton, Tabs } from "@/components/ui";
import { useSession } from "@/components/SessionProvider";
import { api, compact, fetcher, pingClass, regionFlag } from "@/lib/client";
import { launchGame, toast } from "@/lib/toast";

type Server = {
  id: string;
  maxPlayers: number;
  playing: number;
  playerTokens: string[];
  fps: number;
  ping: number;
};

type Payload = {
  servers: Server[];
  avatars: Record<string, string>;
  nextPageCursor: string | null;
  authenticated: boolean;
};

type HostInfo = {
  ok: boolean;
  address?: string;
  port?: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  datacenter?: string;
  message?: string;
  loading?: boolean;
};

type SortKey = "ping" | "players-desc" | "players-asc" | "free" | "fps";

export function ServerBrowser({
  placeId,
  gameName,
  universeId,
}: {
  placeId: number;
  gameName: string;
  universeId?: number;
}) {
  const { me, openLogin } = useSession();
  const [type, setType] = useState<"Public" | "Friend" | "Private">("Public");
  const [sort, setSort] = useState<SortKey>("ping");
  const [hideFull, setHideFull] = useState(false);
  const [auto, setAuto] = useState(true);
  const [query, setQuery] = useState("");
  const [hosts, setHosts] = useState<Record<string, HostInfo>>({});

  const key = `/api/servers?placeId=${placeId}&type=${type}`;
  const { data, isLoading, mutate, isValidating } = useSWR<Payload>(key, fetcher, {
    refreshInterval: auto ? 25_000 : 0,
    keepPreviousData: true,
  });

  const servers = useMemo(() => {
    let list = [...(data?.servers ?? [])];
    if (hideFull) list = list.filter((s) => s.playing < s.maxPlayers);
    if (query.trim()) list = list.filter((s) => s.id.includes(query.trim().toLowerCase()));
    list.sort((a, b) => {
      switch (sort) {
        case "players-desc":
          return b.playing - a.playing;
        case "players-asc":
          return a.playing - b.playing;
        case "free":
          return b.maxPlayers - b.playing - (a.maxPlayers - a.playing);
        case "fps":
          return b.fps - a.fps;
        default:
          return a.ping - b.ping;
      }
    });
    return list;
  }, [data, hideFull, query, sort]);

  const summary = useMemo(() => {
    const list = data?.servers ?? [];
    if (!list.length) return null;
    const players = list.reduce((acc, s) => acc + s.playing, 0);
    const slots = list.reduce((acc, s) => acc + s.maxPlayers, 0);
    const avgPing = Math.round(list.reduce((acc, s) => acc + s.ping, 0) / list.length);
    const avgFps = Math.round(list.reduce((acc, s) => acc + s.fps, 0) / list.length);
    return { count: list.length, players, slots, avgPing, avgFps };
  }, [data]);

  async function resolveHost(serverId: string) {
    if (!me?.authenticated) {
      openLogin();
      return;
    }
    setHosts((h) => ({ ...h, [serverId]: { ok: false, loading: true } }));
    try {
      const info = await api<HostInfo>("/api/servers/host", {
        method: "POST",
        body: JSON.stringify({ placeId, gameId: serverId }),
      });
      setHosts((h) => ({ ...h, [serverId]: info }));
      if (!info.ok) toast(info.message ?? "Хост не определён", "err");
    } catch (err) {
      setHosts((h) => ({ ...h, [serverId]: { ok: false, message: (err as Error).message } }));
      toast((err as Error).message, "err");
    }
  }

  async function saveServer(s: Server) {
    if (!me?.authenticated) return openLogin();
    const host = hosts[s.id];
    try {
      await api("/api/library", {
        method: "POST",
        body: JSON.stringify({
          action: "saveServer",
          placeId,
          gameName,
          serverId: s.id,
          playing: s.playing,
          maxPlayers: s.maxPlayers,
          region: host?.ok ? `${host.city ?? ""} ${host.country ?? ""}`.trim() : null,
          host: host?.address ?? null,
        }),
      });
      toast("Сервер сохранён в закладки", "ok");
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  function bestServer() {
    const candidates = servers.filter((s) => s.playing < s.maxPlayers);
    if (!candidates.length) return toast("Нет свободных серверов", "err");
    const best = [...candidates].sort((a, b) => a.ping - b.ping || b.fps - a.fps)[0];
    toast(`Выбран сервер с пингом ${Math.round(best.ping)} мс`, "ok");
    void launchGame({ placeId, gameId: best.id, universeId, name: gameName });
  }

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            tabs={[
              { id: "Public" as const, label: "Публичные" },
              { id: "Friend" as const, label: "Сервера друзей" },
              { id: "Private" as const, label: "Приватные (VIP)" },
            ]}
            value={type}
            onChange={setType}
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ID сервера…"
              className="input h-9 w-40 py-1.5 text-xs"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="input h-9 w-auto py-1.5 text-xs"
            >
              <option value="ping">Сначала низкий пинг</option>
              <option value="players-desc">Больше игроков</option>
              <option value="players-asc">Меньше игроков</option>
              <option value="free">Больше свободных мест</option>
              <option value="fps">Выше FPS сервера</option>
            </select>
            <button
              className={`chip ${hideFull ? "chip-active" : ""}`}
              onClick={() => setHideFull((v) => !v)}
            >
              Скрыть полные
            </button>
            <button className={`chip ${auto ? "chip-active" : ""}`} onClick={() => setAuto((v) => !v)}>
              <Icon name="refresh" className="h-3.5 w-3.5" /> Авто 25с
            </button>
            <button className="btn h-9 px-3 text-xs" onClick={() => void mutate()}>
              {isValidating ? "Обновляем…" : "Обновить"}
            </button>
            <button className="btn btn-play h-9 px-3 text-xs" onClick={bestServer}>
              <Icon name="bolt" className="h-4 w-4" /> Лучший сервер
            </button>
          </div>
        </div>

        {summary ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Серверов", value: summary.count, accent: "#8b7bff" },
              { label: "Игроков", value: compact(summary.players), accent: "#3ddc84" },
              { label: "Свободно мест", value: compact(summary.slots - summary.players), accent: "#2ee6c7" },
              { label: "Средний пинг", value: `${summary.avgPing} мс`, accent: "#ffb020" },
              { label: "Средний FPS", value: summary.avgFps, accent: "#ff5c8a" },
            ].map((s) => (
              <div key={s.label} className="panel-soft px-3 py-2">
                <div className="text-[10px] font-bold uppercase" style={{ color: s.accent }}>
                  {s.label}
                </div>
                <div className="text-lg font-extrabold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {isLoading && !data ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : null}

      {!isLoading && !servers.length ? (
        <div className="panel px-6 py-12 text-center">
          <div className="text-3xl">🛰️</div>
          <div className="mt-2 font-semibold text-white">Серверы не найдены</div>
          <p className="muted mx-auto mt-1 max-w-md text-sm">
            {type === "Friend"
              ? "Никто из друзей сейчас не играет в эту игру."
              : "Список пуст — возможно, игра приватная или все серверы скрыты разработчиком."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {servers.map((s, idx) => {
          const host = hosts[s.id];
          const fill = Math.round((s.playing / Math.max(1, s.maxPlayers)) * 100);
          return (
            <div key={s.id} className="panel hoverable flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="chip !px-2 !py-0.5 text-[10px]">#{idx + 1}</span>
                    <span className="font-mono text-xs text-white/70">{s.id.slice(0, 8)}…</span>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(s.id);
                        toast("ID сервера скопирован");
                      }}
                      className="muted text-[11px] hover:text-white"
                    >
                      копировать
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className={pingClass(s.ping)}>
                      <Icon name="signal" className="mr-1 inline h-3.5 w-3.5" />
                      {Math.round(s.ping)} мс
                    </span>
                    <span className="muted">{Math.round(s.fps)} FPS</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-white">
                    {s.playing}
                    <span className="muted text-xs">/{s.maxPlayers}</span>
                  </div>
                  <div className="muted text-[10px]">игроков</div>
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${fill}%`,
                    background:
                      fill > 90
                        ? "linear-gradient(90deg,#ff5c8a,#ff9f5c)"
                        : "linear-gradient(90deg,#7c5cff,#2ee6c7)",
                  }}
                />
              </div>

              <div className="flex -space-x-2">
                {s.playerTokens.slice(0, 9).map((t) => (
                  <Avatar key={t} src={data?.avatars?.[t]} alt="P" size={26} ring="#0b0e1b" />
                ))}
                {s.playerTokens.length > 9 ? (
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">
                    +{s.playerTokens.length - 9}
                  </span>
                ) : null}
                {!s.playerTokens.length ? (
                  <span className="muted text-[11px]">аватары скрыты</span>
                ) : null}
              </div>

              <div className="panel-soft px-3 py-2 text-xs">
                {host?.loading ? (
                  <span className="muted">Определяем хост…</span>
                ) : host?.ok ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <span className="text-base">{regionFlag(host.countryCode)}</span>
                      {host.city ? `${host.city}, ` : ""}
                      {host.country ?? "Неизвестно"}
                    </div>
                    <div className="muted font-mono text-[11px]">
                      {host.address}
                      {host.port ? `:${host.port}` : ""}
                    </div>
                    <div className="muted truncate text-[11px]">{host.datacenter ?? host.isp}</div>
                  </div>
                ) : host?.message ? (
                  <span className="text-rose-300">{host.message}</span>
                ) : (
                  <button
                    onClick={() => void resolveHost(s.id)}
                    className="flex items-center gap-1.5 font-semibold text-violet-300 hover:text-violet-200"
                  >
                    <Icon name="globe" className="h-4 w-4" /> Узнать хост, регион и дата-центр
                  </button>
                )}
              </div>

              <div className="mt-auto flex gap-2">
                <button
                  className="btn btn-play flex-1 py-1.5 text-xs"
                  onClick={() =>
                    void launchGame({ placeId, gameId: s.id, universeId, name: gameName })
                  }
                >
                  <Icon name="play" className="h-3.5 w-3.5" filled /> Присоединиться
                </button>
                <button className="btn px-3 py-1.5 text-xs" onClick={() => void saveServer(s)}>
                  <Icon name="pin" className="h-3.5 w-3.5" />
                </button>
                <button
                  className="btn px-3 py-1.5 text-xs"
                  title="Ссылка для друзей"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `https://www.roblox.com/games/${placeId}?gameInstanceId=${s.id}`,
                    );
                    toast("Ссылка на сервер скопирована");
                  }}
                >
                  🔗
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
