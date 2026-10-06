import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Tv, Search, X, SlidersHorizontal, ChevronDown,
  TrendingUp, Flame, Sparkles, Clock, ArrowLeft,
  RotateCcw, Play,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import {
  TV_SHOW_GENRES,
  TV_SHOW_SORT_OPTIONS,
  getContinueWatchingShows,
  ContinueWatchingRecord,
} from "../data/tvShows";
import { TvShow } from "../types";
import { TvShowCard } from "../components/TvShowCard";
import { TvShowBanner } from "../components/TvShowBanner";
import { useGetWebAllContent, getImageUrl } from "@/lib/api-client";

function normalizeTvShow(s: any): TvShow {
  return {
    id: s._id || s.id,
    title: s.title || "Untitled",
    description: s.description || s.overview || "",
    poster: getImageUrl(s.poster || s.thumbnail || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80"),
    backdrop: getImageUrl(s.backdrop || s.banner || s.poster || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80"),
    imdbRating: s.imdbRating ? String(s.imdbRating) : (s.rating ? String(s.rating) : "8.5"),
    ageRating: s.ageRating || s.maturityRating || "16+",
    year: s.releaseDate ? String(new Date(s.releaseDate).getFullYear()) : String(s.year || 2026),
    genres: Array.isArray(s.genres)
      ? s.genres.map((g: any) => (typeof g === "object" ? g.name : g))
      : (s.genre ? [s.genre] : ["Drama"]),
    featured: Boolean(s.featured || s.isFeatured),
    isPremium: Boolean(s.isPremium ?? true),
    badge: s.badge || (s.trending ? "TRENDING" : s.featured ? "TOP" : undefined),
    seasonsCount: s.seasonsCount ?? s.totalSeasons ?? 1,
    episodesCount: s.episodesCount ?? s.totalEpisodes ?? 1,
    seasons: Array.isArray(s.seasons) ? s.seasons : [],
    cast: Array.isArray(s.cast) ? s.cast : [],
    releaseDate: s.releaseDate,
    director: s.director,
    language: s.language || "Hindi",
  };
}

export default function TvShowsBrowsePage() {
  const [, setLocation] = useLocation();

  const [activeGenre, setActiveGenre] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [continueWatchingList, setContinueWatchingList] = useState<ContinueWatchingRecord[]>([]);

  const { data: webContentData } = useGetWebAllContent();

  // Load user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("appUser") || localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}

    const handleUserUpdate = () => {
      try {
        const stored = localStorage.getItem("appUser") || localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener("user-updated", handleUserUpdate);
    return () => window.removeEventListener("user-updated", handleUserUpdate);
  }, []);

  // Continue watching sync
  useEffect(() => {
    setContinueWatchingList(getContinueWatchingShows());
    const handleContinueUpdate = () => {
      setContinueWatchingList(getContinueWatchingShows());
    };
    window.addEventListener("tvshows-continue-updated", handleContinueUpdate);
    return () => window.removeEventListener("tvshows-continue-updated", handleContinueUpdate);
  }, []);

  // Filtered TV Shows with pagination & Featured Show
  const { shows, total, totalPages, featuredShow } = useMemo(() => {
    const rawList: any[] = Array.isArray(webContentData?.tvShows) ? [...webContentData.tvShows] : [];
    const query = searchTerm.trim().toLowerCase();
    const filtered = rawList.filter((show) => {
      const genres = Array.isArray(show.genres)
        ? show.genres.map((genre: any) => typeof genre === "object" ? genre.name : genre)
        : [];
      const matchesGenre = activeGenre === "All" || genres.some((genre: string) => genre?.toLowerCase() === activeGenre.toLowerCase());
      const matchesSearch = !query || `${show.title || ""} ${show.description || ""} ${genres.join(" ")}`.toLowerCase().includes(query);
      return matchesGenre && matchesSearch;
    });

    filtered.sort((a, b) => {
      if (sortBy === "rated") return Number(b.imdbRating || b.rating || 0) - Number(a.imdbRating || a.rating || 0);
      if (sortBy === "new") return new Date(b.releaseDate || b.createdAt || 0).getTime() - new Date(a.releaseDate || a.createdAt || 0).getTime();
      if (sortBy === "az") return String(a.title || "").localeCompare(String(b.title || ""));
      return Number(b.views || 0) - Number(a.views || 0);
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / 12));
    const normalized = filtered.slice((page - 1) * 12, page * 12).map(normalizeTvShow);
    const featured = normalized.find((s) => s.featured) || normalized[0] || null;
    return {
      shows: normalized,
      total,
      totalPages,
      featuredShow: featured,
    };
  }, [webContentData, activeGenre, searchTerm, sortBy, page]);

  const handleCardClick = (show: TvShow) => {
    setLocation(`/tv-shows/${show.id}`);
  };

  const handlePlayShow = (show: TvShow) => {
    const firstEp = show.seasons?.[0]?.episodes?.[0];
    if (firstEp) {
      if (firstEp.isLocked && !firstEp.isFree) {
        setPlansModalOpen(true);
        return;
      }
      setLocation(`/tv-shows/${show.id}/watch/${firstEp.episodeNumber}?season=${firstEp.season}`);
    } else {
      setLocation(`/tv-shows/${show.id}`);
    }
  };

  const handleResumeWatching = (record: ContinueWatchingRecord) => {
    setLocation(`/tv-shows/${record.showId}/watch/${record.episodeNumber}?season=${record.seasonNumber}`);
  };

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("user");
    localStorage.removeItem("appAccessToken");
    setUser(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0c0c14] font-sans text-white selection:bg-amber-400/30">
      {/* Platform Header */}
      <PublicHeader
        activeTab={"tvshows" as any}
        setActiveTab={(tab: any) => {
          if (tab === "home") setLocation("/");
          else if (tab === "movies") setLocation("/browse?type=movie");
          else if (tab === "new") setLocation("/browse?type=new");
          else if (tab === "tvshows") setLocation("/tv-shows");
        }}
        onSignIn={() => setLocation("/login")}
        onSignOut={handleSignOut}
        user={user}
        onSubscribeClick={() => setPlansModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="pt-[68px]">
        {/* Top Hero Section */}
        <section className="relative overflow-hidden pb-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />

          <div className="px-4 sm:px-8 lg:px-14 pt-6 sm:pt-8 pb-4 max-w-7xl mx-auto">
            {/* Header Title & Badges */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLocation("/")}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  title="Back to Home"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5 text-amber-400" />
                    <h1 className="text-white font-black text-xl sm:text-2xl md:text-3xl tracking-tight">
                      TV Shows
                    </h1>
                  </div>
                  <p className="text-white/60 text-xs mt-0.5">
                    {total} {total === 1 ? "series" : "series"} available to stream
                  </p>
                </div>
              </div>

              {/* Stat badges */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-[11px] font-bold">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Trending
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-[11px] font-bold">
                  <Flame className="w-3.5 h-3.5 text-orange-400" /> Top Rated
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Free Episodes
                </span>
              </div>
            </div>

            {/* Featured Hero Banner */}
            {!searchTerm && activeGenre === "All" && featuredShow && (
              <div className="mb-6">
                <TvShowBanner
                  show={featuredShow}
                  onWatchNow={handlePlayShow}
                  onMoreInfo={handleCardClick}
                />
              </div>
            )}
          </div>
        </section>

        {/* Sticky Filters & Search Bar */}
        <section className="sticky top-[56px] sm:top-[60px] lg:top-[68px] z-30 bg-[#0c0c14]/95 backdrop-blur-md border-y border-white/5 px-4 sm:px-8 lg:px-14 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
            {/* Genre filter buttons */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0 pb-0.5">
              {TV_SHOW_GENRES.map((genre) => {
                const isActive = activeGenre === genre;
                return (
                  <button
                    key={genre}
                    onClick={() => {
                      setActiveGenre(genre);
                      setPage(1);
                    }}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-400 text-black shadow-lg shadow-amber-500/25 scale-105"
                        : "bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/15 text-white/90 hover:border-amber-400 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>{TV_SHOW_SORT_OPTIONS.find((s) => s.value === sortBy)?.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    sortOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-[#12121c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150">
                  {TV_SHOW_SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value);
                        setSortOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                        sortBy === opt.value
                          ? "text-amber-400 bg-amber-400/10"
                          : "text-white/80 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Live Search */}
            <div
              className={`flex items-center gap-2 transition-all duration-300 rounded-full border ${
                searchOpen || searchTerm
                  ? "bg-zinc-900 border-amber-400/60 w-44 sm:w-56"
                  : "border-transparent w-9"
              }`}
            >
              {searchOpen || searchTerm ? (
                <>
                  <Search className="w-3.5 h-3.5 text-amber-400 ml-3 flex-shrink-0" />
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search shows, genres..."
                    className="flex-1 bg-transparent text-white text-xs py-1.5 pr-2 focus:outline-none placeholder:text-white/40 min-w-0"
                  />
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSearchOpen(false);
                      setPage(1);
                    }}
                    className="mr-2.5 text-white/50 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/5 transition-all cursor-pointer"
                  title="Search Series"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Series Poster Grid */}
        <section className="px-4 sm:px-8 lg:px-14 py-8 max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-black text-lg sm:text-xl tracking-tight">
                {activeGenre === "All" ? "All TV Shows" : `${activeGenre} Shows`}
                {searchTerm && ` • "${searchTerm}"`}
              </h2>
              <p className="text-white/60 text-xs mt-0.5">
                Showing {shows.length} of {total} titles
              </p>
            </div>
          </div>

          {/* Grid or Empty State */}
          {shows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-zinc-900/30 rounded-3xl border border-white/5">
              <Tv className="w-12 h-12 text-white/20 mb-3" />
              <h3 className="text-white font-bold text-lg mb-1">No series found</h3>
              <p className="text-white/50 text-xs sm:text-sm max-w-md mb-5">
                No TV shows match your current search or genre criteria. Try resetting the filters.
              </p>
              <button
                onClick={() => {
                  setActiveGenre("All");
                  setSearchTerm("");
                  setPage(1);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
              {shows.map((show) => (
                <TvShowCard
                  key={show.id}
                  show={show}
                  onClick={handleCardClick}
                  onPlay={handlePlayShow}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Previous
              </button>
              <span className="text-white/70 text-xs font-bold px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </section>

        {/* Continue Watching Section */}
        {continueWatchingList.length > 0 && (
          <section className="px-4 sm:px-8 lg:px-14 pb-12 max-w-7xl mx-auto">
            <div className="border-t border-white/10 pt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> Continue Watching
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                {continueWatchingList.map((item) => (
                  <div
                    key={`${item.showId}-${item.episodeNumber}`}
                    onClick={() => handleResumeWatching(item)}
                    className="flex-shrink-0 w-[170px] sm:w-[200px] cursor-pointer group"
                  >
                    <div
                      className="relative rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-amber-400/50 transition-all"
                      style={{ aspectRatio: "16/9" }}
                    >
                      <img
                        src={item.thumbnail}
                        alt={item.episodeTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.src = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300&h=200&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                          <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70">
                        <div
                          className="h-full bg-amber-400 rounded-r-full"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-white text-xs font-bold truncate mt-2 group-hover:text-amber-400 transition-colors">
                      {item.showTitle}
                    </p>
                    <p className="text-white/50 text-[11px] truncate">
                      S{item.seasonNumber} : E{item.episodeNumber} • {item.episodeTitle}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Public Footer */}
      <PublicFooter />

      {/* Subscription Plans Modal for premium previews */}
      <SubscriptionPlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
      />
    </div>
  );
}
