import { cachedGet, isAllowedHost, rbx } from "@/lib/roblox";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DENY = [/auth\.roblox\.com\/v2\/logout/i, /accountsettings\.roblox\.com\/v1\/email/i];

/**
 * Universal Roblox API proxy.
 *   GET  /api/rbx?p=games.roblox.com/v1/games?universeIds=1&__ttl=30000
 *   POST /api/rbx   { "p": "thumbnails.roblox.com/v1/batch", "body": [...] }
 * Requests are signed with the stored .ROBLOSECURITY cookie of the active session,
 * so the browser never sees the credential.
 */
function toUrl(target: string): string | null {
  const clean = target.replace(/^https?:\/\//i, "").replace(/^\/+/, "");
  const host = clean.split("/")[0]?.split("?")[0] ?? "";
  if (!isAllowedHost(host)) return null;
  const url = `https://${clean}`;
  if (DENY.some((re) => re.test(url))) return null;
  return url;
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const target = incoming.searchParams.get("p");
  const ttlParam = Number(incoming.searchParams.get("__ttl") ?? "15000");
  if (!target) return Response.json({ error: "missing p" }, { status: 400 });
  const url = toUrl(target);
  if (!url) return Response.json({ error: "Host not allowed" }, { status: 400 });
  const session = await getSession();
  const res = await cachedGet(url, session?.cookie ?? null, Number.isFinite(ttlParam) ? ttlParam : 15000);
  return Response.json(res.data ?? { errors: [{ message: res.text.slice(0, 300) }] }, {
    status: res.status === 599 ? 502 : res.status,
  });
}

export async function POST(request: Request) {
  let payload: { p?: string; body?: unknown; method?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  if (!payload.p) return Response.json({ error: "missing p" }, { status: 400 });
  const url = toUrl(payload.p);
  if (!url) return Response.json({ error: "Host not allowed" }, { status: 400 });
  const session = await getSession();
  const res = await rbx(url, {
    method: (payload.method ?? "POST").toUpperCase(),
    body: payload.body ?? {},
    cookie: session?.cookie ?? null,
  });
  return Response.json(res.data ?? { errors: [{ message: res.text.slice(0, 300) }] }, {
    status: res.status === 599 ? 502 : res.status,
  });
}
