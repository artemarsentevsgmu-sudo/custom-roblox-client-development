import { resolveServerHost } from "@/lib/roblox";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Resolves the real machine address + datacenter/geo of a Roblox game server. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { ok: false, message: "Войдите в аккаунт, чтобы видеть хост сервера" },
      { status: 401 },
    );
  }
  let body: { placeId?: number; gameId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, message: "bad json" }, { status: 400 });
  }
  const placeId = Number(body.placeId ?? 0);
  const gameId = String(body.gameId ?? "");
  if (!placeId || !gameId) {
    return Response.json({ ok: false, message: "placeId и gameId обязательны" }, { status: 400 });
  }
  const info = await resolveServerHost(session.cookie, placeId, gameId);
  return Response.json(info, { status: info.ok ? 200 : 200 });
}
