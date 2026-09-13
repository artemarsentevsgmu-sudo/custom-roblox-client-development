"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/Icons";
import { ServerBrowser } from "@/components/ServerBrowser";
import { useSession } from "@/components/SessionProvider";
import { Avatar, Skeleton, Tabs } from "@/components/ui";
import { compact, dateLabel, fetcher, full, ratingOf, rbxPost } from "@/lib/client";
import { launchGame, toast } from "@/lib/toast";

type GamePayload = {
  universeId: number;
  placeId: number;
  detail: {
    name: string;
    description: string;
    creator?: { id: number; name: string; type: string; hasVerifiedBadge?: boolean };
    playing?: number;
    visits?: number;
    maxPlayers?: number;
    created?: string;
    updated?: string;
    genre?: string;
    price?: number | null;
    universeAvatarType?: string;
  };
  votes: { upVotes: number; downVotes: number } | null;
  favoritesCount: number | null;
  icon: string | null;
  banner: string | null;
  media: { assetId: number; url: string; alt: string }[];
  badges: { id: number; name: string; description: string; statistics?: { awardedCount?: number; winRatePercentage?: number } }[];
  socials: { type: string; url: string; title: string }[];
  userVote: boolean | null;
  favorited: boolean;
  authenticated: boolean;
};

type Tab = "servers" | "about" | "media" | "badges";

export default function GamePage() {
  const params = useParams<{ placeId: string }>();
  const placeId = Number(params.placeId);
  const { me, openLogin } = useSession();
  const [tab, setTab] = useState<Tab>("servers");
  const { data, isLoading, mutate } = useSWR<GamePayload>(
    placeId ? `/api/game?placeId=${placeId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const rating = ratingOf(data?.votes?.upVotes, data?.votes?.downVotes);

  async function vote(up: boolean) {
    if (!me?.authenticated) return openLogin();
    try {
      await rbxPost(`games.roblox.com/v1/games/${data?.universeId}/user-votes`, { vote: up });
      toast(up ? "Лайк отправлен" : "Дизлайк отправлен");
      void mutate();
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  async function favorite() {
    if (!me?.authenticated) return openLogin();
    try {
      await rbxPost(`games.roblox.com/v1/games/${data?.universeId}/favorites`, {
        isFavorited: !data?.favorited,
      });
      toast(data?.favorited ? "Удалено из избранного" : "Добавлено в избранное");
      void mutate();
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  const stats = [
    { label: "Играют сейчас", value: compact(data.detail.playing ?? 0), accent: "#3ddc84" },
    { label: "Посещений", value: compact(data.detail.visits ?? 0), accent: "#8b7bff" },
    { label: "В избранном", value: compact(data.favoritesCount ?? 0), accent: "#ff5c8a" },
    { label: "Рейтинг", value: rating === null ? "—" : `${rating}%`, accent: "#ffb020" },
    { label: "Макс. игроков", value: data.detail.maxPlayers ?? "—", accent: "#2ee6c7" },
    { label: "Обновлено", value: dateLabel(data.detail.updated), accent: "#c65cff" },
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10">
        <div className="absolute inset-0">
          {data.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.banner} alt="" className="h-full w-full object-cover opacity-45" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060d] via-[#05060d]/80 to-[#05060d]/30" />
        </div>
        <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-end">
          <div className="h-28 w-28 overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
            {data.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.icon} alt={data.detail.name} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-white md:text-3xl">{data.detail.name}</h1>
            <div className="muted mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span>
                от{" "}
                {data.detail.creator?.type === "Group" ? (
                  <Link
                    href={`/groups/${data.detail.creator.id}`}
                    className="font-semibold text-violet-300 hover:text-violet-200"
                  >
                    {data.detail.creator.name}
                  </Link>
                ) : (
                  <Link
                    href={`/users/${data.detail.creator?.id}`}
                    className="font-semibold text-violet-300 hover:text-violet-200"
                  >
                    {data.detail.creator?.name}
                  </Link>
                )}
              </span>
              {data.detail.creator?.hasVerifiedBadge ? <span title="Verified">☑️</span> : null}
              <span>·</span>
              <span>{data.detail.genre || "Adventure"}</span>
              <span>·</span>
              <span>создано {dateLabel(data.detail.created)}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="btn btn-play px-6"
                onClick={() =>
                  void launchGame({
                    placeId,
                    universeId: data.universeId,
                    name: data.detail.name,
                    thumbUrl: data.icon,
                  })
                }
              >
                <Icon name="play" className="h-4 w-4" filled /> Играть
              </button>
              <button className="btn" onClick={() => void favorite()}>
                <Icon name="star" className="h-4 w-4" filled={data.favorited} />
                {data.favorited ? "В избранном" : "В избранное"}
              </button>
              <button
                className={`btn ${data.userVote === true ? "border-emerald-400/60 text-emerald-300" : ""}`}
                onClick={() => void vote(true)}
              >
                👍 {compact(data.votes?.upVotes ?? 0)}
              </button>
              <button
                className={`btn ${data.userVote === false ? "border-rose-400/60 text-rose-300" : ""}`}
                onClick={() => void vote(false)}
              >
                👎 {compact(data.votes?.downVotes ?? 0)}
              </button>
              <a
                className="btn"
                href={`https://www.roblox.com/games/${placeId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="globe" className="h-4 w-4" /> roblox.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="panel px-4 py-3">
            <div className="text-[10px] font-bold uppercase" style={{ color: s.accent }}>
              {s.label}
            </div>
            <div className="mt-0.5 text-lg font-extrabold text-white">{s.value}</div>
          </div>
        ))}
      </section>

      <Tabs
        tabs={[
          { id: "servers" as const, label: "🛰️ Серверы" },
          { id: "about" as const, label: "📝 Об игре" },
          { id: "media" as const, label: `🖼️ Медиа`, count: data.media.length },
          { id: "badges" as const, label: "🏅 Значки", count: data.badges.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "servers" ? (
        <ServerBrowser placeId={placeId} gameName={data.detail.name} universeId={data.universeId} />
      ) : null}

      {tab === "about" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="panel p-5">
            <h3 className="section-title mb-3">Описание</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {data.detail.description || "Разработчик не добавил описание."}
            </p>
          </div>
          <div className="space-y-4">
            <div className="panel p-5">
              <h3 className="section-title mb-3 text-base">Технические детали</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ["Universe ID", data.universeId],
                  ["Place ID", data.placeId],
                  ["Тип аватара", data.detail.universeAvatarType ?? "—"],
                  ["Цена входа", data.detail.price ? `${data.detail.price} R$` : "Бесплатно"],
                  ["Всего посещений", full(data.detail.visits ?? 0)],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-3">
                    <dt className="muted">{k}</dt>
                    <dd className="font-mono text-white">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {data.socials.length ? (
              <div className="panel p-5">
                <h3 className="section-title mb-3 text-base">Сообщество</h3>
                <div className="flex flex-wrap gap-2">
                  {data.socials.map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="chip">
                      {s.title || s.type}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "media" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.media.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={m.assetId}
              src={m.url}
              alt={m.alt}
              className="panel hoverable w-full object-cover"
              loading="lazy"
            />
          ))}
          {!data.media.length ? <p className="muted text-sm">Нет скриншотов</p> : null}
        </div>
      ) : null}

      {tab === "badges" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.badges.map((b) => (
            <div key={b.id} className="panel flex gap-3 p-4">
              <Avatar
                src={`https://www.roblox.com/asset-thumbnail/image?assetId=${b.id}&width=150&height=150&format=png`}
                alt={b.name}
                size={48}
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{b.name}</div>
                <p className="muted line-clamp-2 text-xs">{b.description}</p>
                <div className="muted mt-1 text-[11px]">
                  🏆 {compact(b.statistics?.awardedCount ?? 0)} получили ·{" "}
                  {(b.statistics?.winRatePercentage ?? 0).toFixed(1)}% win rate
                </div>
              </div>
            </div>
          ))}
          {!data.badges.length ? <p className="muted text-sm">В игре нет значков</p> : null}
        </div>
      ) : null}
    </div>
  );
}
