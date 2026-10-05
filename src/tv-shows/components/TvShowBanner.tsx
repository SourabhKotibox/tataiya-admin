import React from "react";
import { Play, Star, Eye, Tv, Crown } from "lucide-react";
import { TvShow } from "../types";

interface TvShowBannerProps {
  show: TvShow;
  onWatchNow: (show: TvShow) => void;
  onMoreInfo: (show: TvShow) => void;
}

export function TvShowBanner({ show, onWatchNow, onMoreInfo }: TvShowBannerProps) {
  if (!show) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl bg-[#0c0c14] group">
      {/* Backdrop Image with 21:9 Aspect Ratio on desktop */}
      <div className="relative w-full min-h-[380px] sm:min-h-[440px] md:min-h-[480px] lg:aspect-[21/9]">
        <img
          src={show.backdrop || show.poster}
          alt={show.title}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.src = "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=85";
          }}
        />

        {/* Cinematic Multi-angle Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c14] via-[#0c0c14]/80 md:via-[#0c0c14]/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-[#0c0c14]/40 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#0c0c14]/60 to-transparent" />

        {/* Content Container */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 md:p-12 max-w-2xl z-10">
          {/* Eyebrow badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-400/40 text-amber-400 text-xs font-black rounded-full uppercase tracking-wider shadow-sm">
              <Tv className="w-3.5 h-3.5 text-amber-400" /> Featured Series
            </span>
            {show.isPremium && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-full">
                <Crown className="w-3 h-3" /> VIP Series
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-white font-black text-2xl sm:text-4xl md:text-5xl tracking-tight leading-tight mb-2 drop-shadow-md">
            {show.title}
          </h2>

          {/* Metadata Row */}
          <div className="flex items-center gap-2.5 mb-3.5 flex-wrap text-xs sm:text-sm">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 border border-amber-400/30 text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> {show.imdbRating}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-white/90 font-semibold border border-white/10">
              {show.ageRating}
            </span>
            <span className="text-white/80 font-medium">{show.year}</span>
            <span className="text-white/40">•</span>
            <span className="text-white/80 font-medium">
              {show.seasonsCount} {show.seasonsCount === 1 ? "Season" : "Seasons"}
            </span>
            <span className="text-white/40">•</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {show.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/80 font-medium"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <p className="text-white/80 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-2 sm:line-clamp-3 mb-6 max-w-xl">
            {show.description}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <button
              onClick={() => onWatchNow(show)}
              className="flex items-center gap-2 px-6 sm:px-7 py-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" /> Watch Now
            </button>
            <button
              onClick={() => onMoreInfo(show)}
              className="flex items-center gap-2 px-5 sm:px-6 py-3 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md text-white font-bold rounded-xl text-sm border border-white/15 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Eye className="w-4 h-4" /> More Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TvShowBanner;
