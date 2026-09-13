import { cachedGet, rbx } from "@/lib/roblox";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Item = {
  id: number;
  itemType: string;
  assetType?: number;
  bundleType?: number;
  name: string;
  description?: string;
  price?: number | null;
  lowestPrice?: number | null;
  premiumPricing?: { premiumDiscountPercentage: number; premiumPriceInRobux: number } | null;
  productId?: number;
  creatorName?: string;
  creatorTargetId?: number;
  creatorHasVerifiedBadge?: boolean;
  itemRestrictions?: string[];
  purchaseCount?: number;
  favoriteCount?: number;
  unitsAvailableForConsumption?: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q") ?? "";
  const category = url.searchParams.get("category") ?? "1";
  const subcategory = url.searchParams.get("subcategory") ?? "";
  const sortType = url.searchParams.get("sort") ?? "0";
  const session = await getSession();
  const cookie = session?.cookie ?? null;

  const params = new URLSearchParams({
    Category: category,
    Limit: "30",
    SortType: sortType,
  });
  if (keyword) params.set("Keyword", keyword);
  if (subcategory) params.set("Subcategory", subcategory);

  const search = await cachedGet<{ data?: Item[]; nextPageCursor?: string | null }>(
    `https://catalog.roblox.com/v1/search/items/details?${params.toString()}`,
    cookie,
    30_000,
  );

  const items = search.data?.data ?? [];
  const assetIds = items.filter((i) => i.itemType === "Asset").map((i) => i.id);
  const bundleIds = items.filter((i) => i.itemType === "Bundle").map((i) => i.id);

  const [assetThumbs, bundleThumbs] = await Promise.all([
    assetIds.length
      ? cachedGet<{ data?: { targetId: number; imageUrl?: string }[] }>(
          `https://thumbnails.roblox.com/v1/assets?assetIds=${assetIds.join(",")}&size=420x420&format=Png&isCircular=false`,
          cookie,
          300_000,
        )
      : Promise.resolve({ data: null } as { data: { data?: { targetId: number; imageUrl?: string }[] } | null }),
    bundleIds.length
      ? cachedGet<{ data?: { targetId: number; imageUrl?: string }[] }>(
          `https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds=${bundleIds.join(",")}&size=420x420&format=Png&isCircular=false`,
          cookie,
          300_000,
        )
      : Promise.resolve({ data: null } as { data: { data?: { targetId: number; imageUrl?: string }[] } | null }),
  ]);

  const thumbs: Record<string, string> = {};
  for (const t of assetThumbs.data?.data ?? []) if (t.imageUrl) thumbs[`A${t.targetId}`] = t.imageUrl;
  for (const t of bundleThumbs.data?.data ?? []) if (t.imageUrl) thumbs[`B${t.targetId}`] = t.imageUrl;

  return Response.json({
    items: items.map((i) => ({
      ...i,
      thumb: thumbs[`${i.itemType === "Bundle" ? "B" : "A"}${i.id}`] ?? null,
    })),
    authenticated: Boolean(session),
  });
}

/** Real purchase through the Roblox economy API. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Нужна авторизация" }, { status: 401 });
  let body: { productId?: number; price?: number; sellerId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.productId) return Response.json({ error: "productId required" }, { status: 400 });
  const res = await rbx<{ purchased?: boolean; reason?: string; errorMsg?: string }>(
    `https://economy.roblox.com/v1/purchases/products/${body.productId}`,
    {
      method: "POST",
      cookie: session.cookie,
      body: {
        expectedCurrency: 1,
        expectedPrice: body.price ?? 0,
        expectedSellerId: body.sellerId,
      },
    },
  );
  return Response.json(
    {
      purchased: res.data?.purchased ?? false,
      reason: res.data?.reason ?? res.data?.errorMsg ?? null,
    },
    { status: res.ok ? 200 : res.status },
  );
}
