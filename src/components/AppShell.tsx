"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Icon, type IconName } from "@/components/Icons";
import { LoginDialog } from "@/components/LoginDialog";
import { useSession } from "@/components/SessionProvider";
import { Avatar, Robux, Spinner } from "@/components/ui";
import { compact, fetcher, presenceOf } from "@/lib/client";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/discover", label: "Каталог игр", icon: "compass" },
  { href: "/servers", label: "Серверы", icon: "server" },
  { href: "/friends", label: "Друзья", icon: "users" },
  { href: "/groups", label: "Группы", icon: "flag" },
  { href: "/avatar", label: "Аватар", icon: "shirt" },
  { href: "/catalog", label: "Каталог", icon: "star" },
  { href: "/inventory", label: "Инвентарь", icon: "box" },
  { href: "/robux", label: "Robux", icon: "coin" },
  { href: "/messages", label: "Сообщения", icon: "mail" },
  { href: "/settings", label: "Настройки", icon: "gear" },
];

type SearchResults = {
  games: { universeId: number; rootPlaceId: number; name: string; playerCount: number; icon: string | null }[];
  users: { id: number; name: string; displayName: string; avatar: string | null }[];
  groups: { id: number; name: string; memberCount: number; icon: string | null }[];
};

function SearchBar() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isLoading } = useSWR<SearchResults>(
    debounced.length > 1 ? `/api/search?q=${encodeURIComponent(debounced)}` : null,
    fetcher,
  );

  const hasResults =
    !!data && (data.games.length > 0 || data.users.length > 0 || data.groups.length > 0);

  return (
    <div ref={box} className="relative flex-1 max-w-xl">
      <div className="relative">
        <Icon name="search" className="muted absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          placeholder="Поиск игр, игроков и групп…"
          className="input pl-10 pr-10"
        />
        {isLoading ? (
          <Spinner className="muted absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        ) : null}
      </div>
      {open && debounced.length > 1 ? (
        <div className="panel pop absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto p-2">
          {!hasResults && !isLoading ? (
            <div className="muted px-3 py-6 text-center text-sm">Ничего не найдено</div>
          ) : null}
          {data?.games?.length ? (
            <div className="mb-1">
              <div className="muted px-3 py-1.5 text-[11px] font-bold uppercase">Игры</div>
              {data.games.slice(0, 6).map((g) => (
                <button
                  key={g.universeId}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/game/${g.rootPlaceId}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/6"
                >
                  <Avatar src={g.icon} alt={g.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{g.name}</span>
                    <span className="muted block text-xs">{compact(g.playerCount)} играют</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {data?.users?.length ? (
            <div className="mb-1">
              <div className="muted px-3 py-1.5 text-[11px] font-bold uppercase">Игроки</div>
              {data.users.slice(0, 4).map((u) => (
                <Link
                  key={u.id}
                  href={`/users/${u.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/6"
                >
                  <Avatar src={u.avatar} alt={u.name} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {u.displayName}
                    </span>
                    <span className="muted block text-xs">@{u.name}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
          {data?.groups?.length ? (
            <div>
              <div className="muted px-3 py-1.5 text-[11px] font-bold uppercase">Группы</div>
              {data.groups.slice(0, 4).map((g) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/6"
                >
                  <Avatar src={g.icon} alt={g.name} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{g.name}</span>
                    <span className="muted block text-xs">{compact(g.memberCount)} участников</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UserMenu() {
  const { me, openLogin, logout, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!me?.authenticated) {
    return (
      <button className="btn btn-primary" onClick={openLogin}>
        <Icon name="shield" className="h-4 w-4" />
        Войти
      </button>
    );
  }

  const presence = presenceOf(me.presence?.userPresenceType);

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 transition hover:border-white/25"
      >
        <div className="relative">
          <Avatar src={me.user?.avatarUrl} alt={me.user?.name ?? "me"} size={32} />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0e1b]"
            style={{ background: presence.color }}
          />
        </div>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-bold leading-tight text-white">
            {me.user?.displayName}
          </span>
          <span className="muted block text-[10px] leading-tight">{presence.label}</span>
        </span>
      </button>
      {open ? (
        <div className="panel pop absolute right-0 top-12 z-50 w-60 p-2">
          <div className="px-3 py-2">
            <div className="text-sm font-bold text-white">{me.user?.displayName}</div>
            <div className="muted text-xs">@{me.user?.name}</div>
            {me.user?.isPremium ? (
              <span className="chip mt-2 border-amber-300/30 bg-amber-400/15 text-amber-200">
                ⭐ Premium
              </span>
            ) : null}
          </div>
          <div className="my-1 h-px bg-white/10" />
          <Link
            href={`/users/${me.user?.id}`}
            onClick={() => setOpen(false)}
            className="nav-item text-sm"
          >
            <Icon name="users" className="h-4 w-4" /> Мой профиль
          </Link>
          <Link href="/settings" onClick={() => setOpen(false)} className="nav-item text-sm">
            <Icon name="gear" className="h-4 w-4" /> Настройки
          </Link>
          <button
            onClick={() => {
              refresh();
              setOpen(false);
            }}
            className="nav-item w-full text-sm"
          >
            <Icon name="refresh" className="h-4 w-4" /> Обновить данные
          </button>
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
            className="nav-item w-full text-sm text-rose-300 hover:text-rose-200"
          >
            <Icon name="logout" className="h-4 w-4" /> Выйти
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, openLogin } = useSession();
  const robux = me?.stats?.robux;

  return (
    <div className="min-h-screen">
      <div className="aurora">
        <div className="aurora-mint" />
      </div>

      {/* sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[78px] flex-col border-r border-white/8 bg-[#080a14]/80 px-3 py-4 backdrop-blur-xl md:flex xl:w-[248px]">
        <Link href="/" className="mb-6 flex items-center gap-3 px-1.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white"
            style={{ background: "linear-gradient(135deg,#7c5cff,#ff5c8a)" }}
          >
            N
          </span>
          <span className="hidden xl:block">
            <span className="block text-sm font-black leading-tight text-white">NOVA</span>
            <span className="muted block text-[10px] leading-tight">Roblox launcher</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item justify-center xl:justify-start ${active ? "nav-active" : ""}`}
                title={item.label}
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                <span className="hidden xl:block">{item.label}</span>
                {item.href === "/messages" && me?.stats?.unreadMessages ? (
                  <span className="ml-auto hidden rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white xl:block">
                    {me.stats.unreadMessages}
                  </span>
                ) : null}
                {item.href === "/friends" && me?.stats?.friendRequests ? (
                  <span className="ml-auto hidden rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white xl:block">
                    {me.stats.friendRequests}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/5 p-3 xl:block">
          <div className="text-xs font-bold text-white">Nova Launcher 1.0</div>
          <p className="muted mt-1 text-[11px] leading-snug">
            Хост серверов, регионы, пинг и группы — всё в одном месте.
          </p>
        </div>
      </aside>

      {/* topbar */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#05060d]/70 backdrop-blur-xl md:pl-[78px] xl:pl-[248px]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/" className="md:hidden">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-black text-white"
              style={{ background: "linear-gradient(135deg,#7c5cff,#ff5c8a)" }}
            >
              N
            </span>
          </Link>
          <SearchBar />
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => (me?.authenticated ? undefined : openLogin())}
              className="hidden items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200 transition hover:border-amber-300/50 sm:flex"
              title="Баланс Robux"
            >
              <Robux className="h-4 w-4" />
              {me?.authenticated ? (robux === null || robux === undefined ? "—" : compact(robux)) : "—"}
            </button>
            <Link
              href="/messages"
              className="relative hidden rounded-2xl border border-white/10 bg-white/5 p-2.5 transition hover:border-white/25 sm:block"
            >
              <Icon name="mail" className="h-4 w-4" />
              {me?.stats?.unreadMessages ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold">
                  {me.stats.unreadMessages}
                </span>
              ) : null}
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="px-4 pb-28 pt-5 md:pl-[94px] md:pr-6 xl:pl-[264px]">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>

      {/* mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-white/10 bg-[#080a14]/95 px-2 py-2 backdrop-blur-xl md:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] ${
                active ? "text-white" : "muted"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <LoginDialog />
    </div>
  );
}
