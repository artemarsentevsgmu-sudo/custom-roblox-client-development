import { uuid } from "@/lib/crypto";
import { cachedGet } from "@/lib/roblox";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OmniGroup = {
  contentGroupType?: string;
  contents?: { universeId?: number; name?: string; playerCount?: number; totalUpVotes?: number; totalDownVotes?: number }[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return Response.json({ games: [], users: [], groups: [] });
  const session = await getSession();
  const cookie = session?.cookie ?? null;

  const [omni, users, groups] = await Promise.all([
    cachedGet<{ searchResults?: OmniGroup[] }>(
      `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(q)}&sessionId=${uuid()}&pageType=all`,
      cookie,
      60_000,
    ),
    cachedGet<{ data?: { id: number; name: string; displayName: string; hasVerifiedBadge?: boolean }[] }>(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(q)}&limit=10`,
      cookie,
      60_000,
    ),
    cachedGet<{ data?: { id: number; name: string; memberCount: number; description?: string; hasVerifiedBadge?: boolean }[] }>(
      `https://groups.roblox.com/v1/groups/search?keyword=${encodeURIComponent(q)}&prioritizeExactMatch=true&limit=10`,
      cookie,
      60_000,
    ),
  ]);

  const universeIds = (omni.data?.searchResults ?? [])
    .filter((g) => g.contentGroupType === "Game")
    .flatMap((g) => g.contents ?? [])
    .map((c) => c.universeId)
    .filter((id): id is number => typeof id === "number")
    .slice(0, 24);

  let games: unknown[] = [];
  if (universeIds.length) {
    const [details, icons] = await Promise.all([
      cachedGet<{
        data?: {
          id: number;
          rootPlaceId: number;
          name: string;
          playing: number;
          visits: number;
          creator?: { name?: string; type?: string };
        }[];
      }>(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`, cookie, 60_000),
      cachedGet<{ data?: { targetId: number; imageUrl?: string }[] }>(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=256x256&format=Png&isCircular=false`,
        cookie,
        300_000,
      ),
    ]);
    const iconMap = Object.fromEntries(
      (icons.data?.data ?? []).map((i) => [i.targetId, i.imageUrl ?? null]),
    );
    games = (details.data?.data ?? []).map((g) => ({
      universeId: g.id,
      rootPlaceId: g.rootPlaceId,
      name: g.name,
      playerCount: g.playing,
      visits: g.visits,
      creator: g.creator?.name ?? "",
      icon: iconMap[g.id] ?? null,
    }));
  }

  const userIds = (users.data?.data ?? []).map((u) => u.id);
  let userAvatars: Record<number, string> = {};
  if (userIds.length) {
    const av = await cachedGet<{ data?: { targetId: number; imageUrl?: string }[] }>(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join(",")}&size=150x150&format=Png&isCircular=false`,
      cookie,
      300_000,
    );
    userAvatars = Object.fromEntries(
      (av.data?.data ?? []).filter((a) => a.imageUrl).map((a) => [a.targetId, a.imageUrl!]),
    );
  }

  const groupIds = (groups.data?.data ?? []).map((g) => g.id);
  let groupIcons: Record<number, string> = {};
  if (groupIds.length) {
    const gi = await cachedGet<{ data?: { targetId: number; imageUrl?: string }[] }>(
      `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupIds.join(",")}&size=150x150&format=Png&isCircular=false`,
      cookie,
      300_000,
    );
    groupIcons = Object.fromEntries(
      (gi.data?.data ?? []).filter((a) => a.imageUrl).map((a) => [a.targetId, a.imageUrl!]),
    );
  }

  return Response.json({
    games,
    users: (users.data?.data ?? []).map((u) => ({ ...u, avatar: userAvatars[u.id] ?? null })),
    groups: (groups.data?.data ?? []).map((g) => ({ ...g, icon: groupIcons[g.id] ?? null })),
  });
}
