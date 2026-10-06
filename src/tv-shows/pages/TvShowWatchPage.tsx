import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  ChevronLeft, Play, Lock, AlertCircle, Crown,
  SkipForward, List, Film, CheckCircle2, Tv
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { recordTvShowProgress, formatDuration } from "../data/tvShows";
import { Episode } from "../types";
import {
  useGetAppSeriesDetail,
  useGetWatchData,
  getImageUrl,
} from "@/lib/api-client";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";

export default function TvShowWatchPage() {
  const params = useParams<{ id: string; epNum?: string }>();
  const id = params.id;
  const epNum = parseInt(params.epNum || "1", 10);
  const requestedSeason = parseInt(new URLSearchParams(window.location.search).get("season") || "1", 10);
  const [location, setLocation] = useLocation();

  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load user
  useEffect(() => {
    try {
      const stored = localStorage.getItem("appUser") || localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("appToken");
    localStorage.removeItem("appUser");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const isSubscribed = Boolean(
    user && (user.subscription === true || (user.subscriptionStatus === "active" && user.subscriptionPlan !== "free"))
  );

  const { data: serverShowData } = useGetAppSeriesDetail(id || "");

  const show = useMemo(() => {
    const raw = serverShowData?.data || serverShowData;
    if (raw && (raw._id || raw.id)) {
      return {
        id: raw._id || raw.id,
        title: raw.title || "Untitled",
        description: raw.description || "",
        poster: getImageUrl(raw.poster || raw.thumbnail),
        backdrop: getImageUrl(raw.backdrop || raw.bannerImage || raw.banner || raw.posterImage || raw.poster),
        seasons: raw.seasons || [],
      };
    }
    return undefined;
  }, [serverShowData]);

  // Find all episodes across all seasons
  const allEpisodes = useMemo(() => {
    const raw = serverShowData?.data || serverShowData;
    const rawList: any[] = raw?.episodes || [];
    return rawList.map((e: any) => ({
      id: e._id || e.id,
      season: e.season || 1,
      episodeNumber: e.episode ?? e.episodeNumber ?? 1,
      title: e.title || `Episode ${e.episode || 1}`,
      description: e.description || e.shortDescription || "",
      duration: e.duration || 2700,
      thumbnail: getImageUrl(e.thumbnail || e.poster || show?.backdrop || show?.poster),
      isFree: e.isFree ?? !e.isLocked,
      isLocked: e.isLocked ?? !e.isFree,
      videoUrl: e.hlsUrl || e.videoUrl || "",
    })).sort((a: any, b: any) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.episodeNumber - b.episodeNumber;
    });
  }, [serverShowData, show]);

  // Find current episode (matching episodeNumber)
  const currentEpisode: Episode | undefined = useMemo(() => {
    return allEpisodes.find((e: any) => e.season === requestedSeason && e.episodeNumber === epNum) ||
      allEpisodes.find((e: any) => e.episodeNumber === epNum) ||
      allEpisodes[0];
  }, [allEpisodes, epNum, requestedSeason]);

  // Next episode
  const nextEpisode: Episode | undefined = useMemo(() => {
    if (!currentEpisode) return undefined;
    const currentIndex = allEpisodes.findIndex((e: any) => e.id === currentEpisode.id);
    return currentIndex >= 0 && currentIndex < allEpisodes.length - 1
      ? allEpisodes[currentIndex + 1]
      : undefined;
  }, [allEpisodes, currentEpisode]);

  // Secure watch data query
  const { data: watchData, isLoading: watchDataLoading, error: watchDataError } = useGetWatchData(id || "", {
    episodeId: currentEpisode?.id,
    season: currentEpisode?.season,
    episode: currentEpisode?.episodeNumber,
  });

  const watchVideo = watchData?.currentEpisode || watchData?.currentVideo;
  const hlsUrl = watchVideo?.hlsUrl;
  const isBackendLocked = watchVideo ? Boolean(watchVideo.isLocked) : Boolean(currentEpisode?.isLocked && !currentEpisode?.isFree);

  // Check if current episode is locked
  const isLocked = Boolean(
    isBackendLocked && !isSubscribed
  );

  const videoStreamSrc = hlsUrl || "";

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

  if (!show || !currentEpisode) {
    return (
      <div className="min-h-screen bg-[#09090b] text-foreground flex flex-col items-center justify-center p-6 text-center">
        <PublicHeader
          activeTab="tv-shows"
          setActiveTab={(tab) => {
            if (tab === "home") setLocation("/");
            else setLocation(`/browse/${tab}`);
          }}
          onSignIn={() => setLocation("/login")}
          onSignOut={handleSignOut}
          user={user}
        />
        <div className="flex flex-col items-center mt-20">
          <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
          <h2 className="text-xl font-bold mb-2">Episode Unavailable</h2>
          <p className="text-foreground/60 text-sm mb-6">
            The requested episode could not be located in this series.
          </p>
          <button
            onClick={() => setLocation(show ? `/tv-shows/${show.id}` : "/tv-shows")}
            className="px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl text-sm"
          >
            Return to Show
          </button>
        </div>
      </div>
    );
  }

  const handleSelectEpisode = (ep: Episode) => {
    if (ep.isLocked && !ep.isFree && !isSubscribed) {
      setPlansModalOpen(true);
      return;
    }
    setLocation(`/tv-shows/${show.id}/watch/${ep.episodeNumber}?season=${ep.season}`);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <PublicHeader
        activeTab="tv-shows"
        setActiveTab={(tab) => {
          if (tab === "home") setLocation("/");
          else setLocation(`/browse/${tab}`);
        }}
        onSignIn={() => setLocation("/login")}
        onSignOut={handleSignOut}
        user={user}
      />

      <main className="pt-[68px] pb-16 bg-[#09090b] text-foreground">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back button row */}
          <div className="pt-4 pb-4">
            <button
              onClick={() => setLocation(`/tv-shows/${show.id}`)}
              className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground text-sm font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Show Details
            </button>
          </div>

          {/* Player Container */}
          <div className="relative bg-black shadow-2xl rounded-xl sm:rounded-2xl border border-zinc-900 mb-6 w-full min-h-[200px] sm:min-h-0 overflow-visible" style={{ aspectRatio: "16 / 9" }}>
            {isLocked ? (
              <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-black/90 px-6 text-center gap-3 rounded-xl sm:rounded-2xl">
                <Crown className="w-10 h-10 text-amber-400 animate-bounce" />
                <h3 className="text-white text-lg font-bold">Premium Episode</h3>
                <p className="text-white/70 text-xs max-w-sm">
                  This episode is reserved for Premium subscribers. Subscribe today to stream all episodes without ads.
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setPlansModalOpen(true)}
                    className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-900/20"
                  >
                    Unlock Subscription
                  </button>
                </div>
              </div>
            ) : videoStreamSrc ? (
              <div className="w-full h-full flex items-center justify-center bg-black rounded-xl sm:rounded-2xl overflow-hidden">
                <VideoPlayer
                  src={videoStreamSrc}
                  poster={currentEpisode.thumbnail || show.backdrop}
                  title={`${show.title} - S${currentEpisode.season}:E${currentEpisode.episodeNumber}`}
                  subtitle={currentEpisode.title}
                  contentId={`tvshow-${show.id}-s${currentEpisode.season}-e${currentEpisode.episodeNumber}`}
                  onClose={() => setLocation(`/tv-shows/${show.id}`)}
                />
              </div>
            ) : (
              <div className="absolute inset-0 z-[40] flex flex-col items-center justify-center bg-black/80 px-6 text-center rounded-xl sm:rounded-2xl gap-3">
                <Film className="w-8 h-8 text-amber-400" />
                <p className="text-sm text-foreground/80 font-semibold">
                  {watchVideo?.processingStatus === "queued" || watchVideo?.processingStatus === "processing"
                    ? "Episode video is processing. Please check back shortly."
                    : watchVideo?.processingStatus === "failed"
                      ? watchVideo.processingError || "Episode video processing failed."
                      : watchVideo?.processingStatus === "ready"
                        ? "A playback playlist is not available for this episode."
                        : watchDataError
                          ? "Could not load episode playback details. Please try again."
                          : watchDataLoading
                            ? "Loading episode video..."
                            : "Episode playback is unavailable."}
                </p>
              </div>
            )}
          </div>

          {/* Episode Info */}
          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-black mb-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-foreground">
              <span>{show.title}</span>
              <span className="hidden sm:inline text-zinc-600">|</span>
              <span className="text-amber-400 text-lg sm:text-xl font-bold">
                S{currentEpisode.season} : E{currentEpisode.episodeNumber} - {currentEpisode.title}
              </span>
            </h1>
            <p className="text-sm text-foreground/70 leading-relaxed max-w-4xl mt-2">
              {currentEpisode.description || show.description}
            </p>
          </div>

          {/* Seasons / Episodes List */}
          <div className="border-t border-zinc-900/80 pt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-foreground font-bold text-xl flex items-center gap-2">
                <List className="w-5 h-5 text-amber-400" /> All Episodes
              </h3>
              <span className="text-sm font-semibold text-foreground/50">
                {allEpisodes.length} Episodes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allEpisodes.map((ep: any) => {
                const isCurrent = ep.id === currentEpisode.id;
                const epLocked = ep.isLocked && !ep.isFree && !isSubscribed;

                return (
                  <div
                    key={ep.id}
                    onClick={() => handleSelectEpisode(ep)}
                    className={`flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all border ${
                      isCurrent
                        ? "bg-amber-400/10 border-amber-400/50 shadow-md"
                        : "bg-zinc-900/50 border-white/5 hover:bg-zinc-800 hover:border-white/15"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative w-full rounded-lg overflow-hidden bg-zinc-800"
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
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                        {isCurrent ? (
                          <div className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center">
                            <Play className="w-5 h-5 fill-black text-black ml-1" />
                          </div>
                        ) : epLocked ? (
                          <div className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm">
                            <Lock className="w-5 h-5 text-amber-400" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-amber-400 hover:text-black transition-colors">
                            <Play className="w-5 h-5 fill-current ml-1" />
                          </div>
                        )}
                      </div>
                      
                      {/* Duration Badge */}
                      {ep.duration > 0 && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[10px] font-bold text-white">
                          {formatDuration(ep.duration)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 mt-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-black text-amber-400">
                          S{ep.season} E{ep.episodeNumber}
                        </span>
                        {ep.isFree && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded uppercase">
                            Free
                          </span>
                        )}
                        {epLocked && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded uppercase">
                            Premium
                          </span>
                        )}
                      </div>
                      <h4
                        className={`text-sm font-bold leading-tight truncate ${
                          isCurrent ? "text-amber-400" : "text-foreground"
                        }`}
                        title={ep.title}
                      >
                        {ep.title}
                      </h4>
                      {ep.description && (
                        <p className="text-xs text-foreground/50 line-clamp-2 mt-1">
                          {ep.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      <PublicFooter />

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
