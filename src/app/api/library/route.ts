import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pinnedGroups, playHistory, savedServers } from "@/db/schema";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ authenticated: false, servers: [], groups: [], history: [] });
  const [servers, groups, history] = await Promise.all([
    db
      .select()
      .from(savedServers)
      .where(eq(savedServers.ownerUserId, session.userId))
      .orderBy(desc(savedServers.createdAt))
      .limit(60),
    db
      .select()
      .from(pinnedGroups)
      .where(eq(pinnedGroups.ownerUserId, session.userId))
      .orderBy(desc(pinnedGroups.createdAt))
      .limit(40),
    db
      .select({
        placeId: playHistory.placeId,
        universeId: playHistory.universeId,
        name: playHistory.name,
        thumbUrl: playHistory.thumbUrl,
        playedAt: sql<string>`max(${playHistory.playedAt})`,
      })
      .from(playHistory)
      .where(eq(playHistory.ownerUserId, session.userId))
      .groupBy(playHistory.placeId, playHistory.universeId, playHistory.name, playHistory.thumbUrl)
      .orderBy(desc(sql`max(${playHistory.playedAt})`))
      .limit(12),
  ]);
  return Response.json({ authenticated: true, servers, groups, history });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const action = String(body.action ?? "");

  if (action === "saveServer") {
    await db.insert(savedServers).values({
      ownerUserId: session.userId,
      placeId: Number(body.placeId ?? 0),
      gameName: String(body.gameName ?? "Experience"),
      serverId: String(body.serverId ?? ""),
      region: body.region ? String(body.region) : null,
      host: body.host ? String(body.host) : null,
      playing: body.playing ? Number(body.playing) : null,
      maxPlayers: body.maxPlayers ? Number(body.maxPlayers) : null,
      note: body.note ? String(body.note) : null,
    });
    return Response.json({ ok: true });
  }

  if (action === "removeServer") {
    await db
      .delete(savedServers)
      .where(
        and(eq(savedServers.ownerUserId, session.userId), eq(savedServers.id, Number(body.id ?? 0))),
      );
    return Response.json({ ok: true });
  }

  if (action === "pinGroup") {
    const groupId = Number(body.groupId ?? 0);
    const existing = await db
      .select()
      .from(pinnedGroups)
      .where(and(eq(pinnedGroups.ownerUserId, session.userId), eq(pinnedGroups.groupId, groupId)))
      .limit(1);
    if (existing.length) {
      await db
        .delete(pinnedGroups)
        .where(and(eq(pinnedGroups.ownerUserId, session.userId), eq(pinnedGroups.groupId, groupId)));
      return Response.json({ ok: true, pinned: false });
    }
    await db.insert(pinnedGroups).values({
      ownerUserId: session.userId,
      groupId,
      name: String(body.name ?? "Group"),
      memberCount: body.memberCount ? Number(body.memberCount) : null,
    });
    return Response.json({ ok: true, pinned: true });
  }

  if (action === "clearHistory") {
    await db.delete(playHistory).where(eq(playHistory.ownerUserId, session.userId));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
}
