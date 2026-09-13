import { cachedGet } from "@/lib/roblox";
import { getSession } from "@/lib/session";
import { iconsFor, userAvatars } from "@/lib/thumbs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GroupRole = {
  group: {
    id: number;
    name: string;
    memberCount: number;
    description?: string;
    hasVerifiedBadge?: boolean;
    owner?: { userId: number; username: string; displayName: string } | null;
    shout?: { body: string; poster?: { username: string }; updated: string } | null;
  };
  role: { id: number; name: string; rank: number };
};

async function groupIcons(ids: number[], cookie: string | null) {
  if (!ids.length) return {} as Record<number, string>;
  const res = await cachedGet<{ data?: { targetId: number; imageUrl?: string }[] }>(
    `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${ids.join(",")}&size=150x150&format=Png&isCircular=false`,
    cookie,
    300_000,
  );
  return Object.fromEntries(
    (res.data?.data ?? []).filter((d) => d.imageUrl).map((d) => [d.targetId, d.imageUrl!]),
  ) as Record<number, string>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") ?? "0");
  const session = await getSession();
  const cookie = session?.cookie ?? null;

  /* ---------- single group ---------- */
  if (id) {
    const [info, roles, members, wall, socials, games, funds] = await Promise.all([
      cachedGet<{
        id: number;
        name: string;
        description: string;
        memberCount: number;
        publicEntryAllowed: boolean;
        hasVerifiedBadge: boolean;
        owner?: { userId: number; username: string; displayName: string } | null;
        shout?: { body: string; poster?: { username: string; displayName: string }; updated: string } | null;
      }>(`https://groups.roblox.com/v1/groups/${id}`, cookie, 60_000),
      cachedGet<{ roles?: { id: number; name: string; rank: number; memberCount?: number }[] }>(
        `https://groups.roblox.com/v1/groups/${id}/roles`,
        cookie,
        300_000,
      ),
      cachedGet<{
        data?: { user: { userId: number; username: string; displayName: string }; role: { name: string; rank: number } }[];
      }>(`https://groups.roblox.com/v1/groups/${id}/users?limit=25&sortOrder=Desc`, cookie, 60_000),
      cachedGet<{
        data?: {
          id: number;
          poster?: { user?: { userId: number; username: string; displayName: string }; role?: { name: string } } | null;
          body: string;
          created: string;
        }[];
      }>(`https://groups.roblox.com/v2/groups/${id}/wall/posts?limit=15&sortOrder=Desc`, cookie, 30_000),
      cachedGet<{ data?: { type?: { value?: string }; url: string; title: string }[] }>(
        `https://groups.roblox.com/v1/groups/${id}/social-links`,
        cookie,
        300_000,
      ),
      cachedGet<{ data?: { id: number; name: string; playerCount: number; rootPlace?: { id: number } }[] }>(
        `https://games.roblox.com/v2/groups/${id}/games?accessFilter=Public&limit=10&sortOrder=Desc`,
        cookie,
        120_000,
      ),
      cookie
        ? cachedGet<{ robux?: number }>(
            `https://economy.roblox.com/v1/groups/${id}/currency`,
            cookie,
            60_000,
          )
        : Promise.resolve({ data: null } as { data: { robux?: number } | null }),
    ]);

    const memberIds = (members.data?.data ?? []).map((m) => m.user.userId);
    const wallIds = (wall.data?.data ?? [])
      .map((p) => p.poster?.user?.userId)
      .filter((x): x is number => typeof x === "number");
    const ownerId = info.data?.owner?.userId;
    const avatars = await userAvatars(
      [...new Set([...memberIds, ...wallIds, ...(ownerId ? [ownerId] : [])])],
      cookie,
    );

    const gameIds = (games.data?.data ?? []).map((g) => g.id);
    const gameIcons = await iconsFor(gameIds, cookie);

    let myRole: { name: string; rank: number } | null = null;
    if (session) {
      const mine = await cachedGet<{ data?: GroupRole[] }>(
        `https://groups.roblox.com/v2/users/${session.userId}/groups/roles`,
        cookie,
        60_000,
      );
      const found = (mine.data?.data ?? []).find((g) => g.group.id === id);
      myRole = found ? { name: found.role.name, rank: found.role.rank } : null;
    }

    const icons = await groupIcons([id], cookie);

    return Response.json({
      group: info.data,
      icon: icons[id] ?? null,
      roles: roles.data?.roles ?? [],
      members: (members.data?.data ?? []).map((m) => ({
        ...m,
        avatar: avatars[m.user.userId] ?? null,
      })),
      wall: (wall.data?.data ?? []).map((p) => ({
        ...p,
        avatar: p.poster?.user ? (avatars[p.poster.user.userId] ?? null) : null,
      })),
      socials: socials.data?.data ?? [],
      games: (games.data?.data ?? []).map((g) => ({
        universeId: g.id,
        rootPlaceId: g.rootPlace?.id ?? 0,
        name: g.name,
        playerCount: g.playerCount,
        icon: gameIcons[g.id] ?? null,
      })),
      funds: funds.data?.robux ?? null,
      ownerAvatar: ownerId ? (avatars[ownerId] ?? null) : null,
      myRole,
      authenticated: Boolean(session),
    });
  }

  /* ---------- my groups ---------- */
  if (!session) return Response.json({ authenticated: false, groups: [] });
  const mine = await cachedGet<{ data?: GroupRole[] }>(
    `https://groups.roblox.com/v2/users/${session.userId}/groups/roles?includeLocked=true`,
    cookie,
    60_000,
  );
  const groups = mine.data?.data ?? [];
  const icons = await groupIcons(
    groups.map((g) => g.group.id),
    cookie,
  );
  return Response.json({
    authenticated: true,
    groups: groups
      .map((g) => ({
        id: g.group.id,
        name: g.group.name,
        memberCount: g.group.memberCount,
        hasVerifiedBadge: g.group.hasVerifiedBadge ?? false,
        owner: g.group.owner?.displayName ?? null,
        shout: g.group.shout?.body ?? null,
        role: g.role,
        icon: icons[g.group.id] ?? null,
      }))
      .sort((a, b) => b.role.rank - a.role.rank),
  });
}
