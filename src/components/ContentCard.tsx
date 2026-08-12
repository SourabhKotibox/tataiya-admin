import { Play, Star, Crown } from "lucide-react";
import { getImageUrl } from "@/lib/api-client";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function BadgeTop({ item }: { item: any }) {
  const isSubscribed = (() => {
    try {
      const stored = localStorage.getItem("appUser") || localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        const status = String(u.subscriptionStatus || "").toLowerCase();
        const plan = String(u.subscriptionPlan || "free").toLowerCase();
        return status === "active" && plan !== "free";
      }
    } catch {}
    return false;
  })();

  const isPremium = item.isPremium || item.badge === "TOP" || item.badge === "EXCLUSIVE";
  if (isPremium && !isSubscribed) {
    return (
      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-400/90 text-black text-[9px] font-black rounded-md leading-none shadow">
        <Crown className="w-2.5 h-2.5" /> PREMIUM
      </span>
    );
  }
  if (item.badge === "NEW") {
    return (
      <span className="px-1.5 py-0.5 bg-emerald-500/90 text-foreground text-[9px] font-black rounded-md leading-none shadow">
        NEW
      </span>
    );
  }
  if (item.badge === "HOT") {
    return (
      <span className="px-1.5 py-0.5 bg-orange-500/90 text-foreground text-[9px] font-black rounded-md leading-none shadow">
        HOT
      </span>
    );
  }
  if (item.badge === "TRENDING") {
    return (
      <span className="px-1.5 py-0.5 bg-amber-500/90 text-white text-[9px] font-black rounded-md leading-none shadow">
        TRENDING
      </span>
    );
  }
  if (item.badge && item.badge !== "TOP" && item.badge !== "EXCLUSIVE") {
    return (
      <span className="px-1.5 py-0.5 bg-white/20 text-foreground text-[9px] font-black rounded-md leading-none shadow">
        {item.badge}
      </span>
    );
  }

  return null;
}

function ImdbBadge({ rating }: { rating: any }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-400/90 text-black text-[9px] font-black rounded-md leading-none shadow">
      <Star className="w-2.5 h-2.5 fill-black" /> {rating}
    </span>
  );
}

function formatCardDuration(raw: any): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (!s) return "";

  // Already human-formatted (e.g. "1h 32m") — normalize absurd "1521m" style values
  const minutesOnly = s.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?$/i);
  if (minutesOnly) {
    const n = Number(minutesOnly[1]);
    if (!Number.isFinite(n) || n <= 0) return "";
    // Values that look like seconds mislabeled as minutes
    if (n >= 300) {
      const h = Math.floor(n / 3600);
      const m = Math.floor((n % 3600) / 60);
      if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
      return `${Math.max(m, 1)}m`;
    }
    if (n >= 60) {
      const h = Math.floor(n / 60);
      const m = Math.round(n % 60);
      return m ? `${h}h ${m}m` : `${h}h`;
    }
    return `${Math.round(n)}m`;
  }
  if (/[hm]/i.test(s)) return s;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  // Stored as seconds when large; avoid "1432m" style bugs
  if (n >= 60) {
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
    return `${Math.max(m, 1)}m`;
  }
  return `${n}m`;
}

// ─── PortraitCard ──────────────────────────────────────────────────────────────
// Use fullWidth=true when inside a CSS grid (categories, search results).
// Leave fullWidth=false (default) when inside a horizontal scroll row.

const portraitWidths = {
  sm: "w-[120px] sm:w-[160px]",
  md: "w-[140px] sm:w-[165px] md:w-[195px] lg:w-[220px]",
  lg: "w-[160px] sm:w-[190px] md:w-[225px] lg:w-[260px]",
};

export function PortraitCard({
  item,
  onClick,
  size = "md",
  fullWidth = false,
  hidePlayButton = false,
  useThumbnail = false,
  square = false,
}: {
  item: any;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  hidePlayButton?: boolean;
  useThumbnail?: boolean;
  square?: boolean;
}) {
  const imgSrc =
    useThumbnail
      ? getImageUrl(item.thumbnail || item.poster || item.posterImage || item.backdrop) || ""
      : getImageUrl(item.poster || item.posterImage || item.thumbnail || item.backdrop) || "";

  const year = item.year || item.releaseYear || "";
  const duration = formatCardDuration(item.duration);

  return (
    <div
      className={`${fullWidth ? "w-full min-w-0" : `${portraitWidths[size]} flex-shrink-0`} cursor-pointer group`}
      onClick={onClick}
    >
      {/* Image container */}
      <div
        className={`relative overflow-hidden bg-zinc-900 group-hover:ring-1 group-hover:ring-amber-400/60 transition-all duration-300 ${square ? "rounded-none" : "rounded-xl sm:rounded-2xl"}`}
        style={{ aspectRatio: "9/16" }}
      >
        {/* Poster image */}
        <img
          src={imgSrc}
          alt={item.title || ""}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.backgroundColor = "#111";
            el.style.display = "none";
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

        {/* Top-left: badge */}
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10">
          <BadgeTop item={item} />
        </div>

        {/* Top-right: IMDB */}
        {item.imdbRating && (
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10">
            <ImdbBadge rating={item.imdbRating} />
          </div>
        )}

        {/* Play button — hidden on mobile grid cards */}
        {!hidePlayButton && (
          <button
            className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-400 text-black flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 scale-100 sm:scale-90 sm:group-hover:scale-100 transition-all duration-200 shadow-lg pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label="Play"
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black fill-black ml-0.5" />
          </button>
        )}
      </div>

      {/* Title below image */}
      <div className="mt-1 px-0.5 min-w-0">
        <p className="text-foreground font-bold text-[11px] sm:text-xs md:text-sm truncate leading-snug">{item.title}</p>
        {(year || duration) && (
          <p className="text-foreground/60 text-[10px] sm:text-[11px] mt-0.5 truncate">
            {[year, duration].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── LandscapeCard ─────────────────────────────────────────────────────────────
// Use fullWidth=true when inside a CSS grid.

const landscapeWidths = {
  sm: "w-[220px] sm:w-[260px] md:w-[300px]",
  md: "w-[260px] sm:w-[300px] md:w-[360px] lg:w-[420px]",
  lg: "w-[280px] sm:w-[340px] md:w-[400px] lg:w-[480px]",
};

export function LandscapeCard({
  item,
  onClick,
  size = "md",
  fullWidth = false,
}: {
  item: any;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const imgSrc =
    getImageUrl(item.backdrop || item.poster || item.posterImage || item.thumbnail) || "";

  const year = item.year || item.releaseYear || "";
  const duration = formatCardDuration(item.duration);

  return (
    <div
      className={`${fullWidth ? "w-full min-w-0" : `${landscapeWidths[size]} flex-shrink-0`} cursor-pointer group`}
      onClick={onClick}
    >
      <div
        className="relative rounded-lg sm:rounded-xl overflow-hidden bg-zinc-900 group-hover:ring-1 group-hover:ring-amber-400/50 transition-all duration-300"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Backdrop image */}
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.backgroundColor = "#111";
            el.style.display = "none";
          }}
        />

        {/* Soft bottom shade for play control only */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Top-left: badge */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10">
          <BadgeTop item={item} />
        </div>

        {/* Top-right: IMDB */}
        {item.imdbRating && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
            <ImdbBadge rating={item.imdbRating} />
          </div>
        )}

        {/* Play button */}
        <button
          className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-20 flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-400 text-black flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 shadow-lg pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label="Play"
        >
          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black fill-black ml-0.5" />
        </button>
      </div>

      <div className="mt-2 px-0.5 min-w-0">
        <p className="text-foreground font-bold text-[11px] sm:text-xs md:text-sm truncate leading-snug">{item.title}</p>
        {(year || duration) && (
          <p className="text-foreground/60 text-[10px] sm:text-[11px] mt-0.5 truncate">
            {[year, duration].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

// Default export
export default PortraitCard;
