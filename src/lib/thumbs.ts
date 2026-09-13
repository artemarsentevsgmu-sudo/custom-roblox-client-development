import { cachedGet } from "@/lib/roblox";

export async function iconsFor(
  universeIds: number[],
  cookie: string | null,
): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  if (!universeIds.length) return out;
  const chunks: number[][] = [];
  for (let i = 0; i < universeIds.length; i += 50) chunks.push(universeIds.slice(i, i + 50));
  await Promise.all(
    chunks.map(async (chunk) => {
      const res = await cachedGet<{ data?: { targetId: number; imageUrl?: string }[] }>(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${chunk.join(",")}&size=512x512&format=Png&isCircular=false`,
        cookie,
        300_000,
      );
      for (const item of res.data?.data ?? []) if (item.imageUrl) out[item.targetId] = item.imageUrl;
    }),
  );
  return out;
}

export async function bannersFor(
  universeIds: number[],
  cookie: string | null,
): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  if (!universeIds.length) return out;
  const chunks: number[][] = [];
  for (let i = 0; i < universeIds.length; i += 30) chunks.push(universeIds.slice(i, i + 30));
  await Promise.all(
    chunks.map(async (chunk) => {
      const res = await cachedGet<{
        data?: { universeId: number; thumbnails?: { imageUrl?: string }[] }[];
      }>(
        `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${chunk.join(",")}&size=768x432&format=Png&countPerUniverse=1&defaults=true`,
        cookie,
        300_000,
      );
      for (const item of res.data?.data ?? []) {
        const url = item.thumbnails?.[0]?.imageUrl;
        if (url) out[item.universeId] = url;
      }
    }),
  );
  return out;
}

export async function userAvatars(
  userIds: number[],
  cookie: string | null,
  size = "150x150",
): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  if (!userIds.length) return out;
  const chunks: number[][] = [];
  for (let i = 0; i < userIds.length; i += 80) chunks.push(userIds.slice(i, i + 80));
  await Promise.all(
    chunks.map(async (chunk) => {
      const res = await cachedGet<{ data?: { targetId: number; imageUrl?: string }[] }>(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${chunk.join(",")}&size=${size}&format=Png&isCircular=false`,
        cookie,
        300_000,
      );
      for (const item of res.data?.data ?? []) if (item.imageUrl) out[item.targetId] = item.imageUrl;
    }),
  );
  return out;
}
