/** Legacy Roblox redirect endpoints — handy when a batch thumbnail call is overkill. */
export function userAvatarUrl(userId?: number | null, size = 150): string | undefined {
  if (!userId) return undefined;
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=${size}&height=${size}&format=png`;
}

export function assetThumbUrl(assetId?: number | null, size = 150): string | undefined {
  if (!assetId) return undefined;
  return `https://www.roblox.com/asset-thumbnail/image?assetId=${assetId}&width=${size}&height=${size}&format=png`;
}
