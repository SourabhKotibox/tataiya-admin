import React from "react";
import { Season } from "../types";
import { Layers } from "lucide-react";

interface SeasonSelectorProps {
  seasons: Season[];
  activeSeason: number;
  onSelectSeason: (seasonNumber: number) => void;
}

export function SeasonSelector({
  seasons,
  activeSeason,
  onSelectSeason,
}: SeasonSelectorProps) {
  if (!seasons || seasons.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <div className="flex items-center gap-1.5 text-white/50 text-xs font-semibold mr-1 flex-shrink-0">
        <Layers className="w-3.5 h-3.5" />
        <span>Seasons:</span>
      </div>
      {seasons.map((s) => {
        const isCurrent = s.seasonNumber === activeSeason;
        return (
          <button
            key={s.seasonNumber}
            onClick={() => onSelectSeason(s.seasonNumber)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              isCurrent
                ? "bg-amber-400 text-black shadow-lg shadow-amber-500/30 scale-105"
                : "bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/25"
            }`}
          >
            {s.title || `Season ${s.seasonNumber}`}
            <span
              className={`ml-1.5 text-[10px] font-semibold opacity-75 ${
                isCurrent ? "text-black" : "text-white/60"
              }`}
            >
              ({s.episodes.length})
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default SeasonSelector;
