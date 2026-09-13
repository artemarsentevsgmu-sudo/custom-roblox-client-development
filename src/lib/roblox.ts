import crypto from "node:crypto";

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 RobloxNova/1.0";

const ALLOWED_HOST_SUFFIX = ".roblox.com";

export function isAllowedHost(host: string): boolean {
  return (
    host === "roblox.com" ||
    (host.endsWith(ALLOWED_HOST_SUFFIX) && !host.includes("/") && !host.includes(":"))
  );
}

type FetchOpts = {
  method?: string;
  body?: unknown;
  cookie?: string | null;
  csrf?: string | null;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type RbxResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  text: string;
  headers: Headers;
  setCookies: string[];
};

const csrfCache = new Map<string, { token: string; at: number }>();
const getCache = new Map<string, { at: number; payload: RbxResponse }>();

function cookieKey(cookie?: string | null) {
  return cookie ? crypto.createHash("sha1").update(cookie).digest("hex") : "anon";
}

export async function rawFetch(url: string, opts: FetchOpts = {}): Promise<RbxResponse> {
  const { method = "GET", body, cookie, csrf, headers = {}, timeoutMs = 15000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const finalHeaders: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://www.roblox.com",
    Referer: "https://www.roblox.com/",
    ...headers,
  };
  if (cookie) finalHeaders["Cookie"] = `.ROBLOSECURITY=${cookie}`;
  if (csrf) finalHeaders["X-CSRF-TOKEN"] = csrf;
  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (typeof body === "string") {
      payload = body;
      finalHeaders["Content-Type"] ??= "application/json";
    } else {
      payload = JSON.stringify(body);
      finalHeaders["Content-Type"] = "application/json";
    }
  } else if (method !== "GET" && method !== "HEAD") {
    payload = "{}";
    finalHeaders["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    let setCookies: string[] = [];
    try {
      setCookies = res.headers.getSetCookie?.() ?? [];
    } catch {
      const single = res.headers.get("set-cookie");
      setCookies = single ? [single] : [];
    }
    return { ok: res.ok, status: res.status, data, text, headers: res.headers, setCookies };
  } catch (err) {
    return {
      ok: false,
      status: 599,
      data: { errors: [{ message: (err as Error).message || "network error" }] },
      text: "",
      headers: new Headers(),
      setCookies: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getCsrfToken(cookie?: string | null, force = false): Promise<string> {
  const key = cookieKey(cookie);
  const hit = csrfCache.get(key);
  if (!force && hit && Date.now() - hit.at < 4 * 60_000) return hit.token;
  const res = await rawFetch("https://auth.roblox.com/v2/login", {
    method: "POST",
    body: {},
    cookie,
  });
  const token = res.headers.get("x-csrf-token") ?? "";
  if (token) csrfCache.set(key, { token, at: Date.now() });
  return token;
}

/** Roblox-aware fetch: injects CSRF for mutations and retries once on token rotation. */
export async function rbx<T = unknown>(
  url: string,
  opts: FetchOpts = {},
): Promise<RbxResponse<T>> {
  const method = (opts.method ?? "GET").toUpperCase();
  let csrf = opts.csrf ?? null;
  if (!csrf && method !== "GET" && method !== "HEAD") {
    csrf = await getCsrfToken(opts.cookie);
  }
  let res = await rawFetch(url, { ...opts, method, csrf });
  if (res.status === 403) {
    const rotated = res.headers.get("x-csrf-token");
    if (rotated && rotated !== csrf) {
      csrfCache.set(cookieKey(opts.cookie), { token: rotated, at: Date.now() });
      res = await rawFetch(url, { ...opts, method, csrf: rotated });
    }
  }
  return res as RbxResponse<T>;
}

export async function cachedGet<T = unknown>(
  url: string,
  cookie?: string | null,
  ttlMs = 20_000,
): Promise<RbxResponse<T>> {
  const key = `${cookieKey(cookie)}|${url}`;
  const hit = getCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.payload as RbxResponse<T>;
  const res = await rbx<T>(url, { cookie });
  if (res.ok) {
    getCache.set(key, { at: Date.now(), payload: res });
    if (getCache.size > 700) {
      const oldest = [...getCache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 250);
      for (const [k] of oldest) getCache.delete(k);
    }
  }
  return res;
}

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

export type AuthUser = { id: number; name: string; displayName: string };

export type LoginOutcome =
  | { kind: "success"; cookie: string; user: AuthUser }
  | {
      kind: "twostep";
      challengeId: string;
      innerChallengeId: string;
      userId: number;
      mediaType: string;
    }
  | { kind: "captcha"; message: string }
  | { kind: "error"; message: string; status: number };

function extractSecurityCookie(setCookies: string[]): string | null {
  for (const raw of setCookies) {
    const match = /\.ROBLOSECURITY=([^;]+)/.exec(raw);
    if (match && match[1] && match[1] !== "" && !/^\s*$/.test(match[1])) {
      const value = match[1].trim();
      if (value.length > 40) return value;
    }
  }
  return null;
}

function errMessage(data: unknown, fallback: string): string {
  const errors = (data as { errors?: { message?: string; userFacingMessage?: string }[] })?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors[0].userFacingMessage || errors[0].message || fallback;
  }
  return fallback;
}

export async function validateCookie(cookie: string): Promise<AuthUser | null> {
  const res = await rbx<AuthUser>("https://users.roblox.com/v1/users/authenticated", { cookie });
  if (res.ok && res.data && typeof res.data.id === "number") return res.data;
  return null;
}

type ChallengeHeaders = { id: string; type: string; metadata: string } | null;

function readChallenge(res: RbxResponse): ChallengeHeaders {
  const id = res.headers.get("rblx-challenge-id");
  const type = res.headers.get("rblx-challenge-type");
  const metadata = res.headers.get("rblx-challenge-metadata");
  if (id && type) return { id, type, metadata: metadata ?? "" };
  return null;
}

function decodeMetadata(metadata: string): Record<string, unknown> {
  if (!metadata) return {};
  try {
    return JSON.parse(Buffer.from(metadata, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

export async function loginWithPassword(
  cvalue: string,
  password: string,
  challenge?: { id: string; metadata: string },
): Promise<LoginOutcome> {
  const csrf = await getCsrfToken(null, true);
  const headers: Record<string, string> = {};
  if (challenge) {
    headers["rblx-challenge-id"] = challenge.id;
    headers["rblx-challenge-type"] = "twostepverification";
    headers["rblx-challenge-metadata"] = challenge.metadata;
  }
  const ctype = /^\+?\d[\d\s\-()]{6,}$/.test(cvalue.trim())
    ? "PhoneNumber"
    : cvalue.includes("@")
      ? "Email"
      : "Username";

  const res = await rbx<{ user?: AuthUser; twoStepVerificationData?: { mediaType?: string; ticket?: string } }>(
    "https://auth.roblox.com/v2/login",
    { method: "POST", body: { ctype, cvalue: cvalue.trim(), password }, csrf },
  );

  if (res.ok) {
    const twoStep = res.data?.twoStepVerificationData;
    if (twoStep?.ticket) {
      return {
        kind: "twostep",
        challengeId: "",
        innerChallengeId: twoStep.ticket,
        userId: res.data?.user?.id ?? 0,
        mediaType: (twoStep.mediaType ?? "Authenticator").toLowerCase(),
      };
    }
    const cookie = extractSecurityCookie(res.setCookies);
    if (cookie) {
      const user = res.data?.user ?? (await validateCookie(cookie));
      if (user) return { kind: "success", cookie, user };
      return { kind: "error", message: "Не удалось подтвердить сессию Roblox", status: 500 };
    }
    return { kind: "error", message: "Roblox не вернул cookie сессии", status: 500 };
  }

  const ch = readChallenge(res);
  if (ch) {
    const meta = decodeMetadata(ch.metadata);
    if (ch.type.toLowerCase().includes("twostep")) {
      return {
        kind: "twostep",
        challengeId: ch.id,
        innerChallengeId: String(meta.challengeId ?? ""),
        userId: Number(meta.userId ?? 0),
        mediaType: String(meta.mediaType ?? "authenticator").toLowerCase(),
      };
    }
    if (ch.type.toLowerCase().includes("captcha")) {
      return {
        kind: "captcha",
        message:
          "Roblox запросил капчу для этого входа. Используйте вход по .ROBLOSECURITY cookie — это безопаснее и не требует капчи.",
      };
    }
    return {
      kind: "error",
      message: `Roblox запросил дополнительную проверку: ${ch.type}. Войдите по cookie.`,
      status: 403,
    };
  }

  if (res.status === 429) {
    return { kind: "error", message: "Слишком много попыток входа. Подождите пару минут.", status: 429 };
  }
  return {
    kind: "error",
    message: errMessage(res.data, "Неверный логин или пароль"),
    status: res.status,
  };
}

/** Media types supported by the Roblox two-step verification service. */
export const TWO_STEP_MEDIA = ["authenticator", "email", "sms", "recoveryCode"] as const;

export async function verifyTwoStep(params: {
  userId: number;
  innerChallengeId: string;
  code: string;
  mediaType: string;
}): Promise<{ ok: true; verificationToken: string } | { ok: false; message: string }> {
  const media = TWO_STEP_MEDIA.includes(params.mediaType as (typeof TWO_STEP_MEDIA)[number])
    ? params.mediaType
    : "authenticator";
  const res = await rbx<{ verificationToken?: string }>(
    `https://twostepverification.roblox.com/v1/users/${params.userId}/challenges/${media}/verify`,
    {
      method: "POST",
      body: {
        challengeId: params.innerChallengeId,
        actionType: "Login",
        code: params.code.replace(/\s+/g, ""),
      },
    },
  );
  if (res.ok && res.data?.verificationToken) {
    return { ok: true, verificationToken: res.data.verificationToken };
  }
  return { ok: false, message: errMessage(res.data, "Неверный код подтверждения") };
}

export async function continueChallenge(params: {
  challengeId: string;
  innerChallengeId: string;
  verificationToken: string;
}): Promise<string> {
  const metadata = JSON.stringify({
    verificationToken: params.verificationToken,
    rememberDevice: false,
    challengeId: params.innerChallengeId,
    actionType: "Login",
  });
  await rbx("https://auth.roblox.com/v3/challenges/continue", {
    method: "POST",
    body: {
      challengeId: params.challengeId,
      challengeMetadata: metadata,
      challengeType: "twostepverification",
    },
  });
  return Buffer.from(metadata, "utf8").toString("base64");
}

/* ------------------------------------------------------------------ */
/* Launcher specific helpers                                           */
/* ------------------------------------------------------------------ */

export async function getAuthTicket(cookie: string): Promise<string | null> {
  const csrf = await getCsrfToken(cookie, true);
  const res = await rawFetch("https://auth.roblox.com/v1/authentication-ticket", {
    method: "POST",
    cookie,
    csrf,
    headers: { Referer: "https://www.roblox.com/games/606849621/" },
  });
  return res.headers.get("rbx-authentication-ticket");
}

export type ServerHostInfo = {
  ok: boolean;
  address?: string;
  port?: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  datacenter?: string;
  lat?: number;
  lon?: number;
  message?: string;
};

const geoCache = new Map<string, ServerHostInfo>();

export async function resolveServerHost(
  cookie: string,
  placeId: number,
  gameId: string,
): Promise<ServerHostInfo> {
  const csrf = await getCsrfToken(cookie);
  const res = await rbx<{
    joinScript?: { UdmuxEndpoints?: { Address: string; Port: number }[]; MachineAddress?: string; ServerPort?: number };
    status?: number;
    message?: string;
  }>("https://gamejoin.roblox.com/v1/join-game-instance", {
    method: "POST",
    cookie,
    csrf,
    body: { placeId, isTeleport: false, gameId, gameJoinAttemptId: gameId },
    headers: { Referer: `https://www.roblox.com/games/${placeId}/` },
  });
  const join = res.data?.joinScript;
  const address = join?.UdmuxEndpoints?.[0]?.Address ?? join?.MachineAddress;
  const port = join?.UdmuxEndpoints?.[0]?.Port ?? join?.ServerPort;
  if (!address) {
    return {
      ok: false,
      message:
        res.data?.message ??
        "Roblox не выдал адрес сервера (нужна авторизация и доступ к игре)",
    };
  }
  const cached = geoCache.get(address);
  if (cached) return { ...cached, port };
  const geoRes = await rawFetch(
    `http://ip-api.com/json/${address}?fields=status,country,countryCode,regionName,city,isp,org,lat,lon`,
    { timeoutMs: 6000 },
  );
  const geo = geoRes.data as {
    status?: string;
    country?: string;
    countryCode?: string;
    regionName?: string;
    city?: string;
    isp?: string;
    org?: string;
    lat?: number;
    lon?: number;
  } | null;
  const info: ServerHostInfo = {
    ok: true,
    address,
    port,
    city: geo?.city,
    region: geo?.regionName,
    country: geo?.country,
    countryCode: geo?.countryCode,
    isp: geo?.isp,
    datacenter: geo?.org || geo?.isp,
    lat: geo?.lat,
    lon: geo?.lon,
  };
  geoCache.set(address, info);
  return info;
}

export function buildDeepLink(placeId: number, ticket: string | null, gameId?: string | null) {
  const launchTime = Date.now();
  const placeLauncherUrl = gameId
    ? `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGameJob&browserTrackerId=0&placeId=${placeId}&gameId=${gameId}&isPlayTogetherGame=false`
    : `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&browserTrackerId=0&placeId=${placeId}&isPlayTogetherGame=false`;
  if (!ticket) {
    return gameId
      ? `roblox://experiences/start?placeId=${placeId}&gameInstanceId=${gameId}`
      : `roblox://experiences/start?placeId=${placeId}`;
  }
  return [
    "roblox-player:1",
    "launchmode:play",
    `gameinfo:${ticket}`,
    `launchtime:${launchTime}`,
    `placelauncherurl:${encodeURIComponent(placeLauncherUrl)}`,
    "browsertrackerid:0",
    "robloxLocale:ru_ru",
    "gameLocale:en_us",
    "channel:",
  ].join("+");
}
