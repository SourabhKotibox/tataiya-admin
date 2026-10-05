import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import {
  Play, Star, ChevronLeft, Crown, Tv, Plus, Check, Heart, Share2,
  Calendar, Globe, Clock, Film, Lock, Sparkles, CheckCircle2
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { useToast } from "@/hooks/use-toast";
import {
  getTvShowById,
  isTvShowWatchlisted,
  toggleTvShowWatchlist,
  isTvShowLiked,
  toggleTvShowLike,
} from "../data/tvShows";
import { Episode } from "../types";
import { SeasonSelector } from "../components/SeasonSelector";
import { EpisodeCard } from "../components/EpisodeCard";
import { CastList } from "../components/CastList";

export default function TvShowDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [plansModalOpen, setPlansModalOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [inWatchlist, setInWatchlist] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);

  // Retrieve TV Show details from local mock data
  const show = useMemo(() => (id ? getTvShowById(id) : undefined), [id]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  // Sync user state from localStorage
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

  // Sync watchlist & like states
  useEffect(() => {
    if (id) {
      setInWatchlist(isTvShowWatchlisted(id));
      setIsLiked(isTvShowLiked(id));
    }

    const handleWatchlistChange = () => {
      if (id) setInWatchlist(isTvShowWatchlisted(id));
    };
    const handleLikesChange = () => {
      if (id) setIsLiked(isTvShowLiked(id));
    };

    window.addEventListener("tvshows-watchlist-updated", handleWatchlistChange);
    window.addEventListener("tvshows-likes-updated", handleLikesChange);
    return () => {
      window.removeEventListener("tvshows-watchlist-updated", handleWatchlistChange);
      window.removeEventListener("tvshows-likes-updated", handleLikesChange);
    };
  }, [id]);

  // Check subscription status
  const isSubscribed = Boolean(
    user && (user.subscription === true || (user.subscriptionStatus === "active" && user.subscriptionPlan !== "free"))
  );

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("user");
    localStorage.removeItem("appAccessToken");
    setUser(null);
    window.location.reload();
  };

  if (!show) {
    return (
      <div className="min-h-screen bg-[#0c0c14] text-white flex flex-col justify-between">
        <PublicHeader
          activeTab={"tvshows" as any}
          setActiveTab={() => setLocation("/tv-shows")}
          onSignIn={() => setLocation("/login")}
        />
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <Tv className="w-16 h-16 text-white/20 mb-4" />
          <h2 className="text-2xl font-bold mb-2">TV Show Not Found</h2>
          <p className="text-white/60 text-sm mb-6 max-w-sm">
            The series you are looking for does not exist or has been relocated.
          </p>
          <button
            onClick={() => setLocation("/tv-shows")}
            className="px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl text-sm hover:bg-amber-300 transition-all cursor-pointer"
          >
            Back to TV Shows
          </button>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Seasons & Episodes resolution
  const seasons = show.seasons || [];
  const currentSeason = seasons.find((s) => s.seasonNumber === selectedSeason) || seasons[0];
  const episodes = currentSeason?.episodes || [];
  const firstEpisode = seasons[0]?.episodes?.[0];

  const handleToggleWatchlist = () => {
    const added = toggleTvShowWatchlist(show.id);
    toast({
      title: added ? "Added to Watchlist" : "Removed from Watchlist",
      description: added ? `"${show.title}" was saved to your list.` : `"${show.title}" was removed.`,
    });
  };

  const handleToggleLike = () => {
    const liked = toggleTvShowLike(show.id);
    toast({
      title: liked ? "Added to Liked Series" : "Like Removed",
      description: liked ? `Thank you for rating "${show.title}"!` : undefined,
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: show.title,
        text: show.description,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        toast({
          title: "Link Copied!",
          description: "Share link copied to your clipboard.",
        });
      });
    }
  };

  const handlePlayEpisode = (ep: Episode) => {
    setLocation(`/tv-shows/${show.id}/watch/${ep.episodeNumber}`);
  };

  const handleLockedEpisodeClick = () => {
    setPlansModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0c0c14] font-sans text-white selection:bg-amber-400/30">
      {/* Header */}
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

      {/* Cinematic Hero Backdrop 70vh */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: "520px", height: "70vh" }}>
        {/* Backdrop Image */}
        <img
          src={show.backdrop || show.poster}
          alt={show.title}
          className="absolute inset-0 w-full h-full object-cover object-top"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.src = "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=85";
          }}
        />

        {/* Cinematic Multi-layered Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c14] via-[#0c0c14]/85 md:via-[#0c0c14]/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[65%] bg-gradient-to-t from-[#0c0c14] via-[#0c0c14]/60 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0c0c14]/80 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => setLocation("/tv-shows")}
          className="absolute top-20 sm:top-24 left-4 sm:left-10 lg:left-14 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white/90 hover:text-white text-xs sm:text-sm font-semibold transition-all z-20 cursor-pointer shadow-lg hover:-translate-x-0.5"
        >
          <ChevronLeft className="w-4 h-4" /> Back to TV Shows
        </button>

        {/* Hero Metadata & Action Panel */}
        <div className="absolute bottom-6 sm:bottom-10 left-0 px-4 sm:px-10 lg:px-14 max-w-3xl z-10">
          {/* Eyebrow Tags */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-400 shadow-sm uppercase tracking-wider">
              <Tv className="w-3.5 h-3.5" /> TV Show
            </span>
            {show.isPremium && (
              <span className="flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <Crown className="w-3 h-3" /> VIP
              </span>
            )}
            {show.genres.map((genre) => (
              <span
                key={genre}
                className="text-xs px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/90 font-medium"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-3 tracking-tight drop-shadow-xl">
            {show.title}
          </h1>

          {/* Metadata badges row */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 mb-4 flex-wrap text-xs sm:text-sm">
            {show.imdbRating && (
              <span className="flex items-center gap-1 bg-black/60 border border-amber-400/40 text-amber-400 text-xs font-black px-2.5 py-1 rounded-md shadow">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {show.imdbRating}
              </span>
            )}
            <span className="px-2 py-0.5 text-xs font-bold border border-white/15 text-white/90 bg-black/50 rounded-md">
              {show.ageRating}
            </span>
            <span className="text-white/80 font-semibold">{show.year}</span>
            <span className="text-white/40">•</span>
            <span className="text-white/80 font-semibold">
              {show.seasonsCount} {show.seasonsCount === 1 ? "Season" : "Seasons"}
            </span>
            <span className="text-white/40">•</span>
            <span className="text-white/80 font-semibold">
              {show.episodesCount} Episodes
            </span>
            <span className="text-white/40">•</span>
            <span className="px-1.5 py-0.5 text-[10px] font-black border border-white/20 text-white/90 rounded bg-white/5">
              HD
            </span>
          </div>

          {/* Description */}
          <p className="text-white/80 text-xs sm:text-sm md:text-base leading-relaxed mb-6 max-w-2xl line-clamp-3">
            {show.description}
          </p>

          {/* Actions Button Bar */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Primary Watch Button */}
            <button
              onClick={() => {
                if (firstEpisode) {
                  if (firstEpisode.isLocked && !isSubscribed) {
                    setPlansModalOpen(true);
                  } else {
                    handlePlayEpisode(firstEpisode);
                  }
                }
              }}
              className="flex items-center gap-2.5 px-7 sm:px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl text-sm tracking-wide transition-all active:scale-95 shadow-xl shadow-amber-500/25 hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              {isSubscribed ? "Watch Now" : firstEpisode?.isFree ? "Watch Free (EP 1)" : "Watch Now"}
            </button>

            {/* Subscribe Button */}
            {!isSubscribed && (
              <button
                onClick={() => setPlansModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl text-sm border border-white/15 transition-all active:scale-95 hover:-translate-y-0.5 cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-400" /> Unlock VIP
              </button>
            )}

            {/* Watchlist Toggle */}
            <button
              onClick={handleToggleWatchlist}
              title={inWatchlist ? "In Watchlist" : "Add to Watchlist"}
              className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                inWatchlist
                  ? "bg-amber-400/20 border-amber-400/60 text-amber-400"
                  : "bg-black/60 border-white/15 text-white hover:bg-white/10"
              }`}
            >
              {inWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>

            {/* Like Toggle */}
            <button
              onClick={handleToggleLike}
              title={isLiked ? "Liked" : "Like this show"}
              className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isLiked
                  ? "bg-rose-500/20 border-rose-500/60 text-rose-400"
                  : "bg-black/60 border-white/15 text-white hover:bg-white/10"
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-400" : ""}`} />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              title="Share"
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-white/15 bg-black/60 text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Body Content */}
      <div className="px-4 sm:px-10 lg:px-14 py-10 max-w-7xl mx-auto space-y-12">
        {/* Episodes Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-white font-black text-xl sm:text-2xl tracking-tight">
                Episodes
              </h2>
              <p className="text-white/60 text-xs mt-0.5">
                {currentSeason.title || `Season ${selectedSeason}`} • {episodes.length} Episodes
              </p>
            </div>

            {/* Season Selector Tabs */}
            <SeasonSelector
              seasons={seasons}
              activeSeason={selectedSeason}
              onSelectSeason={(num) => setSelectedSeason(num)}
            />
          </div>

          {/* Episode Cards Grid */}
          {episodes.length === 0 ? (
            <div className="py-12 text-center text-white/50 text-sm bg-zinc-900/30 rounded-2xl border border-white/5">
              No episodes available for this season yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {episodes.map((ep) => (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  isSubscribed={isSubscribed}
                  onPlay={handlePlayEpisode}
                  onLockedClick={handleLockedEpisodeClick}
                />
              ))}
            </div>
          )}
        </section>

        {/* About Series Section */}
        <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8">
          <h3 className="text-white font-black text-lg sm:text-xl tracking-tight mb-3">
            About {show.title}
          </h3>
          <p className="text-white/75 text-sm sm:text-base leading-relaxed max-w-3xl mb-8">
            {show.description}
          </p>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-white/5 text-xs sm:text-sm">
            {show.year && (
              <div>
                <span className="text-white/40 block text-[11px] font-bold uppercase tracking-wider mb-1">
                  Release Year
                </span>
                <span className="text-white font-semibold">{show.year}</span>
              </div>
            )}
            {show.genres.length > 0 && (
              <div>
                <span className="text-white/40 block text-[11px] font-bold uppercase tracking-wider mb-1">
                  Genres
                </span>
                <span className="text-white font-semibold">{show.genres.join(", ")}</span>
              </div>
            )}
            {show.director && (
              <div>
                <span className="text-white/40 block text-[11px] font-bold uppercase tracking-wider mb-1">
                  Director / Creator
                </span>
                <span className="text-white font-semibold">{show.director}</span>
              </div>
            )}
            {show.language && (
              <div>
                <span className="text-white/40 block text-[11px] font-bold uppercase tracking-wider mb-1">
                  Audio & Subtitles
                </span>
                <span className="text-white font-semibold">{show.language}</span>
              </div>
            )}
          </div>
        </section>

        {/* Cast & Crew Section */}
        {show.cast && show.cast.length > 0 && (
          <section>
            <h3 className="text-white font-black text-lg sm:text-xl tracking-tight mb-4">
              Cast & Starring
            </h3>
            <CastList cast={show.cast} />
          </section>
        )}
      </div>

      {/* Footer */}
      <PublicFooter />

      {/* Subscription Plans Modal */}
      <SubscriptionPlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        onSubscribed={() => {
          try {
            const stored = localStorage.getItem("appUser") || localStorage.getItem("user");
            if (stored) setUser(JSON.parse(stored));
          } catch {}
        }}
      />
    </div>
  );
}
