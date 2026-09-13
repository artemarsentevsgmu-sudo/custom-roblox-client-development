import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loginChallenges } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { cachedGet, continueChallenge, loginWithPassword, verifyTwoStep } from "@/lib/roblox";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { challengeToken?: string; code?: string; mediaType?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const token = body.challengeToken ?? "";
  const code = (body.code ?? "").replace(/\s+/g, "");
  if (!token || code.length < 4) {
    return Response.json({ error: "Введите код из приложения или письма" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(loginChallenges)
    .where(eq(loginChallenges.id, token))
    .limit(1);
  const challenge = rows[0];
  if (!challenge) {
    return Response.json({ error: "Сессия проверки истекла, войдите заново" }, { status: 410 });
  }
  if (Date.now() - challenge.createdAt.getTime() > 10 * 60_000) {
    await db.delete(loginChallenges).where(eq(loginChallenges.id, token));
    return Response.json({ error: "Код действителен 10 минут. Попробуйте войти снова." }, { status: 410 });
  }

  const mediaType = body.mediaType || challenge.mediaType || "authenticator";
  const verified = await verifyTwoStep({
    userId: challenge.robloxUserId ?? 0,
    innerChallengeId: challenge.innerChallengeId ?? "",
    code,
    mediaType,
  });
  if (!verified.ok) {
    return Response.json({ error: verified.message }, { status: 400 });
  }

  const metadataB64 = await continueChallenge({
    challengeId: challenge.challengeId || "",
    innerChallengeId: challenge.innerChallengeId ?? "",
    verificationToken: verified.verificationToken,
  });

  const password = decryptSecret(challenge.passwordEnc);
  let outcome = await loginWithPassword(challenge.cvalue, password, {
    id: challenge.challengeId || "",
    metadata: metadataB64,
  });

  if (outcome.kind !== "success") {
    // Some Roblox edges expect the raw JSON metadata instead of base64.
    outcome = await loginWithPassword(challenge.cvalue, password, {
      id: challenge.challengeId || "",
      metadata: Buffer.from(metadataB64, "base64").toString("utf8"),
    });
  }

  await db.delete(loginChallenges).where(eq(loginChallenges.id, token));

  if (outcome.kind === "success") {
    const thumb = await cachedGet<{ data?: { imageUrl?: string }[] }>(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${outcome.user.id}&size=150x150&format=Png&isCircular=false`,
      null,
      60_000,
    );
    const avatar = thumb.data?.data?.[0]?.imageUrl ?? null;
    await createSession(outcome.user, outcome.cookie, "password+2fa", avatar);
    return Response.json({ status: "ok", user: { ...outcome.user, avatarUrl: avatar } });
  }

  return Response.json(
    {
      error:
        outcome.kind === "error"
          ? outcome.message
          : "Roblox запросил дополнительную проверку. Попробуйте вход по cookie.",
    },
    { status: 400 },
  );
}
