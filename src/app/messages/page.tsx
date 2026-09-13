"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "@/components/SessionProvider";
import { Avatar, EmptyState, SectionHeader, Skeleton, Tabs } from "@/components/ui";
import { fetcher, rbxPost, rbxUrl, timeAgo } from "@/lib/client";
import { userAvatarUrl } from "@/lib/avatar";
import { toast } from "@/lib/toast";

type Message = {
  id: number;
  sender: { id: number; name: string; displayName: string };
  subject: string;
  body: string;
  created: string;
  isRead: boolean;
  isSystemMessage: boolean;
};
type Payload = { collection?: Message[]; totalCollectionSize?: number };

export default function MessagesPage() {
  const { me, openLogin } = useSession();
  const [tab, setTab] = useState<"Inbox" | "Sent" | "Archive">("Inbox");
  const [open, setOpen] = useState<number | null>(null);

  const { data, isLoading, mutate } = useSWR<Payload>(
    me?.authenticated
      ? rbxUrl(
          `privatemessages.roblox.com/v1/messages?messageTab=${tab}&pageNumber=0&pageSize=25`,
          20_000,
        )
      : null,
    fetcher,
  );

  if (!me?.authenticated) {
    return (
      <EmptyState
        emoji="✉️"
        title="Войдите, чтобы читать сообщения"
        hint="Личные сообщения Roblox прямо в лаунчере."
        action={
          <button className="btn btn-primary mt-3" onClick={openLogin}>
            Войти
          </button>
        }
      />
    );
  }

  async function markRead(id: number) {
    try {
      await rbxPost("privatemessages.roblox.com/v1/messages/mark-read", { messageIds: [id] });
      void mutate();
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    const ids = (data?.collection ?? []).filter((m) => !m.isRead).map((m) => m.id);
    if (!ids.length) return;
    try {
      await rbxPost("privatemessages.roblox.com/v1/messages/mark-read", { messageIds: ids });
      toast("Все сообщения отмечены прочитанными");
      void mutate();
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <SectionHeader
          title="Сообщения"
          subtitle={`Всего: ${data?.totalCollectionSize ?? 0} · непрочитанных: ${me.stats?.unreadMessages ?? 0}`}
          action={
            <button className="btn h-9 text-xs" onClick={() => void markAllRead()}>
              Отметить всё прочитанным
            </button>
          }
        />
        <Tabs
          tabs={[
            { id: "Inbox" as const, label: "Входящие" },
            { id: "Sent" as const, label: "Отправленные" },
            { id: "Archive" as const, label: "Архив" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {isLoading ? <Skeleton className="h-56 w-full" /> : null}

      <div className="space-y-2">
        {(data?.collection ?? []).map((m) => (
          <div
            key={m.id}
            className={`panel cursor-pointer p-4 transition ${m.isRead ? "" : "border-violet-400/40"}`}
            onClick={() => {
              setOpen(open === m.id ? null : m.id);
              if (!m.isRead) void markRead(m.id);
            }}
          >
            <div className="flex items-start gap-3">
              <Avatar src={userAvatarUrl(m.sender?.id)} alt={m.sender?.name ?? "?"} size={42} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {m.sender?.displayName ?? "Roblox"}
                  </span>
                  {!m.isRead ? (
                    <span className="h-2 w-2 rounded-full bg-violet-400 pulse-dot" />
                  ) : null}
                  {m.isSystemMessage ? <span className="chip !py-0 text-[10px]">Система</span> : null}
                  <span className="muted ml-auto text-[11px]">{timeAgo(m.created)}</span>
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-slate-200">
                  {m.subject}
                </div>
                <p
                  className={`muted mt-1 whitespace-pre-wrap text-xs ${open === m.id ? "" : "line-clamp-2"}`}
                >
                  {m.body}
                </p>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && !(data?.collection ?? []).length ? (
          <p className="muted py-10 text-center text-sm">Сообщений нет</p>
        ) : null}
      </div>
    </div>
  );
}
