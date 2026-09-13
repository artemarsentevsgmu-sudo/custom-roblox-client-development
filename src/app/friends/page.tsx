"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/Icons";
import { useSession } from "@/components/SessionProvider";
import { Avatar, EmptyState, SectionHeader, Skeleton, Tabs } from "@/components/ui";
import { fetcher, presenceOf, rbxPost, timeAgo } from "@/lib/client";
import { launchGame, toast } from "@/lib/toast";

type Friend = {
  id: number;
  name: string;
  displayName: string;
  avatar: string | null;
  hasVerifiedBadge?: boolean;
  presence: {
    userPresenceType: number;
    lastLocation?: string;
    rootPlaceId?: number | null;
    gameId?: string | null;
    lastOnline?: string;
  } | null;
};

type Payload = {
  authenticated: boolean;
  friends: Friend[];
  requests: { id: number; name: string; displayName: string; avatar: string | null }[];
  online: number;
  inGame: number;
};

export default function FriendsPage() {
  const { me, openLogin } = useSession();
  const [tab, setTab] = useState<"all" | "online" | "ingame" | "requests">("online");
  const [q, setQ] = useState("");
  const { data, isLoading, mutate } = useSWR<Payload>(
    me?.authenticated ? "/api/friends" : null,
    fetcher,
    { refreshInterval: 40_000 },
  );

  const list = useMemo(() => {
    let arr = data?.friends ?? [];
    if (tab === "online") arr = arr.filter((f) => (f.presence?.userPresenceType ?? 0) > 0);
    if (tab === "ingame") arr = arr.filter((f) => f.presence?.userPresenceType === 2);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter(
        (f) =>
          f.name.toLowerCase().includes(needle) || f.displayName.toLowerCase().includes(needle),
      );
    }
    return arr;
  }, [data, tab, q]);

  async function respond(userId: number, accept: boolean) {
    try {
      await rbxPost(
        `friends.roblox.com/v1/users/${userId}/${accept ? "accept-friend-request" : "decline-friend-request"}`,
        {},
      );
      toast(accept ? "Заявка принята" : "Заявка отклонена");
      void mutate();
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  if (!me?.authenticated) {
    return (
      <EmptyState
        emoji="👥"
        title="Войдите, чтобы увидеть друзей"
        hint="Nova покажет, кто сейчас онлайн, в какой игре и позволит присоединиться в один клик."
        action={
          <button className="btn btn-primary mt-3" onClick={openLogin}>
            Войти
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <SectionHeader
          title="Друзья"
          subtitle={`${data?.online ?? 0} в сети · ${data?.inGame ?? 0} в игре · всего ${data?.friends.length ?? 0}`}
          action={
            <input
              className="input h-9 w-48 py-1.5 text-xs"
              placeholder="Поиск по нику…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          }
        />
        <Tabs
          tabs={[
            { id: "online" as const, label: "В сети", count: data?.online ?? null },
            { id: "ingame" as const, label: "В игре", count: data?.inGame ?? null },
            { id: "all" as const, label: "Все", count: data?.friends.length ?? null },
            { id: "requests" as const, label: "Заявки", count: data?.requests.length ?? null },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.requests ?? []).map((r) => (
            <div key={r.id} className="panel flex items-center gap-3 p-4">
              <Avatar src={r.avatar} alt={r.name} size={46} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{r.displayName}</div>
                <div className="muted text-xs">@{r.name}</div>
              </div>
              <button className="btn btn-play px-3 py-1.5 text-xs" onClick={() => void respond(r.id, true)}>
                ✓
              </button>
              <button className="btn px-3 py-1.5 text-xs" onClick={() => void respond(r.id, false)}>
                ✕
              </button>
            </div>
          ))}
          {!data?.requests.length ? (
            <p className="muted col-span-full py-8 text-center text-sm">Новых заявок нет</p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((f) => {
            const p = presenceOf(f.presence?.userPresenceType);
            return (
              <div key={f.id} className="panel hoverable p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar src={f.avatar} alt={f.name} size={52} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0b0e1b] ${p.glow ? "pulse-dot" : ""}`}
                      style={{ background: p.color }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/users/${f.id}`}
                      className="block truncate text-sm font-bold text-white hover:text-violet-300"
                    >
                      {f.displayName} {f.hasVerifiedBadge ? "☑️" : ""}
                    </Link>
                    <div className="muted truncate text-xs">@{f.name}</div>
                    <div className="mt-0.5 truncate text-[11px]" style={{ color: p.color }}>
                      {f.presence?.lastLocation || p.label}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {f.presence?.userPresenceType === 2 && f.presence.rootPlaceId ? (
                    <>
                      <button
                        className="btn btn-play flex-1 py-1.5 text-xs"
                        onClick={() =>
                          void launchGame({
                            placeId: f.presence!.rootPlaceId!,
                            gameId: f.presence!.gameId ?? null,
                            name: f.presence!.lastLocation ?? "Experience",
                          })
                        }
                      >
                        <Icon name="play" className="h-3.5 w-3.5" filled /> Присоединиться
                      </button>
                      <Link
                        href={`/game/${f.presence.rootPlaceId}`}
                        className="btn px-3 py-1.5 text-xs"
                      >
                        <Icon name="server" className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  ) : (
                    <div className="muted w-full text-[11px]">
                      {f.presence?.lastOnline ? `был(а) ${timeAgo(f.presence.lastOnline)}` : p.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!list.length && !isLoading ? (
            <p className="muted col-span-full py-10 text-center text-sm">Пусто</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
