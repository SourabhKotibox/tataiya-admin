import React from "react";
import { Play, Lock, Film, Clock } from "lucide-react";
import { Episode } from "../types";
import { formatDuration } from "../data/tvShows";

interface EpisodeCardProps {
  episode: Episode;
  isSubscribed?: boolean;
  onPlay: (episode: Episode) => void;
  onLockedClick: (episode: Episode) => void;
}

export function EpisodeCard({
  episode,
  isSubscribed = false,
  onPlay,
  onLockedClick,
}: EpisodeCardProps) {
  const isLocked = episode.isLocked && !episode.isFree && !isSubscribed;

  const handleClick = () => {
    if (isLocked) {
      onLockedClick(episode);
    } else {
      onPlay(episode);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group flex flex-col sm:flex-row gap-3.5 sm:gap-4 p-3.5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-zinc-700/80 hover:bg-zinc-900/80 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
    >
      {/* 16:9 Thumbnail */}
      <div
        className="relative w-full sm:w-36 md:w-44 lg:w-48 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800 border border-white/5"
        style={{ aspectRatio: "16/9" }}
      >
        {episode.thumbnail ? (
          <img
            src={episode.thumbnail}
            alt={episode.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.src = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Film className="w-6 h-6 text-white/30" />
          </div>
        )}

        {/* Hover / Status Overlay */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          {isLocked ? (
            <div className="w-9 h-9 rounded-full bg-black/80 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg">
              <Lock className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-400 text-black flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all transform scale-95 sm:group-hover:scale-100 shadow-xl">
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            </div>
          )}
        </div>

        {/* Duration Badge */}
        {episode.duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 text-[10px] font-bold bg-black/80 backdrop-blur-sm text-white/90 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-white/70" />
            {formatDuration(episode.duration)}
          </span>
        )}
      </div>

      {/* Episode Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {/* Badge & Number header */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
              EP {episode.episodeNumber}
            </span>
            {episode.isFree && (
              <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                FREE
              </span>
            )}
            {isLocked && (
              <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> PREMIUM
              </span>
            )}
          </div>

          {/* Episode Title */}
          <h4 className="text-white text-sm sm:text-base font-bold leading-snug group-hover:text-amber-400 transition-colors truncate">
            {episode.title}
          </h4>

          {/* Episode Description */}
          {episode.description && (
            <p className="text-white/65 text-xs sm:text-xs leading-relaxed mt-1.5 line-clamp-2">
              {episode.description}
            </p>
          )}
        </div>

        {/* Action Link Footer */}
        <div className="mt-3 flex items-center gap-2 text-xs font-bold">
          {isLocked ? (
            <span className="text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Unlock with Premium
            </span>
          ) : (
            <span className="text-white/80 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
              <Play className="w-3 h-3 fill-current" /> Watch Episode
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default EpisodeCard;
