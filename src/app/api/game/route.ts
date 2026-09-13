import { cachedGet } from "@/lib/roblox";
import { getSession } from "@/lib/session";
import { bannersFor, iconsFor } from "@/lib/thumbs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UniverseDetail = {
  id: number;
  rootPlaceId: number;
  name: string;
  description: string;
  sourceName?: string;
  creator?: { id: number; name: string; type: string; hasVerifiedBadge?: boolean };
  price?: number | null;
  playing?: number;
  visits?: number;
  maxPlayers?: number;
  created?: string;
  updated?: string;
  genre?: string;
  favoritedCount?: number;
  isFavoritedByUser?: boolean;
  universeAvatarType?: string;
  allowedGearGenres?: string[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placeIdParam = Number(url.searchParams.get("placeId") ?? "0");
  let universeId = Number(url.searchParams.get("universeId") ?? "0");
  const session = await getSession();
  const cookie = session?.cookie ?? null;

  if (!universeId && placeIdParam) {
    const uni = await cachedGet<{ universeId?: number }>(
      `https://apis.roblox.com/universes/v1/places/${placeIdParam}/universe`,
      cookie,
      600_000,
    );
    universeId = uni.data?.universeId ?? 0;
  }
  if (!universeId) return Response.json({ error: "Не найдена вселенная" }, { status: 404 });

  const [details, votes, media, badges, favoriteCount, socials] = await Promise.all([
    cachedGet<{ data?: UniverseDetail[] }>(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`,
      cookie,
      30_000,
    ),
    cachedGet<{ data?: { id: number; upVotes: number; downVotes: number }[] }>(
      `https://games.roblox.com/v1/games/votes?universeIds=${universeId}`,
      cookie,
      30_000,
    ),
    cachedGet<{ data?: { assetTypeId: number; imageId?: number; videoHash?: string; altText?: string }[] }>(
      `https://games.roblox.com/v2/games/${universeId}/media`,
      cookie,
      300_000,
    ),
    cachedGet<{ data?: { id: number; name: string; description: string; statistics?: { awardedCount?: number; winRatePercentage?: number } }[] }>(
      `https://badges.roblox.com/v1/universes/${universeId}/badges?limit=25&sortOrder=Asc`,
      cookie,
      300_000,
    ),
    cachedGet<{ favoritesCount?: number }>(
      `https://games.roblox.com/v1/games/${universeId}/favorites/count`,
      cookie,
      60_000,
    ),
    cachedGet<{ data?: { type: string; url: string; title: string }[] }>(
      `https://games.roblox.com/v1/games/${universeId}/social-links/list`,
      cookie,
      300_000,
    ),
  ]);

  const detail = details.data?.data?.[0];
  if (!detail) return Response.json({ error: "Игра не найдена" }, { status: 404 });

  const placeId = detail.rootPlaceId || placeIdParam;
  const [icons, banners] = await Promise.all([
    iconsFor([universeId], cookie),
    bannersFor([universeId], cookie),
  ]);

  const mediaImages = (media.data?.data ?? [])
    .filter((m) => m.imageId)
    .slice(0, 8)
    .map((m) => ({
      assetId: m.imageId!,
      url: `https://www.roblox.com/asset-thumbnail/image?assetId=${m.imageId}&width=768&height=432&format=png`,
      alt: m.altText ?? "",
    }));

  let userVote: boolean | null = null;
  let favorited = false;
  if (session) {
    const [voteRes, favRes] = await Promise.all([
      cachedGet<{ userVote?: boolean | null }>(
        `https://games.roblox.com/v1/games/${universeId}/votes/user`,
        cookie,
        20_000,
      ),
      cachedGet<{ isFavorited?: boolean }>(
        `https://games.roblox.com/v1/games/${universeId}/favorites`,
        cookie,
        20_000,
      ),
    ]);
    userVote = voteRes.data?.userVote ?? null;
    favorited = favRes.data?.isFavorited ?? false;
  }

  return Response.json({
    universeId,
    placeId,
    detail,
    votes: votes.data?.data?.[0] ?? null,
    favoritesCount: favoriteCount.data?.favoritesCount ?? detail.favoritedCount ?? null,
    icon: icons[universeId] ?? null,
    banner: banners[universeId] ?? null,
    media: mediaImages,
    badges: badges.data?.data ?? [],
    socials: socials.data?.data ?? [],
    userVote,
    favorited,
    authenticated: Boolean(session),
  });
}
