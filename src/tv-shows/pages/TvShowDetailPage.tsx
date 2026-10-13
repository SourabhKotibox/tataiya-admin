import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  Play, Star, ChevronLeft, Crown, Tv, Plus, Check, Heart, Share2,
  Calendar, Globe, Clock, Film, Lock, Sparkles, CheckCircle2, Loader2,
  Volume2, VolumeX, X
} from "lucide-react";
import Hls from "hls.js";
import VideoPlayer from "@/components/VideoPlayer";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { useToast } from "@/hooks/use-toast";
import {
  isTvShowWatchlisted,
  toggleTvShowWatchlist,
  isTvShowLiked,
  toggleTvShowLike,
} from "../data/tvShows";
import { Episode, Season, TvShow } from "../types";
import { SeasonSelector } from "../components/SeasonSelector";
import { EpisodeCard } from "../components/EpisodeCard";
import { CastList } from "../components/CastList";
import {
  useGetAppSeriesDetail,
  useGetEpisodeList,
  useToggleWishlist,
  getImageUrl,
} from "@/lib/api-client";

export default function TvShowDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [plansModalOpen, setPlansModalOpen] = useState<boolean>(false);
  const [trailerModalOpen, setTrailerModalOpen] = useState<boolean>(false);
  const [trailerMuted, setTrailerMuted] = useState<boolean>(true);
  const [heroVideoReady, setHeroVideoReady] = useState<boolean>(false);
  const trailerVideoRef = useRef<HTMLVideoElement>(null);
  const trailerHlsRef = useRef<Hls | null>(null);
  const [user, setUser] = useState<any>(null);
  const [inWatchlist, setInWatchlist] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);

  const { data: serverShowData, isLoading, isFetching } = useGetAppSeriesDetail(id || "");
  const {
    data: fallbackEpisodesRes,
    isLoading: isLoadingFallbackEpisodes,
    isFetching: isFetchingFallbackEpisodes,
  } = useGetEpisodeList(id ? { tvShowId: id, limit: 200 } : {});
  const toggleWishlistMutation = useToggleWishlist();

  // Retrieve TV Show details from server
  const show: TvShow | undefined = useMemo(() => {
    const raw = serverShowData?.data || serverShowData;
    if (raw && (raw._id || raw.id)) {
      const fallbackList: any[] = (fallbackEpisodesRes as any)?.data || (fallbackEpisodesRes as any)?.items || fallbackEpisodesRes || [];
      const fallbackEpisodesRaw = Array.isArray(fallbackList) ? fallbackList : [];
      const episodesRaw: any[] = (Array.isArray(raw.episodes) && raw.episodes.length > 0)
        ? raw.episodes
        : fallbackEpisodesRaw;
      const seasonsRaw: any[] = Array.isArray(raw.seasons) ? raw.seasons : [];

      const rawTrailer = raw.trailerUrl || raw.trailer || raw.trailer_url;
      const firstEpTrailer = episodesRaw[0]?.trailerUrl || episodesRaw[0]?.trailer;
      const resolvedTrailer = rawTrailer ? getImageUrl(rawTrailer) : (firstEpTrailer ? getImageUrl(firstEpTrailer) : "");

      const seasonMap = new Map<number, Episode[]>();

      // Ingest seasonsRaw if nested episodes exist
      seasonsRaw.forEach((s: any) => {
        const sNum = Number(s.season ?? s.seasonNumber ?? 1);
        if (!seasonMap.has(sNum)) seasonMap.set(sNum, []);
        if (Array.isArray(s.episodes)) {
          s.episodes.forEach((e: any) => {
            seasonMap.get(sNum)!.push({
              id: e._id || e.id,
              season: sNum,
              episodeNumber: Number(e.episode ?? e.episodeNumber ?? 1),
              title: e.title || `Episode ${e.episode ?? e.episodeNumber ?? 1}`,
              description: e.description || e.shortDescription || "",
              duration: e.duration || 0,
              thumbnail: getImageUrl(e.thumbnail || e.poster || raw.backdrop || raw.poster),
              isFree: e.isFree ?? !e.isLocked,
              isLocked: e.isLocked ?? !e.isFree,
              videoUrl: e.hlsUrl || e.videoUrl || "",
              trailerUrl: e.trailerUrl ? getImageUrl(e.trailerUrl) : (e.trailer ? getImageUrl(e.trailer) : ""),
            });
          });
        }
      });

      // Ingest episodesRaw (prevent duplicates)
      episodesRaw.forEach((e: any) => {
        const sNum = Number(e.season ?? 1);
        if (!seasonMap.has(sNum)) seasonMap.set(sNum, []);
        const list = seasonMap.get(sNum)!;
        const eId = String(e._id || e.id);
        const epNum = Number(e.episode ?? e.episodeNumber ?? 1);
        const exists = list.some((x) => String(x.id) === eId || x.episodeNumber === epNum);
        if (!exists) {
          list.push({
            id: e._id || e.id,
            season: sNum,
            episodeNumber: epNum,
            title: e.title || `Episode ${epNum}`,
            description: e.description || e.shortDescription || "",
            duration: e.duration || 0,
            thumbnail: getImageUrl(e.thumbnail || e.poster || raw.backdrop || raw.poster),
            isFree: e.isFree ?? !e.isLocked,
            isLocked: e.isLocked ?? !e.isFree,
            videoUrl: e.hlsUrl || e.videoUrl || "",
            trailerUrl: e.trailerUrl ? getImageUrl(e.trailerUrl) : (e.trailer ? getImageUrl(e.trailer) : ""),
          });
        }
      });

      seasonMap.forEach((eps) => eps.sort((a, b) => a.episodeNumber - b.episodeNumber));

      let seasons: Season[] = [];
      if (seasonMap.size > 0) {
        seasons = Array.from(seasonMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([sNum, eps]) => ({
            seasonNumber: sNum,
            title: `Season ${sNum}`,
            episodes: eps,
          }));
      } else if (seasonsRaw.length > 0) {
        seasons = seasonsRaw.map((s: any) => ({
          seasonNumber: Number(s.season ?? s.seasonNumber ?? 1),
          title: s.title || `Season ${s.season ?? s.seasonNumber ?? 1}`,
          episodes: [],
        }));
      } else {
        seasons = [{ seasonNumber: 1, title: "Season 1", episodes: [] }];
      }

      return {
        id: raw._id || raw.id,
        title: raw.title || "Untitled",
        description: raw.description || raw.overview || "",
        poster: getImageUrl(raw.posterImage || raw.poster || raw.thumbnail),
        backdrop: getImageUrl(raw.backdrop || raw.bannerImage || raw.banner || raw.posterImage || raw.poster),
        trailerUrl: resolvedTrailer,
        imdbRating: raw.imdbRating ? String(raw.imdbRating) : (raw.rating ? String(raw.rating) : "8.5"),
        ageRating: raw.ageRating || raw.maturityRating || "16+",
        year: raw.releaseDate ? String(new Date(raw.releaseDate).getFullYear()) : String(raw.year || 2026),
        genres: Array.isArray(raw.genres)
          ? raw.genres.map((g: any) => (typeof g === "object" ? g.name : g))
          : (raw.genre ? [raw.genre] : ["Drama"]),
        featured: Boolean(raw.featured || raw.isFeatured),
        isPremium: Boolean(raw.isPremium ?? true),
        seasonsCount: seasons.length || raw.seasonsCount || 1,
        episodesCount: episodesRaw.length || raw.episodesCount || 1,
        seasons,
        cast: Array.isArray(raw.cast) ? raw.cast : [],
        releaseDate: raw.releaseDate,
        director: raw.director,
        language: raw.language || "Hindi",
      };
    }
    return undefined;
  }, [serverShowData, fallbackEpisodesRes]);

  // Derived trailer source
  const showTrailerSrc = useMemo(() => {
    if (!show) return "";
    if (show.trailerUrl) return show.trailerUrl;
    const ep1 = show.seasons?.[0]?.episodes?.[0];
    if (ep1?.trailerUrl) return ep1.trailerUrl;
    return "";
  }, [show]);

  // Background trailer video playback in hero backdrop
  useEffect(() => {
    const v = trailerVideoRef.current;
    if (!v || !showTrailerSrc) {
      setHeroVideoReady(false);
      return;
    }

    let destroyed = false;
    if (trailerHlsRef.current) {
      trailerHlsRef.current.destroy();
      trailerHlsRef.current = null;
    }

    const playSafe = () => {
      if (destroyed) return;
      v.muted = trailerMuted;
      v.defaultMuted = trailerMuted;
      v.play().catch(() => {
        if (!v.muted) {
          v.muted = true;
          v.play().catch(() => {});
        }
      });
    };

    const isM3u8 = showTrailerSrc.includes(".m3u8");
    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, maxBufferLength: 30, lowLatencyMode: true });
      trailerHlsRef.current = hls;
      hls.loadSource(showTrailerSrc);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyed) return;
        setHeroVideoReady(true);
        playSafe();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        }
      });
    } else if (isM3u8 && v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = showTrailerSrc;
      const onReady = () => {
        if (destroyed) return;
        setHeroVideoReady(true);
        playSafe();
      };
      v.addEventListener("canplay", onReady, { once: true });
      v.addEventListener("loadeddata", onReady, { once: true });
      v.load();
    } else {
      v.src = showTrailerSrc;
      const onReady = () => {
        if (destroyed) return;
        setHeroVideoReady(true);
        playSafe();
      };
      v.addEventListener("canplay", onReady, { once: true });
      v.addEventListener("loadeddata", onReady, { once: true });
      if (v.readyState >= 2) {
        onReady();
      } else {
        v.load();
      }
    }

    return () => {
      destroyed = true;
      if (trailerHlsRef.current) {
        trailerHlsRef.current.destroy();
        trailerHlsRef.current = null;
      }
    };
  }, [showTrailerSrc]);

  useEffect(() => {
    if (trailerVideoRef.current) {
      trailerVideoRef.current.muted = trailerMuted;
    }
  }, [trailerMuted]);

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

  const isEpisodesLoading = Boolean(
    isFetching || isFetchingFallbackEpisodes || isLoadingFallbackEpisodes
  );

  if (isLoading || (!show && (isFetching || isFetchingFallbackEpisodes))) {
    return (
      <div className="min-h-screen bg-[#0c0c14] text-white flex flex-col justify-between selection:bg-amber-400/30">
        <PublicHeader
          activeTab={"tvshows" as any}
          setActiveTab={(tab: any) => {
            if (tab === "home") setLocation("/");
            else if (tab === "movies") setLocation("/browse?type=movie");
            else setLocation("/tv-shows");
          }}
          onSignIn={() => setLocation("/login")}
        />

        {/* Cinematic Hero Skeleton */}
        <section className="relative w-full overflow-hidden bg-zinc-950" style={{ minHeight: "520px", height: "70vh" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/60 to-zinc-950 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c14] via-[#0c0c14]/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[65%] bg-gradient-to-t from-[#0c0c14] via-[#0c0c14]/60 to-transparent" />

          <div className="absolute bottom-10 sm:bottom-14 left-4 sm:left-10 lg:left-14 right-4 sm:right-10 lg:right-14 max-w-3xl z-10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-24 bg-amber-400/20 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="h-10 sm:h-14 w-3/4 max-w-lg bg-white/15 rounded-2xl animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-6 w-16 bg-amber-400/20 rounded-md animate-pulse" />
              <div className="h-6 w-12 bg-white/10 rounded-md animate-pulse" />
              <div className="h-6 w-28 bg-white/10 rounded-md animate-pulse" />
            </div>
            <div className="space-y-2 pt-2 max-w-xl">
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-4 pt-4">
              <div className="h-12 w-40 bg-amber-400/30 rounded-2xl animate-pulse" />
              <div className="h-12 w-32 bg-white/10 rounded-2xl animate-pulse" />
              <div className="h-12 w-12 bg-white/10 rounded-2xl animate-pulse" />
            </div>
          </div>
        </section>

        {/* Episodes Grid Skeleton */}
        <div className="px-4 sm:px-10 lg:px-14 py-10 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-2">
              <div className="h-7 w-32 bg-white/15 rounded-lg animate-pulse" />
              <div className="h-4 w-44 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 bg-amber-400/20 rounded-xl animate-pulse" />
              <div className="h-9 w-24 bg-white/10 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 p-3.5 rounded-2xl bg-zinc-900/40 border border-white/5 animate-pulse">
                <div className="w-full sm:w-36 md:w-44 lg:w-48 aspect-video rounded-xl bg-zinc-800/80 shrink-0 flex items-center justify-center">
                  <Tv className="w-7 h-7 text-amber-400/30 animate-pulse" />
                </div>
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="h-3.5 w-16 bg-white/15 rounded" />
                  <div className="h-4 w-3/4 bg-white/20 rounded" />
                  <div className="h-3 w-full bg-white/10 rounded" />
                  <div className="h-3 w-2/3 bg-white/10 rounded" />
                  <div className="h-4 w-28 bg-amber-400/20 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

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

  const handleToggleWatchlist = async () => {
    const added = toggleTvShowWatchlist(show.id);
    setInWatchlist(added);
    try {
      await toggleWishlistMutation.mutateAsync({
        contentId: show.id,
        contentType: 'show',
      });
    } catch (e) {
      console.warn("Backend toggleWishlist error:", e);
    }
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
    setLocation(`/tv-shows/${show.id}/watch/${ep.episodeNumber}?season=${ep.season}`);
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
            el.style.opacity = "0";
          }}
        />

        {/* Video Trailer Preview in Backdrop */}
        {showTrailerSrc && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${heroVideoReady ? "opacity-100" : "opacity-0"}`}>
            <video
              ref={trailerVideoRef}
              className="absolute inset-0 w-full h-full object-cover object-top"
              playsInline
              muted
              autoPlay
              loop
              poster={show.backdrop || show.poster}
            />
          </div>
        )}

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

        {/* Mute / Unmute Trailer button */}
        {showTrailerSrc && heroVideoReady && (
          <button
            onClick={() => setTrailerMuted((m) => !m)}
            className="absolute top-20 sm:top-24 right-4 sm:right-10 lg:right-14 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-amber-400 hover:text-black border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
            aria-label={trailerMuted ? "Unmute Trailer" : "Mute Trailer"}
          >
            {trailerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}

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
                } else if (showTrailerSrc) {
                  setTrailerModalOpen(true);
                }
              }}
              className="flex items-center gap-2.5 px-7 sm:px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl text-sm tracking-wide transition-all active:scale-95 shadow-xl shadow-amber-500/25 hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black" />
              {isSubscribed ? "Watch Now" : firstEpisode?.isFree ? "Watch Free (EP 1)" : firstEpisode ? "Watch Now" : "Play Trailer"}
            </button>

            {/* Watch Trailer Button */}
            {showTrailerSrc && (
              <button
                onClick={() => setTrailerModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl text-sm border border-white/15 transition-all active:scale-95 hover:-translate-y-0.5 cursor-pointer shadow-lg"
              >
                <Film className="w-4 h-4 text-amber-400" /> Watch Trailer
              </button>
            )}

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
          {isEpisodesLoading && episodes.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 p-3.5 rounded-2xl bg-zinc-900/40 border border-white/5 animate-pulse">
                  <div className="w-full sm:w-36 md:w-44 lg:w-48 aspect-video rounded-xl bg-zinc-800/80 shrink-0 flex items-center justify-center">
                    <Tv className="w-7 h-7 text-amber-400/30 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-2.5 py-1">
                    <div className="h-3.5 w-16 bg-white/15 rounded" />
                    <div className="h-4 w-3/4 bg-white/20 rounded" />
                    <div className="h-3 w-full bg-white/10 rounded" />
                    <div className="h-3 w-2/3 bg-white/10 rounded" />
                    <div className="h-4 w-28 bg-amber-400/20 rounded mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : episodes.length === 0 ? (
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

      {/* Trailer Modal Dialog */}
      {trailerModalOpen && showTrailerSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">Official Trailer • {show.title}</span>
              </div>
              <button
                onClick={() => setTrailerModalOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close Trailer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black">
              <VideoPlayer
                src={showTrailerSrc}
                poster={show.backdrop || show.poster}
                title={`${show.title} - Official Trailer`}
                onClose={() => setTrailerModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
