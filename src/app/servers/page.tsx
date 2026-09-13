"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/Icons";
import { ServerBrowser } from "@/components/ServerBrowser";
import { useSession } from "@/components/SessionProvider";
import { Avatar, SectionHeader } from "@/components/ui";
import { api, fetcher } from "@/lib/client";
import { toast } from "@/lib/toast";

type Library = {
  authenticated: boolean;
  servers: {
    id: number;
    placeId: number;
    gameName: string;
    serverId: string;
    region: string | null;
    host: string | null;
    playing: number | null;
    maxPlayers: number | null;
  }[];
  history: { placeId: number; name: string; thumbUrl: string | null }[];
};

function parsePlaceId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const m = /games\/(\d+)/.exec(trimmed);
  if (m) return Number(m[1]);
  return null;
}

export default function ServersPage() {
  const { me } = useSession();
  const [input, setInput] = useState("");
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [gameName, setGameName] = useState("Experience");
  const { data, mutate } = useSWR<Library>(me?.authenticated ? "/api/library" : null, fetcher);

  async function load(id: number, name?: string) {
    setPlaceId(id);
    setGameName(name ?? `Place ${id}`);
    if (!name) {
      try {
        const res = await api<{ detail?: { name?: string } }>(`/api/game?placeId=${id}`);
        if (res.detail?.name) setGameName(res.detail.name);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <SectionHeader
          title="Браузер серверов"
          subtitle="Определяйте хост, регион, дата-центр, пинг и заполненность любого сервера Roblox"
        />
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const id = parsePlaceId(input);
            if (!id) return toast("Введите Place ID или ссылку roblox.com/games/…", "err");
            void load(id);
          }}
        >
          <input
            className="input flex-1"
            placeholder="Place ID или ссылка: https://www.roblox.com/games/2753915549/Blox-Fruits"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            <Icon name="server" className="h-4 w-4" /> Показать серверы
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 2753915549, name: "Blox Fruits" },
            { id: 920587237, name: "Adopt Me!" },
            { id: 6516141723, name: "Doors" },
            { id: 8737602449, name: "Pet Simulator 99" },
            { id: 606849621, name: "Jailbreak" },
            { id: 142823291, name: "Murder Mystery 2" },
          ].map((g) => (
            <button key={g.id} className="chip" onClick={() => void load(g.id, g.name)}>
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {data?.history?.length ? (
        <div className="panel p-4">
          <h3 className="section-title mb-3 text-base">Недавно запускали</h3>
          <div className="rail flex gap-2 overflow-x-auto pb-1">
            {data.history.map((h) => (
              <button
                key={h.placeId}
                className="panel-soft flex shrink-0 items-center gap-2 px-3 py-2 text-xs hover:border-violet-400/50"
                onClick={() => void load(h.placeId, h.name)}
              >
                <Avatar src={h.thumbUrl} alt={h.name} size={26} />
                <span className="max-w-[140px] truncate font-semibold text-white">{h.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {data?.servers?.length ? (
        <div className="panel p-4">
          <h3 className="section-title mb-3 text-base">Сохранённые серверы</h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {data.servers.map((s) => (
              <div key={s.id} className="panel-soft flex items-center gap-3 px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/game/${s.placeId}`}
                    className="block truncate font-bold text-white hover:text-violet-300"
                  >
                    {s.gameName}
                  </Link>
                  <div className="muted font-mono">{s.serverId.slice(0, 14)}…</div>
                  <div className="muted">
                    {s.region ?? "регион не определён"}
                    {s.playing ? ` · ${s.playing}/${s.maxPlayers}` : ""}
                  </div>
                </div>
                <button
                  className="btn px-2 py-1 text-[11px]"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `https://www.roblox.com/games/${s.placeId}?gameInstanceId=${s.serverId}`,
                    );
                    toast("Ссылка скопирована");
                  }}
                >
                  🔗
                </button>
                <button
                  className="btn px-2 py-1 text-[11px] text-rose-300"
                  onClick={async () => {
                    await api("/api/library", {
                      method: "POST",
                      body: JSON.stringify({ action: "removeServer", id: s.id }),
                    });
                    void mutate();
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {placeId ? (
        <div className="space-y-3">
          <h2 className="section-title">
            {gameName} <span className="muted text-sm font-normal">· place {placeId}</span>
          </h2>
          <ServerBrowser placeId={placeId} gameName={gameName} />
        </div>
      ) : (
        <div className="panel px-6 py-14 text-center">
          <div className="text-4xl">🛰️</div>
          <div className="mt-2 font-semibold text-white">Выберите игру</div>
          <p className="muted mx-auto mt-1 max-w-lg text-sm">
            Nova покажет все публичные серверы: пинг, FPS, заполненность, аватары игроков, а для
            авторизованных — реальный IP-адрес машины, дата-центр и страну хостинга.
          </p>
        </div>
      )}
    </div>
  );
}
