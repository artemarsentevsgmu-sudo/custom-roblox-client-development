import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { balanceSnapshots, sessions } from "@/db/schema";
import { cachedGet } from "@/lib/roblox";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Num = number | null;

async function num(url: string, cookie: string, key: string): Promise<Num> {
  const res = await cachedGet<Record<string, unknown>>(url, cookie, 30_000);
  const value = res.data?.[key];
  return typeof value === "number" ? value : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ authenticated: false });

  const { cookie, userId } = session;

  const [
    profile,
    robux,
    premium,
    friends,
    followers,
    following,
    unread,
    requests,
    groups,
    headshot,
    fullBody,
    presence,
  ] = await Promise.all([
    cachedGet<{ description?: string; created?: string; name?: string; displayName?: string; hasVerifiedBadge?: boolean }>(
      `https://users.roblox.com/v1/users/${userId}`,
      cookie,
      120_000,
    ),
    num(`https://economy.roblox.com/v1/users/${userId}/currency`, cookie, "robux"),
    cachedGet<boolean>(
      `https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`,
      cookie,
      300_000,
    ),
    num(`https://friends.roblox.com/v1/users/${userId}/friends/count`, cookie, "count"),
    num(`https://friends.roblox.com/v1/users/${userId}/followers/count`, cookie, "count"),
    num(`https://friends.roblox.com/v1/users/${userId}/followings/count`, cookie, "count"),
    num("https://privatemessages.roblox.com/v1/messages/unread/count", cookie, "count"),
    num("https://friends.roblox.com/v1/user/friend-requests/count", cookie, "count"),
    cachedGet<{ data?: unknown[] }>(
      `https://groups.roblox.com/v2/users/${userId}/groups/roles`,
      cookie,
      120_000,
    ),
    cachedGet<{ data?: { imageUrl?: string }[] }>(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
      cookie,
      300_000,
    ),
    cachedGet<{ data?: { imageUrl?: string }[] }>(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
      cookie,
      300_000,
    ),
    cachedGet<{ userPresences?: { userPresenceType?: number; lastLocation?: string }[] }>(
      `https://presence.roblox.com/v1/presence/users?userIds=${userId}`,
      cookie,
      30_000,
    ),
  ]);

  const avatarUrl = headshot.data?.data?.[0]?.imageUrl ?? session.avatarUrl ?? null;

  // snapshot Robux for the balance chart (max one per 5 minutes)
  let history: { robux: number; capturedAt: string }[] = [];
  try {
    if (typeof robux === "number") {
      const last = await db
        .select()
        .from(balanceSnapshots)
        .where(eq(balanceSnapshots.ownerUserId, userId))
        .orderBy(desc(balanceSnapshots.capturedAt))
        .limit(1);
      const lastRow = last[0];
      if (!lastRow || Date.now() - lastRow.capturedAt.getTime() > 5 * 60_000) {
        await db.insert(balanceSnapshots).values({ ownerUserId: userId, robux });
      }
    }
    const rows = await db
      .select()
      .from(balanceSnapshots)
      .where(eq(balanceSnapshots.ownerUserId, userId))
      .orderBy(desc(balanceSnapshots.capturedAt))
      .limit(24);
    history = rows
      .reverse()
      .map((r) => ({ robux: r.robux, capturedAt: r.capturedAt.toISOString() }));
    await db
      .update(sessions)
      .set({ lastSeenAt: sql`now()`, avatarUrl })
      .where(eq(sessions.id, session.id));
  } catch {
    /* database is optional for the live data above */
  }

  return Response.json({
    authenticated: true,
    user: {
      id: userId,
      name: profile.data?.name ?? session.username,
      displayName: profile.data?.displayName ?? session.displayName,
      description: profile.data?.description ?? "",
      created: profile.data?.created ?? null,
      hasVerifiedBadge: profile.data?.hasVerifiedBadge ?? false,
      avatarUrl,
      fullBodyUrl: fullBody.data?.data?.[0]?.imageUrl ?? null,
      isPremium: premium.data === true,
      loginMethod: session.loginMethod,
    },
    stats: {
      robux,
      friends,
      followers,
      following,
      groups: groups.data?.data?.length ?? null,
      unreadMessages: unread,
      friendRequests: requests,
    },
    presence: presence.data?.userPresences?.[0] ?? null,
    balanceHistory: history,
  });
}
