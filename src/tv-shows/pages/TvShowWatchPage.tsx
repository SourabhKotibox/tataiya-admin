import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  ChevronLeft, Play, Lock, AlertCircle, Crown,
  SkipForward, List, Film, CheckCircle2, Tv
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { getTvShowById, recordTvShowProgress, formatDuration } from "../data/tvShows";
import { Episode } from "../types";

export default function TvShowWatchPage() {
  const params = useParams<{ id: string; epNum?: string }>();
  const id = params.id;
  const epNum = parseInt(params.epNum || "1", 10);
  const [, setLocation] = useLocation();

  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load user
  useEffect(() => {
    try {
      const stored = localStorage.getItem("appUser") || localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const isSubscribed = Boolean(
    user && (user.subscription === true || (user.subscriptionStatus === "active" && user.subscriptionPlan !== "free"))
  );

  const show = useMemo(() => (id ? getTvShowById(id) : undefined), [id]);

  // Find all episodes across all seasons
  const allEpisodes = useMemo(() => {
    if (!show?.seasons) return [];
    return show.seasons.flatMap((s) => s.episodes);
  }, [show]);

  // Find current episode (matching episodeNumber)
  const currentEpisode: Episode | undefined = useMemo(() => {
    return allEpisodes.find((e) => e.episodeNumber === epNum) || allEpisodes[0];
  }, [allEpisodes, epNum]);

  // Next episode
  const nextEpisode: Episode | undefined = useMemo(() => {
    if (!currentEpisode) return undefined;
    const currentIndex = allEpisodes.findIndex((e) => e.id === currentEpisode.id);
    return currentIndex >= 0 && currentIndex < allEpisodes.length - 1
      ? allEpisodes[currentIndex + 1]
      : undefined;
  }, [allEpisodes, currentEpisode]);

  // Record continue watching entry on episode change
  useEffect(() => {
    if (show && currentEpisode) {
      recordTvShowProgress({
        showId: show.id,
        seasonNumber: currentEpisode.season,
        episodeNumber: currentEpisode.episodeNumber,
        episodeTitle: currentEpisode.title,
        showTitle: show.title,
        thumbnail: currentEpisode.thumbnail || show.poster,
        progressPercent: 15,
      });
    }
  }, [show, currentEpisode]);

  // Check if current episode is locked
  const isLocked = Boolean(
    currentEpisode?.isLocked && !currentEpisode?.isFree && !isSubscribed
  );

  if (!show || !currentEpisode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold mb-2">Episode Unavailable</h2>
        <p className="text-white/60 text-sm mb-6">
          The requested episode could not be located in this series.
        </p>
        <button
          onClick={() => setLocation(show ? `/tv-shows/${show.id}` : "/tv-shows")}
          className="px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl text-sm"
        >
          Return to Show
        </button>
      </div>
    );
  }

  const handleSelectEpisode = (ep: Episode) => {
    if (ep.isLocked && !ep.isFree && !isSubscribed) {
      setPlansModalOpen(true);
      return;
    }
    setLocation(`/tv-shows/${show.id}/watch/${ep.episodeNumber}`);
    setPlaylistOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#06060a] text-white flex flex-col select-none">
      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-6 bg-[#0c0c14]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setLocation(`/tv-shows/${show.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer border border-white/10"
          >
            <ChevronLeft className="w-4 h-4" /> Show Details
          </button>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate flex items-center gap-2">
              <span>{show.title}</span>
              <span className="text-amber-400 text-xs font-black">
                S{currentEpisode.season} : E{currentEpisode.episodeNumber}
              </span>
            </h1>
            <p className="text-[11px] text-white/50 truncate">
              {currentEpisode.title}
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {nextEpisode && (
            <button
              onClick={() => handleSelectEpisode(nextEpisode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
              title={`Next: E${nextEpisode.episodeNumber} - ${nextEpisode.title}`}
            >
              <SkipForward className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Next Episode</span>
            </button>
          )}

          <button
            onClick={() => setPlaylistOpen(!playlistOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              playlistOpen
                ? "bg-amber-400 text-black border-amber-400"
                : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/10"
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Episodes ({allEpisodes.length})</span>
          </button>
        </div>
      </header>

      {/* Main Player & Drawer Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden bg-black">
        {/* Video Player or Locked Overlay */}
        <div className="flex-1 relative flex items-center justify-center min-h-[50vh] lg:min-h-full">
          {isLocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 z-20">
              <div className="relative mb-4">
                <img
                  src={currentEpisode.thumbnail || show.backdrop}
                  alt={currentEpisode.title}
                  className="w-72 h-44 object-cover rounded-2xl opacity-30 border border-white/10"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xl">
                    <Lock className="w-6 h-6" />
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-400 text-xs font-black uppercase tracking-wider mb-2 border border-amber-400/30">
                Premium Episode
              </span>
              <h2 className="text-xl sm:text-2xl font-black mb-2 text-white">
                {currentEpisode.title} is Locked
              </h2>
              <p className="text-white/60 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
                This episode is reserved for VIP and Premium subscribers. Subscribe today to stream all episodes without ads.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPlansModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  <Crown className="w-4 h-4" /> Unlock Subscription
                </button>
                <button
                  onClick={() => setLocation(`/tv-shows/${show.id}`)}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Back to Show
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full min-h-[60vh] flex items-center justify-center bg-black">
              <VideoPlayer
                src={currentEpisode.videoUrl}
                poster={currentEpisode.thumbnail || show.backdrop}
                title={`${show.title} - S${currentEpisode.season}:E${currentEpisode.episodeNumber}`}
                subtitle={currentEpisode.title}
                contentId={`tvshow-${show.id}-s${currentEpisode.season}-e${currentEpisode.episodeNumber}`}
                onClose={() => setLocation(`/tv-shows/${show.id}`)}
              />
            </div>
          )}
        </div>

        {/* Slide-out or Split Episode Playlist */}
        <aside
          className={`lg:w-80 xl:w-96 bg-[#0c0c14] border-l border-white/5 flex flex-col transition-all duration-300 z-20 ${
            playlistOpen ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" /> Season Episodes
            </h3>
            <span className="text-[11px] font-semibold text-white/50">
              {allEpisodes.length} Episodes
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {allEpisodes.map((ep) => {
              const isCurrent = ep.id === currentEpisode.id;
              const epLocked = ep.isLocked && !ep.isFree && !isSubscribed;

              return (
                <div
                  key={ep.id}
                  onClick={() => handleSelectEpisode(ep)}
                  className={`flex gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isCurrent
                      ? "bg-amber-400/10 border-amber-400/50 shadow-md"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/15"
                  }`}
                >
                  {/* Mini Thumbnail */}
                  <div
                    className="relative w-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800"
                    style={{ aspectRatio: "16/9" }}
                  >
                    <img
                      src={ep.thumbnail || show.poster}
                      alt={ep.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.src = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300&h=200&fit=crop";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      {isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center">
                          <Play className="w-3 h-3 fill-black text-black ml-0.5" />
                        </div>
                      ) : epLocked ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Play className="w-3 h-3 text-white fill-white opacity-60" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black text-amber-400">
                        EP {ep.episodeNumber}
                      </span>
                      {ep.isFree && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                          FREE
                        </span>
                      )}
                      {epLocked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded">
                          VIP
                        </span>
                      )}
                    </div>
                    <h4
                      className={`text-xs font-bold leading-tight truncate ${
                        isCurrent ? "text-amber-400" : "text-white/90"
                      }`}
                    >
                      {ep.title}
                    </h4>
                    {ep.duration > 0 && (
                      <span className="text-[10px] text-white/40 mt-1">
                        {formatDuration(ep.duration)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Subscription Modal */}
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
