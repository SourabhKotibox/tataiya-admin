import React from "react";
import { Play, Star, Crown, Tv } from "lucide-react";
import { TvShow } from "../types";

interface TvShowCardProps {
  show: TvShow;
  onClick: (show: TvShow) => void;
  onPlay?: (show: TvShow) => void;
  fullWidth?: boolean;
}

export function TvShowCard({ show, onClick, onPlay, fullWidth = true }: TvShowCardProps) {
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(show);
    } else {
      onClick(show);
    }
  };

  return (
    <div
      className={`cursor-pointer group flex flex-col ${fullWidth ? "w-full min-w-0" : "w-[160px] sm:w-[190px] md:w-[220px] flex-shrink-0"}`}
      onClick={() => onClick(show)}
    >
      {/* Poster Image Container */}
      <div
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-900 border border-white/5 group-hover:border-amber-400/50 group-hover:ring-2 group-hover:ring-amber-400/30 transition-all duration-300 shadow-md group-hover:shadow-amber-500/10"
        style={{ aspectRatio: "9/16" }}
      >
        <img
          src={show.poster}
          alt={show.title}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.src = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80";
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

        {/* Top-left Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
          {show.isPremium && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-400 text-black text-[9px] font-black rounded-md leading-none shadow-md uppercase tracking-wider">
              <Crown className="w-2.5 h-2.5" /> VIP
            </span>
          )}
          {!show.isPremium && (
            <span className="px-1.5 py-0.5 bg-emerald-500/90 text-white text-[9px] font-black rounded-md leading-none shadow-md uppercase tracking-wider">
              FREE
            </span>
          )}
          {show.badge && (
            <span
              className={`px-1.5 py-0.5 text-[9px] font-black rounded-md leading-none shadow-md uppercase tracking-wider ${
                show.badge === "HOT"
                  ? "bg-orange-500 text-white"
                  : show.badge === "NEW"
                  ? "bg-emerald-500 text-white"
                  : show.badge === "TRENDING"
                  ? "bg-amber-500 text-black"
                  : "bg-white/20 text-white backdrop-blur-sm"
              }`}
            >
              {show.badge}
            </span>
          )}
        </div>

        {/* Top-right IMDb rating */}
        {show.imdbRating && (
          <div className="absolute top-2 right-2 z-10">
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-black/75 backdrop-blur-sm border border-amber-400/40 text-amber-400 text-[10px] font-black rounded-md shadow">
              <Star className="w-2.5 h-2.5 fill-amber-400" /> {show.imdbRating}
            </span>
          </div>
        )}

        {/* Floating TV Seasons Pill (Bottom Left Inside Poster) */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="flex items-center gap-1 text-[10px] font-bold text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
            <Tv className="w-3 h-3 text-amber-400" /> {show.seasonsCount} {show.seasonsCount === 1 ? "Season" : "Seasons"}
          </span>
        </div>

        {/* Hover Play Button (Bottom Right) */}
        <button
          onClick={handlePlayClick}
          aria-label={`Play ${show.title}`}
          className="absolute bottom-2.5 right-2.5 z-20 w-9 h-9 rounded-full bg-amber-400 text-black flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 scale-100 sm:scale-90 sm:group-hover:scale-100 transition-all duration-200 shadow-xl pointer-events-auto hover:bg-amber-300 hover:scale-105 active:scale-95"
        >
          <Play className="w-4 h-4 fill-black text-black ml-0.5" />
        </button>
      </div>

      {/* Show Title & Meta Below */}
      <div className="mt-2 px-0.5 min-w-0">
        <h3 className="text-white font-bold text-xs sm:text-sm truncate leading-snug group-hover:text-amber-400 transition-colors">
          {show.title}
        </h3>
        <div className="flex items-center gap-1.5 text-white/60 text-[11px] mt-0.5 truncate">
          <span>{show.year}</span>
          <span>•</span>
          <span className="truncate">{show.genres.slice(0, 2).join(", ")}</span>
        </div>
      </div>
    </div>
  );
}
export default TvShowCard;
