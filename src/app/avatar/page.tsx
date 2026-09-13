"use client";

import useSWR from "swr";
import { Icon } from "@/components/Icons";
import { useSession } from "@/components/SessionProvider";
import { Avatar, EmptyState, SectionHeader, Skeleton } from "@/components/ui";
import { fetcher, rbxPost, rbxUrl } from "@/lib/client";
import { toast } from "@/lib/toast";

type AvatarPayload = {
  scales?: Record<string, number>;
  playerAvatarType?: string;
  bodyColors?: Record<string, number>;
  assets?: { id: number; name: string; assetType: { id: number; name: string } }[];
};
type Thumb = { data?: { targetId: number; imageUrl?: string }[] };
type Outfits = { data?: { id: number; name: string }[] };
type OutfitThumbs = { data?: { targetId: number; imageUrl?: string }[] };

export default function AvatarPage() {
  const { me, openLogin } = useSession();
  const userId = me?.user?.id;

  const { data: av, isLoading, mutate } = useSWR<AvatarPayload>(
    userId ? rbxUrl(`avatar.roblox.com/v1/users/${userId}/avatar`, 30_000) : null,
    fetcher,
  );
  const assetIds = (av?.assets ?? []).map((a) => a.id);
  const { data: assetThumbs } = useSWR<Thumb>(
    assetIds.length
      ? rbxUrl(
          `thumbnails.roblox.com/v1/assets?assetIds=${assetIds.join(",")}&size=150x150&format=Png&isCircular=false`,
          300_000,
        )
      : null,
    fetcher,
  );
  const { data: outfits } = useSWR<Outfits>(
    userId
      ? rbxUrl(`avatar.roblox.com/v1/users/${userId}/outfits?page=1&itemsPerPage=20`, 120_000)
      : null,
    fetcher,
  );
  const outfitIds = (outfits?.data ?? []).map((o) => o.id);
  const { data: outfitThumbs } = useSWR<OutfitThumbs>(
    outfitIds.length
      ? rbxUrl(
          `thumbnails.roblox.com/v1/users/outfits?userOutfitIds=${outfitIds.join(",")}&size=150x150&format=Png&isCircular=false`,
          300_000,
        )
      : null,
    fetcher,
  );

  if (!me?.authenticated) {
    return (
      <EmptyState
        emoji="🧍"
        title="Войдите, чтобы управлять аватаром"
        hint="Просмотр надетых предметов, сохранённых образов и мгновенная смена костюма."
        action={
          <button className="btn btn-primary mt-3" onClick={openLogin}>
            Войти
          </button>
        }
      />
    );
  }

  const thumbMap = Object.fromEntries(
    (assetThumbs?.data ?? []).map((t) => [t.targetId, t.imageUrl ?? null]),
  );
  const outfitMap = Object.fromEntries(
    (outfitThumbs?.data ?? []).map((t) => [t.targetId, t.imageUrl ?? null]),
  );

  async function wear(outfitId: number) {
    try {
      await rbxPost(`avatar.roblox.com/v1/outfits/${outfitId}/wear`, {});
      toast("Образ надет! Обновляем аватар…");
      setTimeout(() => void mutate(), 1200);
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  return (
    <div className="space-y-5">
      <section className="panel grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-violet-600/25 to-transparent p-4">
          {me.user?.fullBodyUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.user.fullBodyUrl}
              alt="avatar"
              className="mx-auto h-[320px] w-auto object-contain drop-shadow-2xl"
            />
          ) : (
            <Skeleton className="h-[320px] w-full" />
          )}
          <button
            className="btn mt-3 w-full"
            onClick={async () => {
              try {
                await rbxPost("avatar.roblox.com/v1/avatar/redraw-thumbnail", {});
                toast("Запрошена перерисовка аватара");
              } catch (err) {
                toast((err as Error).message, "err");
              }
            }}
          >
            <Icon name="refresh" className="h-4 w-4" /> Перерисовать превью
          </button>
        </div>

        <div>
          <SectionHeader
            title="Мой аватар"
            subtitle={`Тип: ${av?.playerAvatarType ?? "—"} · надето предметов: ${av?.assets?.length ?? 0}`}
          />
          {isLoading ? <Skeleton className="h-40 w-full" /> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {(av?.assets ?? []).map((a) => (
              <a
                key={a.id}
                href={`https://www.roblox.com/catalog/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="panel hoverable flex items-center gap-3 p-3"
              >
                <Avatar src={thumbMap[a.id]} alt={a.name} size={44} />
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-white">{a.name}</div>
                  <div className="muted truncate text-[10px]">{a.assetType.name}</div>
                </div>
              </a>
            ))}
          </div>

          {av?.bodyColors ? (
            <div className="mt-5">
              <h3 className="section-title mb-2 text-base">Цвета тела</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(av.bodyColors).map(([part, colorId]) => (
                  <span key={part} className="chip">
                    {part.replace("ColorId", "")}: #{colorId}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {av?.scales ? (
            <div className="mt-5">
              <h3 className="section-title mb-2 text-base">Пропорции</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(av.scales).map(([k, v]) => (
                  <span key={k} className="chip">
                    {k}: {v}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="section-title mb-3">Сохранённые образы</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {(outfits?.data ?? []).map((o) => (
            <div key={o.id} className="panel hoverable overflow-hidden">
              <div className="aspect-square bg-white/3">
                {outfitMap[o.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={outfitMap[o.id]!} alt={o.name} className="h-full w-full object-contain" />
                ) : (
                  <Skeleton className="h-full w-full" />
                )}
              </div>
              <div className="p-2">
                <div className="truncate text-xs font-semibold text-white">{o.name}</div>
                <button
                  className="btn btn-primary mt-2 w-full py-1 text-[11px]"
                  onClick={() => void wear(o.id)}
                >
                  Надеть
                </button>
              </div>
            </div>
          ))}
          {!outfits?.data?.length ? (
            <p className="muted col-span-full text-sm">Сохранённых образов нет</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
