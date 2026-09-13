"use client";

import Link from "next/link";
import { compact, ratingOf } from "@/lib/client";

export type GameLike = {
  universeId: number;
  rootPlaceId: number;
  name: string;
  playerCount?: number;
  totalUpVotes?: number;
  totalDownVotes?: number;
  icon?: string | null;
  banner?: string | null;
  genre?: string;
  creator?: string;
};

export function GameCard({ game, wide = false }: { game: GameLike; wide?: boolean }) {
  const rating = ratingOf(game.totalUpVotes, game.totalDownVotes);
  const image = (wide ? game.banner : game.icon) ?? game.icon ?? game.banner;
  return (
    <Link
      href={`/game/${game.rootPlaceId}`}
      className={`panel hoverable group block overflow-hidden ${wide ? "w-[300px]" : ""}`}
    >
      <div className={`relative overflow-hidden ${wide ? "aspect-video" : "aspect-square"}`}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={game.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/20" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 to-transparent" />
        {typeof game.playerCount === "number" ? (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            {compact(game.playerCount)}
          </div>
        ) : null}
        {rating !== null ? (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold text-white backdrop-blur">
            👍 {rating}%
          </div>
        ) : null}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-bold text-white">{game.name}</div>
        <div className="muted mt-0.5 truncate text-[11px]">
          {game.creator ? `by ${game.creator}` : game.genre || "Roblox Experience"}
        </div>
      </div>
    </Link>
  );
}

export function GameRail({ title, games }: { title: string; games: GameLike[] }) {
  if (!games.length) return null;
  return (
    <section className="fade-up">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">{title}</h2>
        <Link href="/discover" className="muted text-xs font-semibold hover:text-white">
          Показать все →
        </Link>
      </div>
      <div className="rail -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {games.map((g) => (
          <div key={g.universeId} className="w-[168px] shrink-0">
            <GameCard game={g} />
          </div>
        ))}
      </div>
    </section>
  );
}
