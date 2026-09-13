"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "@/components/SessionProvider";
import { EmptyState, SectionHeader, Skeleton, Tabs } from "@/components/ui";
import { compact, fetcher, rbxUrl } from "@/lib/client";

const CATEGORIES = [
  { id: "8", label: "Шляпы" },
  { id: "41", label: "Волосы" },
  { id: "42", label: "Аксессуары" },
  { id: "11", label: "Рубашки" },
  { id: "12", label: "Штаны" },
  { id: "2", label: "Футболки" },
  { id: "18", label: "Лица" },
  { id: "19", label: "Gear" },
  { id: "21", label: "Бейджи" },
  { id: "34", label: "Game Pass" },
  { id: "collectibles", label: "Лимитки" },
];

type Item = {
  assetId?: number;
  name?: string;
  assetName?: string;
  serialNumber?: number | null;
  recentAveragePrice?: number | null;
  originalPrice?: number | null;
  assetType?: string;
};

type InvPayload = { data?: Item[] };
type Thumb = { data?: { targetId: number; imageUrl?: string }[] };

export default function InventoryPage() {
  const { me, openLogin } = useSession();
  const userId = me?.user?.id;
  const [cat, setCat] = useState("8");

  const path =
    cat === "collectibles"
      ? `inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=50&sortOrder=Desc`
      : `inventory.roblox.com/v2/users/${userId}/inventory/${cat}?limit=50&sortOrder=Desc`;

  const { data, isLoading, error } = useSWR<InvPayload>(
    userId ? rbxUrl(path, 60_000) : null,
    fetcher,
  );

  const items = data?.data ?? [];
  const ids = items.map((i) => i.assetId).filter((x): x is number => typeof x === "number");
  const { data: thumbs } = useSWR<Thumb>(
    ids.length
      ? rbxUrl(
          `thumbnails.roblox.com/v1/assets?assetIds=${ids.slice(0, 50).join(",")}&size=150x150&format=Png&isCircular=false`,
          300_000,
        )
      : null,
    fetcher,
  );
  const thumbMap = Object.fromEntries(
    (thumbs?.data ?? []).map((t) => [t.targetId, t.imageUrl ?? null]),
  );

  if (!me?.authenticated) {
    return (
      <EmptyState
        emoji="🎒"
        title="Войдите, чтобы открыть инвентарь"
        hint="Шляпы, аксессуары, лимитированные предметы с RAP и серийными номерами."
        action={
          <button className="btn btn-primary mt-3" onClick={openLogin}>
            Войти
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <SectionHeader
          title="Инвентарь"
          subtitle="Данные напрямую из Roblox Inventory API — приватность инвентаря учитывается"
        />
        <Tabs tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))} value={cat} onChange={setCat} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="panel p-6 text-center text-sm text-rose-300">
          Инвентарь скрыт настройками приватности или недоступен.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((item, idx) => (
          <a
            key={`${item.assetId}-${idx}`}
            href={`https://www.roblox.com/catalog/${item.assetId}`}
            target="_blank"
            rel="noreferrer"
            className="panel hoverable overflow-hidden"
          >
            <div className="aspect-square bg-white/3">
              {item.assetId && thumbMap[item.assetId] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbMap[item.assetId]!}
                  alt={item.name ?? item.assetName ?? ""}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
            <div className="p-2.5">
              <div className="truncate text-xs font-bold text-white">
                {item.name ?? item.assetName ?? "Предмет"}
              </div>
              {item.serialNumber ? (
                <div className="text-[10px] font-semibold text-amber-300">#{item.serialNumber}</div>
              ) : null}
              {item.recentAveragePrice ? (
                <div className="text-[10px] text-emerald-300">
                  RAP {compact(item.recentAveragePrice)} R$
                </div>
              ) : null}
            </div>
          </a>
        ))}
      </div>

      {!isLoading && !items.length && !error ? (
        <p className="muted py-10 text-center text-sm">В этой категории пусто</p>
      ) : null}
    </div>
  );
}
