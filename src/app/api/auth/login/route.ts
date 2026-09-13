import { db } from "@/db";
import { loginChallenges } from "@/db/schema";
import { encryptSecret, randomId } from "@/lib/crypto";
import { cachedGet, loginWithPassword, validateCookie } from "@/lib/roblox";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function headshot(userId: number): Promise<string | null> {
  const res = await cachedGet<{ data?: { imageUrl?: string }[] }>(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
    null,
    60_000,
  );
  return res.data?.data?.[0]?.imageUrl ?? null;
}

export async function POST(request: Request) {
  let body: { mode?: string; identifier?: string; password?: string; cookie?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const mode = body.mode === "cookie" ? "cookie" : "password";

  if (mode === "cookie") {
    const raw = (body.cookie ?? "").trim().replace(/^\.ROBLOSECURITY=/, "");
    if (raw.length < 50) {
      return Response.json({ error: "Cookie .ROBLOSECURITY выглядит слишком коротким" }, { status: 400 });
    }
    const user = await validateCookie(raw);
    if (!user) {
      return Response.json(
        { error: "Cookie недействителен или истёк. Скопируйте его заново из браузера." },
        { status: 401 },
      );
    }
    const avatar = await headshot(user.id);
    await createSession(user, raw, "cookie", avatar);
    return Response.json({ status: "ok", user: { ...user, avatarUrl: avatar } });
  }

  const identifier = (body.identifier ?? "").trim();
  const password = body.password ?? "";
  if (!identifier || !password) {
    return Response.json({ error: "Введите логин и пароль" }, { status: 400 });
  }

  const outcome = await loginWithPassword(identifier, password);

  if (outcome.kind === "success") {
    const avatar = await headshot(outcome.user.id);
    await createSession(outcome.user, outcome.cookie, "password", avatar);
    return Response.json({ status: "ok", user: { ...outcome.user, avatarUrl: avatar } });
  }

  if (outcome.kind === "twostep") {
    const id = randomId(24);
    await db.insert(loginChallenges).values({
      id,
      cvalue: identifier,
      passwordEnc: encryptSecret(password),
      challengeId: outcome.challengeId,
      innerChallengeId: outcome.innerChallengeId,
      robloxUserId: outcome.userId,
      mediaType: outcome.mediaType,
    });
    return Response.json({
      status: "2fa",
      challengeToken: id,
      mediaType: outcome.mediaType,
      userId: outcome.userId,
    });
  }

  if (outcome.kind === "captcha") {
    return Response.json({ error: outcome.message, code: "captcha" }, { status: 403 });
  }

  return Response.json({ error: outcome.message }, { status: outcome.status || 400 });
}
