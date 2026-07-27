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
  const s = String(raw);
  if (/[hm]/i.test(s)) return s;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  // Stored as seconds when large; avoid "1432m" style bugs
  if (n >= 60) {
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${Math.max(m, 1)}m`;
  }
  return `${n}m`;
}

// ─── PortraitCard ──────────────────────────────────────────────────────────────
// Use fullWidth=true when inside a CSS grid (categories, search results).
// Leave fullWidth=false (default) when inside a horizontal scroll row.

const portraitWidths = {
  sm: "w-[120px] xs:w-[140px] sm:w-[160px]",
  md: "w-[140px] sm:w-[165px] md:w-[195px] lg:w-[220px]",
  lg: "w-[160px] sm:w-[190px] md:w-[225px] lg:w-[260px]",
};

export function PortraitCard({
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
    getImageUrl(item.poster || item.posterImage || item.thumbnail) || "";

  const year = item.year || item.releaseYear || "";
  const duration = formatCardDuration(item.duration);

  return (
    <div
      className={`${fullWidth ? "w-full" : `${portraitWidths[size]} flex-shrink-0`} cursor-pointer group`}
      onClick={onClick}
    >
      {/* Image container */}
      <div
        className="relative rounded-xl overflow-hidden bg-zinc-900 group-hover:ring-2 group-hover:ring-amber-400/50 group-hover:shadow-[0_12px_40px_-12px_rgba(255,184,0,0.45)] transition-all duration-300"
        style={{ aspectRatio: "2/3" }}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Top-left: badge */}
        <div className="absolute top-2 left-2 z-10">
          <BadgeTop item={item} />
        </div>

        {/* Top-right: IMDB */}
        {item.imdbRating && (
          <div className="absolute top-2 right-2 z-10">
            <ImdbBadge rating={item.imdbRating} />
          </div>
        )}

        {/* Play button — bottom-right corner */}
        <button
          className="absolute bottom-2.5 right-2.5 z-20 w-9 h-9 rounded-full bg-amber-400 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label="Play"
        >
          <Play className="w-4 h-4 text-black fill-black ml-0.5" />
        </button>
      </div>

      {/* Title below image — avoids double text when poster already has title art */}
      <div className="mt-2 px-0.5">
        <p className="text-foreground font-bold text-xs truncate leading-tight">{item.title}</p>
        {(year || duration) && (
          <p className="text-foreground/70 text-[10px] mt-0.5 truncate">
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
      className={`${fullWidth ? "w-full" : `${landscapeWidths[size]} flex-shrink-0`} cursor-pointer group`}
      onClick={onClick}
    >
      <div
        className="relative rounded-xl overflow-hidden bg-zinc-900 group-hover:ring-1 group-hover:ring-amber-400/50 transition-all duration-300"
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
        <div className="absolute top-2 left-2 z-10">
          <BadgeTop item={item} />
        </div>

        {/* Top-right: IMDB */}
        {item.imdbRating && (
          <div className="absolute top-2 right-2 z-10">
            <ImdbBadge rating={item.imdbRating} />
          </div>
        )}

        {/* Play button */}
        <button
          className="absolute bottom-2.5 right-2.5 z-20 flex-shrink-0 w-9 h-9 rounded-full bg-amber-400 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label="Play"
        >
          <Play className="w-4 h-4 text-black fill-black ml-0.5" />
        </button>
      </div>

      <div className="mt-2 px-0.5">
        <p className="text-foreground font-bold text-xs truncate leading-tight">{item.title}</p>
        {(year || duration) && (
          <p className="text-foreground/70 text-[10px] mt-0.5 truncate">
            {[year, duration].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

// Default export
export default PortraitCard;
