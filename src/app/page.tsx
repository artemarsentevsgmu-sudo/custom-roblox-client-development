"use client";

import Link from "next/link";
import useSWR from "swr";
import { GameCard, GameRail, type GameLike } from "@/components/GameCard";
import { Icon } from "@/components/Icons";
import { useSession } from "@/components/SessionProvider";
import { Avatar, Robux, Skeleton, Stat } from "@/components/ui";
import { compact, fetcher, full, presenceOf, timeAgo } from "@/lib/client";
import { launchGame } from "@/lib/toast";

type Discover = {
  sorts: { sortId: string; sortDisplayName: string; games: GameLike[] }[];
};

type Library = {
  history: { placeId: number; universeId: number | null; name: string; thumbUrl: string | null; playedAt: string }[];
  servers: { id: number; placeId: number; gameName: string; serverId: string; region: string | null }[];
};

type FriendsPayload = {
  friends: {
    id: number;
    name: string;
    displayName: string;
    avatar: string | null;
    presence: { userPresenceType: number; lastLocation?: string; rootPlaceId?: number | null; gameId?: string | null } | null;
  }[];
  online: number;
  inGame: number;
};

function BalanceCard() {
  const { me } = useSession();
  const history = me?.balanceHistory ?? [];
  const max = Math.max(1, ...history.map((h) => h.robux));
  const delta =
    history.length > 1 ? history[history.length - 1].robux - history[0].robux : 0;

  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
        <Robux className="h-4 w-4" /> Баланс Robux
      </div>
      <div className="mt-2 flex items-end gap-3">
        <div className="text-4xl font-black text-white">
          {me?.authenticated ? full(me.stats?.robux ?? null) : "—"}
        </div>
        {delta !== 0 ? (
          <div
            className={`mb-1.5 text-sm font-bold ${delta > 0 ? "text-emerald-400" : "text-rose-400"}`}
          >
            {delta > 0 ? "+" : ""}
            {compact(delta)}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex h-14 items-end gap-1">
        {(history.length ? history : Array.from({ length: 12 }, () => ({ robux: 0 }))).map(
          (h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${Math.max(6, (h.robux / max) * 100)}%`,
                background:
                  i === history.length - 1
                    ? "linear-gradient(180deg,#ffd166,#ffb020)"
                    : "rgba(255,255,255,0.12)",
              }}
            />
          ),
        )}
      </div>
      <div className="muted mt-2 text-[11px]">
        История баланса обновляется автоматически каждые 5 минут
      </div>
    </div>
  );
}

export default function HomePage() {
  const { me, openLogin } = useSession();
  const { data: discover, isLoading } = useSWR<Discover>("/api/discover?perSort=12", fetcher, {
    revalidateOnFocus: false,
  });
  const { data: library } = useSWR<Library>(me?.authenticated ? "/api/library" : null, fetcher);
  const { data: friends } = useSWR<FriendsPayload>(
    me?.authenticated ? "/api/friends" : null,
    fetcher,
    { refreshInterval: 45_000 },
  );

  const hero = discover?.sorts?.[0]?.games?.[0];
  const onlineFriends = (friends?.friends ?? []).filter(
    (f) => (f.presence?.userPresenceType ?? 0) > 0,
  );

  return (
    <div className="space-y-8">
      {/* hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/10">
        <div className="absolute inset-0">
          {hero?.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.banner} alt="" className="h-full w-full object-cover opacity-40" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet-700/50 via-fuchsia-700/30 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#05060d] via-[#05060d]/85 to-transparent" />
        </div>
        <div className="relative grid gap-6 p-6 md:grid-cols-[1.35fr_1fr] md:p-8">
          <div>
            <div className="chip mb-3 border-violet-400/40 bg-violet-500/15 text-violet-200">
              <Icon name="bolt" className="h-3.5 w-3.5" /> NOVA LAUNCHER
            </div>
            {me?.authenticated ? (
              <>
                <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">
                  С возвращением,{" "}
                  <span className="gradient-text">{me.user?.displayName}</span> 👋
                </h1>
                <p className="muted mt-2 max-w-xl text-sm">
                  {presenceOf(me.presence?.userPresenceType).label}
                  {me.presence?.lastLocation ? ` · ${me.presence.lastLocation}` : ""} · аккаунт создан{" "}
                  {timeAgo(me.user?.created)}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/discover" className="btn btn-primary">
                    <Icon name="compass" className="h-4 w-4" /> Найти игру
                  </Link>
                  <Link href="/servers" className="btn">
                    <Icon name="server" className="h-4 w-4" /> Браузер серверов
                  </Link>
                  <Link href="/friends" className="btn">
                    <Icon name="users" className="h-4 w-4" /> Друзья онлайн ·{" "}
                    {friends?.online ?? 0}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">
                  Красивая замена <span className="gradient-text">лаунчеру Roblox</span>
                </h1>
                <p className="muted mt-3 max-w-xl text-sm">
                  Войдите в свой аккаунт — по логину и паролю (с поддержкой 2FA) или по cookie
                  .ROBLOSECURITY. Получите баланс Robux, друзей, группы, инвентарь, историю игр и
                  продвинутый браузер серверов с определением хоста, региона и пинга.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="btn btn-primary" onClick={openLogin}>
                    <Icon name="shield" className="h-4 w-4" /> Войти в аккаунт
                  </button>
                  <Link href="/discover" className="btn">
                    Смотреть каталог без входа
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
            <Stat
              label="Robux"
              value={me?.authenticated ? compact(me.stats?.robux ?? null) : "—"}
              hint="текущий баланс"
              accent="#ffb020"
              icon={<Robux className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Друзья"
              value={me?.authenticated ? full(me.stats?.friends ?? null) : "—"}
              hint={`${friends?.inGame ?? 0} сейчас в игре`}
              accent="#3ddc84"
              icon={<Icon name="users" className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Группы"
              value={me?.authenticated ? full(me.stats?.groups ?? null) : "—"}
              hint="членство"
              accent="#8b7bff"
              icon={<Icon name="flag" className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Подписчики"
              value={me?.authenticated ? compact(me.stats?.followers ?? null) : "—"}
              hint={`${compact(me?.stats?.following ?? null)} подписок`}
              accent="#ff5c8a"
              icon={<Icon name="heart" className="h-3.5 w-3.5" />}
            />
          </div>
        </div>
      </section>

      {me?.authenticated ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {library?.history?.length ? (
              <section>
                <h2 className="section-title mb-3">Продолжить игру</h2>
                <div className="rail flex gap-3 overflow-x-auto pb-2">
                  {library.history.map((h) => (
                    <div key={h.placeId} className="panel hoverable w-[220px] shrink-0 p-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={h.thumbUrl} alt={h.name} size={44} />
                        <div className="min-w-0">
                          <Link
                            href={`/game/${h.placeId}`}
                            className="block truncate text-sm font-bold text-white hover:text-violet-300"
                          >
                            {h.name}
                          </Link>
                          <div className="muted text-[11px]">{timeAgo(h.playedAt)}</div>
                        </div>
                      </div>
                      <button
                        className="btn btn-play mt-3 w-full py-1.5 text-xs"
                        onClick={() =>
                          void launchGame({
                            placeId: h.placeId,
                            universeId: h.universeId,
                            name: h.name,
                            thumbUrl: h.thumbUrl,
                          })
                        }
                      >
                        <Icon name="play" className="h-3.5 w-3.5" filled /> Запустить
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title">Друзья в игре</h2>
                <Link href="/friends" className="muted text-xs font-semibold hover:text-white">
                  Все друзья →
                </Link>
              </div>
              {onlineFriends.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {onlineFriends.slice(0, 6).map((f) => {
                    const p = presenceOf(f.presence?.userPresenceType);
                    return (
                      <div
                        key={f.id}
                        className="panel-soft flex items-center gap-3 px-3 py-2"
                      >
                        <div className="relative">
                          <Avatar src={f.avatar} alt={f.name} size={38} />
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0e1b]"
                            style={{ background: p.color }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/users/${f.id}`}
                            className="block truncate text-sm font-semibold text-white hover:text-violet-300"
                          >
                            {f.displayName}
                          </Link>
                          <div className="muted truncate text-[11px]">
                            {f.presence?.lastLocation || p.label}
                          </div>
                        </div>
                        {f.presence?.userPresenceType === 2 && f.presence.rootPlaceId ? (
                          <button
                            className="btn btn-play px-2.5 py-1 text-[11px]"
                            onClick={() =>
                              void launchGame({
                                placeId: f.presence!.rootPlaceId!,
                                gameId: f.presence!.gameId ?? null,
                                name: f.presence!.lastLocation ?? "Experience",
                              })
                            }
                          >
                            Join
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted text-sm">Сейчас никого нет в сети.</p>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <BalanceCard />
            {library?.servers?.length ? (
              <div className="panel p-4">
                <h3 className="section-title mb-3 text-base">Сохранённые серверы</h3>
                <div className="space-y-2">
                  {library.servers.slice(0, 5).map((s) => (
                    <Link
                      key={s.id}
                      href={`/game/${s.placeId}`}
                      className="panel-soft block px-3 py-2 text-xs hover:border-violet-400/50"
                    >
                      <div className="truncate font-semibold text-white">{s.gameName}</div>
                      <div className="muted font-mono">{s.serverId.slice(0, 12)}…</div>
                      {s.region ? <div className="muted">{s.region}</div> : null}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!me?.authenticated ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              t: "Хост и регион сервера",
              d: "Реальный IP, дата-центр, страна и город машины Roblox — то, чего нет в оригинальном клиенте",
              i: "globe" as const,
              c: "#2ee6c7",
            },
            {
              t: "Умный подбор сервера",
              d: "Сортировка по пингу, FPS и свободным местам + кнопка «Лучший сервер»",
              i: "bolt" as const,
              c: "#ffb020",
            },
            {
              t: "Счётчик Robux и история",
              d: "Баланс, транзакции, стипендия Premium и график изменений",
              i: "coin" as const,
              c: "#3ddc84",
            },
            {
              t: "Группы и сообщества",
              d: "Роли, ранги, казна, стена, игры группы и участники в одном окне",
              i: "flag" as const,
              c: "#ff5c8a",
            },
          ].map((f) => (
            <div key={f.t} className="panel hoverable p-4">
              <Icon name={f.i} className="h-6 w-6" />
              <div className="mt-2 text-sm font-bold text-white">{f.t}</div>
              <p className="muted mt-1 text-[11px] leading-snug">{f.d}</p>
              <div
                className="mt-3 h-1 w-10 rounded-full"
                style={{ background: f.c }}
              />
            </div>
          ))}
        </section>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-7 w-56" />
          <div className="flex gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-[168px] shrink-0" />
            ))}
          </div>
        </div>
      ) : null}

      {discover?.sorts?.length ? (
        <section className="space-y-3">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="section-title">Рекомендуем сейчас</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {discover.sorts[0].games.slice(0, 5).map((g) => (
              <GameCard key={g.universeId} game={g} />
            ))}
          </div>
        </section>
      ) : null}

      {discover?.sorts?.slice(1).map((sort) => (
        <GameRail key={sort.sortId} title={sort.sortDisplayName} games={sort.games} />
      ))}
    </div>
  );
}
