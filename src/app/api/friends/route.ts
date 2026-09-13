import { cachedGet, rbx } from "@/lib/roblox";
import { getSession } from "@/lib/session";
import { userAvatars } from "@/lib/thumbs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Friend = {
  id: number;
  name: string;
  displayName: string;
  hasVerifiedBadge?: boolean;
};

type Presence = {
  userId: number;
  userPresenceType: number;
  lastLocation?: string;
  placeId?: number | null;
  rootPlaceId?: number | null;
  gameId?: string | null;
  universeId?: number | null;
  lastOnline?: string;
};

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ authenticated: false, friends: [], requests: [] });
  const cookie = session.cookie;

  const [listRes, requestsRes] = await Promise.all([
    cachedGet<{ data?: Friend[] }>(
      `https://friends.roblox.com/v1/users/${session.userId}/friends?userSort=StatusFrequents`,
      cookie,
      30_000,
    ),
    cachedGet<{ data?: { id: number; name: string; displayName: string; friendRequest?: { sentAt?: string } }[] }>(
      "https://friends.roblox.com/v1/my/friends/requests?limit=25&sortOrder=Desc",
      cookie,
      30_000,
    ),
  ]);

  const friends = listRes.data?.data ?? [];
  const ids = friends.map((f) => f.id);

  const presenceMap: Record<number, Presence> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await rbx<{ userPresences?: Presence[] }>(
      "https://presence.roblox.com/v1/presence/users",
      { method: "POST", body: { userIds: chunk }, cookie },
    );
    for (const p of res.data?.userPresences ?? []) presenceMap[p.userId] = p;
  }

  const requests = requestsRes.data?.data ?? [];
  const avatars = await userAvatars([...ids, ...requests.map((r) => r.id)].slice(0, 250), cookie);

  const rank = (t: number) => (t === 2 ? 0 : t === 3 ? 1 : t === 1 ? 2 : 3);

  const enriched = friends
    .map((f) => ({
      ...f,
      avatar: avatars[f.id] ?? null,
      presence: presenceMap[f.id] ?? null,
    }))
    .sort((a, b) => {
      const ra = rank(a.presence?.userPresenceType ?? 0);
      const rb = rank(b.presence?.userPresenceType ?? 0);
      if (ra !== rb) return ra - rb;
      return a.displayName.localeCompare(b.displayName);
    });

  return Response.json({
    authenticated: true,
    friends: enriched,
    requests: requests.map((r) => ({ ...r, avatar: avatars[r.id] ?? null })),
    online: enriched.filter((f) => (f.presence?.userPresenceType ?? 0) > 0).length,
    inGame: enriched.filter((f) => f.presence?.userPresenceType === 2).length,
  });
}
