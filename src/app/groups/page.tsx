"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "@/components/SessionProvider";
import { Avatar, EmptyState, SectionHeader, Skeleton } from "@/components/ui";
import { compact, fetcher } from "@/lib/client";

type MyGroups = {
  authenticated: boolean;
  groups: {
    id: number;
    name: string;
    memberCount: number;
    hasVerifiedBadge: boolean;
    owner: string | null;
    shout: string | null;
    role: { id: number; name: string; rank: number };
    icon: string | null;
  }[];
};

type SearchPayload = {
  groups: { id: number; name: string; memberCount: number; description?: string; icon: string | null }[];
};

export default function GroupsPage() {
  const { me, openLogin } = useSession();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isLoading } = useSWR<MyGroups>(
    me?.authenticated ? "/api/groups" : null,
    fetcher,
  );
  const { data: search } = useSWR<SearchPayload>(
    submitted ? `/api/search?q=${encodeURIComponent(submitted)}` : null,
    fetcher,
  );

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <SectionHeader
          title="Группы Roblox"
          subtitle="Ваши сообщества, роли, ранги, казна и стена группы"
        />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(q.trim());
          }}
        >
          <input
            className="input flex-1"
            placeholder="Поиск групп по названию…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Найти
          </button>
        </form>
      </div>

      {submitted && search?.groups?.length ? (
        <section>
          <h2 className="section-title mb-3">Результаты поиска</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {search.groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`} className="panel hoverable flex gap-3 p-4">
                <Avatar src={g.icon} alt={g.name} size={48} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{g.name}</div>
                  <div className="muted text-xs">{compact(g.memberCount)} участников</div>
                  <p className="muted mt-1 line-clamp-2 text-[11px]">{g.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!me?.authenticated ? (
        <EmptyState
          emoji="🏳️"
          title="Войдите, чтобы увидеть свои группы"
          hint="Роли, ранги, казна группы, стена и игры сообщества."
          action={
            <button className="btn btn-primary mt-3" onClick={openLogin}>
              Войти
            </button>
          }
        />
      ) : null}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : null}

      {data?.groups?.length ? (
        <section>
          <h2 className="section-title mb-3">Мои группы · {data.groups.length}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`} className="panel hoverable p-4">
                <div className="flex gap-3">
                  <Avatar src={g.icon} alt={g.name} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">
                      {g.name} {g.hasVerifiedBadge ? "☑️" : ""}
                    </div>
                    <div className="muted text-xs">{compact(g.memberCount)} участников</div>
                    <span className="chip mt-1.5 border-violet-400/30 bg-violet-500/15 text-violet-200">
                      {g.role.name} · ранг {g.role.rank}
                    </span>
                  </div>
                </div>
                {g.shout ? (
                  <p className="muted mt-3 line-clamp-2 border-l-2 border-violet-500/50 pl-2 text-[11px] italic">
                    📣 {g.shout}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
