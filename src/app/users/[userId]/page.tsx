"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Icon } from "@/components/Icons";
import { Avatar, Skeleton, Stat } from "@/components/ui";
import { compact, dateLabel, fetcher, presenceOf, rbxUrl } from "@/lib/client";

type Profile = { id: number; name: string; displayName: string; description: string; created: string; hasVerifiedBadge: boolean; isBanned: boolean };
type Thumb = { data?: { imageUrl?: string }[] };
type Count = { count: number };
type GroupsRoles = {
  data?: { group: { id: number; name: string; memberCount: number }; role: { name: string; rank: number } }[];
};

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);

  const { data: profile, isLoading } = useSWR<Profile>(
    userId ? rbxUrl(`users.roblox.com/v1/users/${userId}`, 60_000) : null,
    fetcher,
  );
  const { data: avatar } = useSWR<Thumb>(
    userId
      ? rbxUrl(
          `thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
          300_000,
        )
      : null,
    fetcher,
  );
  const { data: friends } = useSWR<Count>(
    userId ? rbxUrl(`friends.roblox.com/v1/users/${userId}/friends/count`, 60_000) : null,
    fetcher,
  );
  const { data: followers } = useSWR<Count>(
    userId ? rbxUrl(`friends.roblox.com/v1/users/${userId}/followers/count`, 60_000) : null,
    fetcher,
  );
  const { data: groups } = useSWR<GroupsRoles>(
    userId ? rbxUrl(`groups.roblox.com/v2/users/${userId}/groups/roles`, 120_000) : null,
    fetcher,
  );
  const { data: presence } = useSWR<{ userPresences?: { userPresenceType: number; lastLocation?: string }[] }>(
    userId ? rbxUrl(`presence.roblox.com/v1/presence/users?userIds=${userId}`, 30_000) : null,
    fetcher,
  );

  if (isLoading || !profile) return <Skeleton className="h-72 w-full rounded-3xl" />;

  const p = presenceOf(presence?.userPresences?.[0]?.userPresenceType);

  return (
    <div className="space-y-5">
      <section className="panel relative overflow-hidden p-6">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row">
          <div className="relative">
            <Avatar src={avatar?.data?.[0]?.imageUrl} alt={profile.name} size={148} />
            <span
              className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-[#0b0e1b]"
              style={{ background: p.color }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-white">
              {profile.displayName} {profile.hasVerifiedBadge ? "☑️" : ""}
            </h1>
            <div className="muted text-sm">@{profile.name}</div>
            <div className="mt-1 text-sm font-semibold" style={{ color: p.color }}>
              {presence?.userPresences?.[0]?.lastLocation || p.label}
            </div>
            <p className="muted mt-3 max-w-2xl whitespace-pre-wrap text-sm">
              {profile.description || "Без описания"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className="btn"
                href={`https://www.roblox.com/users/${userId}/profile`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="globe" className="h-4 w-4" /> Профиль на roblox.com
              </a>
              <span className="chip">Зарегистрирован {dateLabel(profile.created)}</span>
              {profile.isBanned ? (
                <span className="chip border-rose-400/40 bg-rose-500/15 text-rose-200">
                  Аккаунт заблокирован
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Друзья" value={compact(friends?.count ?? null)} accent="#3ddc84" />
        <Stat label="Подписчики" value={compact(followers?.count ?? null)} accent="#ff5c8a" />
        <Stat label="Группы" value={groups?.data?.length ?? 0} accent="#8b7bff" />
        <Stat label="User ID" value={userId} accent="#2ee6c7" />
      </section>

      {groups?.data?.length ? (
        <section>
          <h2 className="section-title mb-3">Группы игрока</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {groups.data.slice(0, 12).map((g) => (
              <Link
                key={g.group.id}
                href={`/groups/${g.group.id}`}
                className="panel hoverable px-4 py-3"
              >
                <div className="truncate text-sm font-bold text-white">{g.group.name}</div>
                <div className="muted text-[11px]">
                  {g.role.name} · {compact(g.group.memberCount)} участников
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
