import { cachedGet, rbx } from "@/lib/roblox";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Server = {
  id: string;
  maxPlayers: number;
  playing: number;
  playerTokens: string[];
  fps: number;
  ping: number;
  name?: string;
  accessCode?: string;
  owner?: { id: number; name: string; displayName: string };
};

/**
 * Enriched server browser.
 * GET /api/servers?placeId=123&type=Public&cursor=&sort=Desc
 * Returns the raw server list plus resolved player avatars for every player token.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const placeId = Number(url.searchParams.get("placeId") ?? "0");
  const type = ["Public", "Friend", "Private"].includes(url.searchParams.get("type") ?? "")
    ? url.searchParams.get("type")
    : "Public";
  const cursor = url.searchParams.get("cursor") ?? "";
  const sort = url.searchParams.get("sort") === "Asc" ? "Asc" : "Desc";
  if (!placeId) return Response.json({ error: "placeId required" }, { status: 400 });

  const session = await getSession();
  const cookie = session?.cookie ?? null;

  const listUrl =
    `https://games.roblox.com/v1/games/${placeId}/servers/${type}` +
    `?sortOrder=${sort}&excludeFullGames=false&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;

  const res = await cachedGet<{ data?: Server[]; nextPageCursor?: string | null }>(
    listUrl,
    cookie,
    10_000,
  );

  if (!res.ok) {
    return Response.json(
      { error: "Не удалось получить список серверов", detail: res.data },
      { status: res.status === 599 ? 502 : res.status },
    );
  }

  const servers = res.data?.data ?? [];
  const tokens = [...new Set(servers.flatMap((s) => s.playerTokens ?? []))].slice(0, 100);

  let avatars: Record<string, string> = {};
  if (tokens.length) {
    const batch = tokens.map((token, i) => ({
      requestId: `${i}:${token}:AvatarHeadshot:150x150:png:regular`,
      token,
      type: "AvatarHeadShot",
      size: "150x150",
      format: "png",
      isCircular: false,
    }));
    const thumbs = await rbx<{ data?: { requestId?: string; imageUrl?: string; state?: string }[] }>(
      "https://thumbnails.roblox.com/v1/batch",
      { method: "POST", body: batch, cookie },
    );
    avatars = Object.fromEntries(
      (thumbs.data?.data ?? [])
        .filter((d) => d.imageUrl && d.requestId)
        .map((d) => [d.requestId!.split(":")[1], d.imageUrl!]),
    );
  }

  return Response.json({
    servers,
    avatars,
    nextPageCursor: res.data?.nextPageCursor ?? null,
    authenticated: Boolean(session),
  });
}
