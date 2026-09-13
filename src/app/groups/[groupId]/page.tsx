"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { GameCard } from "@/components/GameCard";
import { Icon } from "@/components/Icons";
import { useSession } from "@/components/SessionProvider";
import { Avatar, Skeleton, Tabs } from "@/components/ui";
import { api, compact, dateLabel, fetcher, full, rbxPost, timeAgo } from "@/lib/client";
import { toast } from "@/lib/toast";

type Payload = {
  group: {
    id: number;
    name: string;
    description: string;
    memberCount: number;
    publicEntryAllowed: boolean;
    hasVerifiedBadge: boolean;
    owner?: { userId: number; username: string; displayName: string } | null;
    shout?: { body: string; poster?: { displayName?: string; username?: string }; updated: string } | null;
  };
  icon: string | null;
  roles: { id: number; name: string; rank: number; memberCount?: number }[];
  members: {
    user: { userId: number; username: string; displayName: string };
    role: { name: string; rank: number };
    avatar: string | null;
  }[];
  wall: {
    id: number;
    body: string;
    created: string;
    avatar: string | null;
    poster?: { user?: { userId: number; username: string; displayName: string }; role?: { name: string } } | null;
  }[];
  socials: { url: string; title: string }[];
  games: { universeId: number; rootPlaceId: number; name: string; playerCount: number; icon: string | null }[];
  funds: number | null;
  ownerAvatar: string | null;
  myRole: { name: string; rank: number } | null;
  authenticated: boolean;
};

export default function GroupPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);
  const { me } = useSession();
  const [tab, setTab] = useState<"members" | "wall" | "roles" | "games" | "about">("wall");
  const { data, isLoading, mutate } = useSWR<Payload>(
    groupId ? `/api/groups?id=${groupId}` : null,
    fetcher,
  );

  async function joinGroup() {
    try {
      await rbxPost(`groups.roblox.com/v1/groups/${groupId}/users`, {});
      toast("Заявка отправлена / вы вступили в группу");
      void mutate();
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  async function pin() {
    try {
      const res = await api<{ pinned: boolean }>("/api/library", {
        method: "POST",
        body: JSON.stringify({
          action: "pinGroup",
          groupId,
          name: data?.group.name,
          memberCount: data?.group.memberCount,
        }),
      });
      toast(res.pinned ? "Группа закреплена" : "Группа откреплена");
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  if (isLoading || !data?.group) {
    return <Skeleton className="h-72 w-full rounded-3xl" />;
  }

  return (
    <div className="space-y-5">
      <section className="panel relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row">
          <Avatar src={data.icon} alt={data.group.name} size={104} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-white">
              {data.group.name} {data.group.hasVerifiedBadge ? "☑️" : ""}
            </h1>
            <div className="muted mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span>{full(data.group.memberCount)} участников</span>
              <span>·</span>
              <span>
                владелец{" "}
                <Link
                  href={`/users/${data.group.owner?.userId}`}
                  className="font-semibold text-violet-300"
                >
                  {data.group.owner?.displayName ?? "нет"}
                </Link>
              </span>
              <span>·</span>
              <span>{data.group.publicEntryAllowed ? "открытая" : "по заявке"}</span>
            </div>
            {data.myRole ? (
              <span className="chip mt-3 border-emerald-400/30 bg-emerald-500/15 text-emerald-200">
                Ваша роль: {data.myRole.name} (ранг {data.myRole.rank})
              </span>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {!data.myRole ? (
                <button className="btn btn-primary" onClick={() => void joinGroup()}>
                  <Icon name="flag" className="h-4 w-4" /> Вступить
                </button>
              ) : null}
              <button className="btn" onClick={() => void pin()}>
                <Icon name="pin" className="h-4 w-4" /> Закрепить
              </button>
              <a
                className="btn"
                href={`https://www.roblox.com/groups/${groupId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="globe" className="h-4 w-4" /> На roblox.com
              </a>
            </div>
          </div>
          <div className="grid shrink-0 gap-2 text-center">
            <div className="panel-soft px-5 py-3">
              <div className="text-[10px] font-bold uppercase text-amber-300">Казна группы</div>
              <div className="text-xl font-black text-white">
                {data.funds === null ? "нет доступа" : `${compact(data.funds)} R$`}
              </div>
            </div>
            <div className="panel-soft px-5 py-3">
              <div className="text-[10px] font-bold uppercase text-violet-300">Ролей</div>
              <div className="text-xl font-black text-white">{data.roles.length}</div>
            </div>
          </div>
        </div>

        {data.group.shout?.body ? (
          <div className="relative mt-5 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
            <div className="text-xs font-bold uppercase text-violet-200">📣 Объявление группы</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-white">{data.group.shout.body}</p>
            <div className="muted mt-1 text-[11px]">
              {data.group.shout.poster?.displayName ?? "—"} · {timeAgo(data.group.shout.updated)}
            </div>
          </div>
        ) : null}
      </section>

      <Tabs
        tabs={[
          { id: "wall" as const, label: "💬 Стена", count: data.wall.length },
          { id: "members" as const, label: "👥 Участники", count: data.members.length },
          { id: "roles" as const, label: "🏅 Роли", count: data.roles.length },
          { id: "games" as const, label: "🎮 Игры", count: data.games.length },
          { id: "about" as const, label: "ℹ️ О группе" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "wall" ? (
        <div className="space-y-3">
          {data.wall.map((p) => (
            <div key={p.id} className="panel flex gap-3 p-4">
              <Avatar src={p.avatar} alt={p.poster?.user?.username ?? "?"} size={42} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/users/${p.poster?.user?.userId}`}
                    className="text-sm font-bold text-white hover:text-violet-300"
                  >
                    {p.poster?.user?.displayName ?? "Удалённый пользователь"}
                  </Link>
                  {p.poster?.role?.name ? (
                    <span className="chip !py-0 text-[10px]">{p.poster.role.name}</span>
                  ) : null}
                  <span className="muted text-[11px]">{timeAgo(p.created)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{p.body}</p>
              </div>
            </div>
          ))}
          {!data.wall.length ? (
            <p className="muted py-10 text-center text-sm">
              Стена пуста или закрыта {me?.authenticated ? "" : "(войдите для просмотра)"}
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "members" ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.members.map((m) => (
            <Link
              key={m.user.userId}
              href={`/users/${m.user.userId}`}
              className="panel hoverable flex items-center gap-3 p-3"
            >
              <Avatar src={m.avatar} alt={m.user.username} size={42} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {m.user.displayName}
                </div>
                <div className="muted truncate text-[11px]">
                  @{m.user.username} · {m.role.name}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "roles" ? (
        <div className="panel divide-y divide-white/8">
          {[...data.roles]
            .sort((a, b) => b.rank - a.rank)
            .map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-bold text-white">{r.name}</div>
                  <div className="muted text-[11px]">Ранг {r.rank}</div>
                </div>
                <div className="text-sm font-semibold text-violet-300">
                  {compact(r.memberCount ?? 0)} чел.
                </div>
              </div>
            ))}
        </div>
      ) : null}

      {tab === "games" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.games.map((g) => (
            <GameCard key={g.universeId} game={g} />
          ))}
          {!data.games.length ? <p className="muted text-sm">У группы нет публичных игр</p> : null}
        </div>
      ) : null}

      {tab === "about" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="panel p-5">
            <h3 className="section-title mb-2">Описание</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {data.group.description || "Описание отсутствует"}
            </p>
          </div>
          <div className="space-y-3">
            <div className="panel p-5">
              <h3 className="section-title mb-2 text-base">Информация</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="muted">Group ID</dt>
                  <dd className="font-mono text-white">{data.group.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="muted">Участников</dt>
                  <dd className="text-white">{full(data.group.memberCount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="muted">Объявление</dt>
                  <dd className="text-white">{dateLabel(data.group.shout?.updated)}</dd>
                </div>
              </dl>
            </div>
            {data.socials.length ? (
              <div className="panel p-5">
                <h3 className="section-title mb-2 text-base">Соцсети</h3>
                <div className="flex flex-wrap gap-2">
                  {data.socials.map((s) => (
                    <a key={s.url} className="chip" href={s.url} target="_blank" rel="noreferrer">
                      {s.title || s.url}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
