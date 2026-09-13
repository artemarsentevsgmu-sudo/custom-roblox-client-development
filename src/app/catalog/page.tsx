"use client";

import { useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/Icons";
import { useSession } from "@/components/SessionProvider";
import { Robux, SectionHeader, Skeleton } from "@/components/ui";
import { api, compact, fetcher } from "@/lib/client";
import { toast } from "@/lib/toast";

type Item = {
  id: number;
  itemType: string;
  name: string;
  price?: number | null;
  lowestPrice?: number | null;
  productId?: number;
  creatorName?: string;
  creatorTargetId?: number;
  creatorHasVerifiedBadge?: boolean;
  itemRestrictions?: string[];
  purchaseCount?: number;
  favoriteCount?: number;
  thumb: string | null;
};

const CATEGORIES = [
  { id: "1", label: "Всё" },
  { id: "11", label: "Аксессуары" },
  { id: "3", label: "Одежда" },
  { id: "12", label: "Коллекционное" },
  { id: "4", label: "Снаряжение" },
  { id: "13", label: "Бандлы" },
];

const SORTS = [
  { id: "0", label: "По релевантности" },
  { id: "1", label: "Сначала популярные" },
  { id: "2", label: "Сначала новые" },
  { id: "3", label: "Цена: по возрастанию" },
  { id: "4", label: "Цена: по убыванию" },
];

export default function CatalogPage() {
  const { me, openLogin } = useSession();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [category, setCategory] = useState("1");
  const [sort, setSort] = useState("1");

  const { data, isLoading } = useSWR<{ items: Item[] }>(
    `/api/catalog?category=${category}&sort=${sort}${submitted ? `&q=${encodeURIComponent(submitted)}` : ""}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  async function buy(item: Item) {
    if (!me?.authenticated) return openLogin();
    const price = item.price ?? item.lowestPrice ?? 0;
    if (!item.productId) {
      window.open(`https://www.roblox.com/catalog/${item.id}`, "_blank");
      return;
    }
    if (!confirm(`Купить «${item.name}» за ${price} R$?`)) return;
    try {
      const res = await api<{ purchased: boolean; reason: string | null }>("/api/catalog", {
        method: "POST",
        body: JSON.stringify({
          productId: item.productId,
          price,
          sellerId: item.creatorTargetId,
        }),
      });
      toast(
        res.purchased ? `Куплено: ${item.name}` : `Отказ: ${res.reason ?? "неизвестная причина"}`,
        res.purchased ? "ok" : "err",
      );
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <SectionHeader
          title="Магазин аватара"
          subtitle="Полный каталог Roblox: аксессуары, одежда, лимитки и бандлы — с покупкой в один клик"
        />
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(q.trim());
          }}
        >
          <input
            className="input flex-1"
            placeholder="Поиск по каталогу…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="input h-[42px] w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">
            <Icon name="search" className="h-4 w-4" /> Искать
          </button>
        </form>
        <div className="rail mt-4 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`chip whitespace-nowrap ${category === c.id ? "chip-active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {(data?.items ?? []).map((item) => {
          const limited = (item.itemRestrictions ?? []).some((r) => r.includes("Limited"));
          const price = item.price ?? item.lowestPrice;
          return (
            <div key={`${item.itemType}-${item.id}`} className="panel hoverable overflow-hidden">
              <div className="relative aspect-square bg-white/3">
                {item.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumb}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Skeleton className="h-full w-full" />
                )}
                {limited ? (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-black text-black">
                    LIMITED
                  </span>
                ) : null}
              </div>
              <div className="p-2.5">
                <div className="truncate text-xs font-bold text-white">{item.name}</div>
                <div className="muted truncate text-[10px]">
                  {item.creatorName} {item.creatorHasVerifiedBadge ? "☑️" : ""}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1 text-xs font-extrabold text-amber-300">
                    <Robux className="h-3 w-3" />
                    {price === null || price === undefined ? "—" : compact(price)}
                  </span>
                  <span className="muted text-[10px]">❤ {compact(item.favoriteCount ?? 0)}</span>
                </div>
                <button
                  className="btn btn-primary mt-2 w-full py-1 text-[11px]"
                  onClick={() => void buy(item)}
                >
                  {item.productId ? "Купить" : "Открыть"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && !(data?.items ?? []).length ? (
        <p className="muted py-10 text-center text-sm">Ничего не найдено</p>
      ) : null}
    </div>
  );
}
