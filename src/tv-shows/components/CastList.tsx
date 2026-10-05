import React from "react";
import { CastMember } from "../types";

interface CastListProps {
  cast: CastMember[];
}

export function CastList({ cast }: CastListProps) {
  if (!cast || cast.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 scrollbar-none">
        {cast.map((member) => (
          <div
            key={member.id}
            className="flex flex-col items-center text-center w-20 sm:w-24 md:w-28 flex-shrink-0 group"
          >
            {/* Avatar circle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-amber-400 bg-zinc-900 transition-all duration-300 shadow-md group-hover:shadow-amber-500/20 group-hover:scale-105">
              {member.image ? (
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50 text-lg font-bold bg-zinc-800">
                  {member.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Name */}
            <h5 className="text-white font-bold text-xs sm:text-xs mt-2.5 line-clamp-1 group-hover:text-amber-400 transition-colors">
              {member.name}
            </h5>

            {/* Character */}
            {member.character && (
              <p className="text-white/50 text-[10px] sm:text-[11px] mt-0.5 line-clamp-1">
                {member.character}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CastList;
