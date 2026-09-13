"use client";

import { useState } from "react";
import useSWR from "swr";
import { GameCard, type GameLike } from "@/components/GameCard";
import { Icon } from "@/components/Icons";
import { SectionHeader, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/client";

type SortMeta = { sortId: string; sortDisplayName: string };
type Payload = {
  sorts: SortMeta[];
  active?: SortMeta;
  games: GameLike[];
};
type SearchPayload = { games: GameLike[] };

export default function DiscoverPage() {
  const [sort, setSort] = useState("top-trending");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [wide, setWide] = useState(false);

  const { data, isLoading } = useSWR<Payload>(`/api/discover?sort=${sort}`, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: search, isLoading: searching } = useSWR<SearchPayload>(
    submitted ? `/api/search?q=${encodeURIComponent(submitted)}` : null,
    fetcher,
  );

  const games = submitted ? (search?.games ?? []) : (data?.games ?? []);

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <SectionHeader
          title="Каталог игр Roblox"
          subtitle="Живые чарты Roblox Explore API: тренды, новинки, игры с друзьями"
          action={
            <button className={`chip ${wide ? "chip-active" : ""}`} onClick={() => setWide((v) => !v)}>
              {wide ? "Крупные карточки" : "Компактно"}
            </button>
          }
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(query.trim());
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Icon name="search" className="muted absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              className="input pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: Blox Fruits, Adopt Me, Doors…"
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Искать
          </button>
          {submitted ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSubmitted("");
                setQuery("");
              }}
            >
              Сброс
            </button>
          ) : null}
        </form>

        {!submitted ? (
          <div className="rail mt-4 flex gap-2 overflow-x-auto pb-1">
            {(data?.sorts ?? []).map((s) => (
              <button
                key={s.sortId}
                onClick={() => setSort(s.sortId)}
                className={`chip whitespace-nowrap ${sort === s.sortId ? "chip-active" : ""}`}
              >
                {s.sortDisplayName}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {(isLoading || searching) && !games.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : null}

      <div>
        <h2 className="section-title mb-3">
          {submitted ? `Результаты: «${submitted}»` : data?.active?.sortDisplayName || "Популярное"}
          <span className="muted ml-2 text-sm font-normal">{games.length} игр</span>
        </h2>
        <div
          className={
            wide
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
          }
        >
          {games.map((g) => (
            <GameCard key={g.universeId} game={g} wide={wide} />
          ))}
        </div>
        {!games.length && !isLoading && !searching ? (
          <p className="muted py-10 text-center text-sm">Ничего не найдено</p>
        ) : null}
      </div>
    </div>
  );
}
