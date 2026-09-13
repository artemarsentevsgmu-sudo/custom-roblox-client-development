import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { decryptSecret, encryptSecret, randomId } from "@/lib/crypto";
import type { AuthUser } from "@/lib/roblox";

export const SESSION_COOKIE = "nova_sid";

export type LauncherSession = {
  id: string;
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  cookie: string;
  loginMethod: string;
};

export async function createSession(
  user: AuthUser,
  robloxCookie: string,
  loginMethod: string,
  avatarUrl?: string | null,
): Promise<string> {
  const id = randomId(32);
  await db.insert(sessions).values({
    id,
    robloxUserId: user.id,
    username: user.name,
    displayName: user.displayName || user.name,
    avatarUrl: avatarUrl ?? null,
    cookieEnc: encryptSecret(robloxCookie),
    loginMethod,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

export async function getSession(): Promise<LauncherSession | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  try {
    const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      userId: row.robloxUserId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      cookie: decryptSecret(row.cookieEnc),
      loginMethod: row.loginMethod,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) {
    try {
      await db.delete(sessions).where(eq(sessions.id, id));
    } catch {
      /* ignore */
    }
  }
  jar.delete(SESSION_COOKIE);
}
