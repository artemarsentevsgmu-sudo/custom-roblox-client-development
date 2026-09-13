import { db } from "@/db";
import { playHistory } from "@/db/schema";
import { buildDeepLink, getAuthTicket } from "@/lib/roblox";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Builds a real roblox-player:// deep link (with auth ticket) and records play history. */
export async function POST(request: Request) {
  let body: {
    placeId?: number;
    gameId?: string | null;
    universeId?: number | null;
    name?: string;
    thumbUrl?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const placeId = Number(body.placeId ?? 0);
  if (!placeId) return Response.json({ error: "placeId required" }, { status: 400 });

  const session = await getSession();
  let ticket: string | null = null;
  if (session) {
    ticket = await getAuthTicket(session.cookie);
    try {
      await db.insert(playHistory).values({
        ownerUserId: session.userId,
        placeId,
        universeId: body.universeId ?? null,
        name: body.name ?? `Place ${placeId}`,
        thumbUrl: body.thumbUrl ?? null,
        serverId: body.gameId ?? null,
      });
    } catch {
      /* history is best effort */
    }
  }

  return Response.json({
    deepLink: buildDeepLink(placeId, ticket, body.gameId ?? null),
    webLink: `https://www.roblox.com/games/${placeId}/${body.gameId ? `?gameInstanceId=${body.gameId}` : ""}`,
    authenticated: Boolean(session),
    ticketIssued: Boolean(ticket),
  });
}
