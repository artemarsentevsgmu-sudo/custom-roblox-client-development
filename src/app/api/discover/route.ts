import { cachedGet } from "@/lib/roblox";
import { getSession } from "@/lib/session";
import { uuid } from "@/lib/crypto";
import { bannersFor, iconsFor } from "@/lib/thumbs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type DiscoverGame = {
  universeId: number;
  rootPlaceId: number;
  name: string;
  playerCount: number;
  totalUpVotes: number;
  totalDownVotes: number;
  genre?: string;
  icon?: string | null;
  banner?: string | null;
};

type Sort = {
  sortId: string;
  sortDisplayName: string;
  contentType: string;
  games?: DiscoverGame[];
};

let sessionId = uuid();
let sessionIdAt = Date.now();
function exploreSession() {
  if (Date.now() - sessionIdAt > 20 * 60_000) {
    sessionId = uuid();
    sessionIdAt = Date.now();
  }
  return sessionId;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wanted = url.searchParams.get("sort");
  const perSort = Number(url.searchParams.get("perSort") ?? "12");
  const session = await getSession();
  const cookie = session?.cookie ?? null;

  const sortsRes = await cachedGet<{ sorts?: Sort[] }>(
    `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${exploreSession()}&device=computer&country=all`,
    cookie,
    300_000,
  );

  const allSorts = (sortsRes.data?.sorts ?? []).filter(
    (s) => s.contentType === "Games" && Array.isArray(s.games) && s.games.length,
  );

  if (!allSorts.length) {
    return Response.json({ sorts: [], error: "Roblox Explore API недоступен" }, { status: 200 });
  }

  if (wanted) {
    const sort = allSorts.find((s) => s.sortId === wanted) ?? allSorts[0];
    const games = (sort.games ?? []).slice(0, 60);
    const ids = games.map((g) => g.universeId);
    const [icons, banners] = await Promise.all([iconsFor(ids, cookie), bannersFor(ids, cookie)]);
    return Response.json({
      sorts: allSorts.map((s) => ({ sortId: s.sortId, sortDisplayName: s.sortDisplayName })),
      active: { sortId: sort.sortId, sortDisplayName: sort.sortDisplayName },
      games: games.map((g) => ({
        ...g,
        icon: icons[g.universeId] ?? null,
        banner: banners[g.universeId] ?? null,
      })),
    });
  }

  const selected = allSorts.slice(0, 7);
  const ids = [
    ...new Set(selected.flatMap((s) => (s.games ?? []).slice(0, perSort).map((g) => g.universeId))),
  ];
  const heroIds = (selected[0]?.games ?? []).slice(0, 5).map((g) => g.universeId);
  const [icons, banners] = await Promise.all([iconsFor(ids, cookie), bannersFor(heroIds, cookie)]);

  return Response.json({
    sorts: selected.map((s) => ({
      sortId: s.sortId,
      sortDisplayName: s.sortDisplayName,
      games: (s.games ?? []).slice(0, perSort).map((g) => ({
        ...g,
        icon: icons[g.universeId] ?? null,
        banner: banners[g.universeId] ?? null,
      })),
    })),
    allSorts: allSorts.map((s) => ({ sortId: s.sortId, sortDisplayName: s.sortDisplayName })),
  });
}
