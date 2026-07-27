import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Heart, Star, Share2, Lock,
  Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
  SkipForward, Home, Loader2, X, CreditCard, Crown,
  Settings, Check, RotateCcw, RotateCw, SkipBack, Plus, Download
} from "lucide-react";
import { PublicHeader, PublicFooter } from "./streaming-home";
import { WebsiteReviews } from "@/components/WebsiteReviews";
import Hls from "hls.js";
import { useGetWebSubscriptionPlans, useCreateSubscription, useGetWebDetail, getImageUrl, useGetPublicAds, useGetAppProfile, useToggleLike, useRequestDownload, useRemoveDownload, useGetWishlist, useToggleWishlist, useSaveWatchProgress, useGetWatchProgress, getOfflineVideoUrl, useGetDownloads, cacheDownloadedVideo, removeOfflineVideo, useRecordView, useRecordShare } from "@/lib/api-client";
import { PlayerPrerollAd } from "@/components/AdComponents";
import { useToast } from "@/hooks/use-toast";
import { LandscapeCard } from "@/components/ContentCard";
/* ─── AD OVERLAY ─── */
function AdOverlay({ ad, onSkip }: { ad: any; onSkip: () => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
    return () => clearInterval(timer);
  }, []);

  const adSrc = ad.urlType === "URL" ? ad.mediaUrl : getImageUrl(ad.mediaUrl);

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center">
      {ad.adType === "Video" ? (
        <video src={adSrc} className="w-full h-full object-contain" autoPlay onEnded={onSkip} playsInline />
      ) : ad.adType === "Image" ? (
        <a href={ad.redirectUrl || "#"} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center">
          <img src={adSrc} alt={ad.adName} className="max-w-full max-h-full object-contain" />
        </a>
      ) : (
        <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: ad.mediaUrl }} />
      )}
      <div className="absolute bottom-4 right-4 flex items-center gap-3">
        <span className="text-foreground/80 text-xs bg-black/60 px-2 py-1 rounded">Advertisement</span>
        {countdown > 0 ? (
          <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg font-bold border border-zinc-700">Skip in {countdown}s</span>
        ) : (
          <button onClick={onSkip} className="bg-white/90 hover:bg-white text-black text-xs font-black px-3 py-1.5 rounded-lg transition-colors">Skip Ad ›</button>
        )}
      </div>
    </div>
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s) || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────────
   VIDEO PLAYER COMPONENT
   Props:
     videoSrc   — episode video URL (from getEpisodeVideo)
     thumbnail  — poster image shown before play
     autoPlay   — true when navigating from one episode to another
     onNext     — called when user clicks SkipForward / video ends
   ───────────────────────────────────────────────────────────── */
function VideoPlayer({
  videoSrc,
  thumbnail,
  autoPlay = false,
  onNext,
  videoSettings,
  contentId,
  resumeFrom,
  subtitles = [],
}: {
  videoSrc: string;
  thumbnail: string;
  autoPlay?: boolean;
  onNext?: () => void;
  videoSettings?: Array<{ key: string; label: string; description?: string; url: string }> | null;
  contentId?: string;
  resumeFrom?: number;
  subtitles?: Array<{ language: string; code?: string; filePath?: string; url?: string }>;
}) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout>>();
  const hlsRef        = useRef<Hls | null>(null);
  // Seed with resumeFrom so the first canplay/manifest event seeks to the saved position
  const pendingSeekRef = useRef<number | null>(resumeFrom && resumeFrom > 5 ? resumeFrom : null);

  const [playing,        setPlaying]        = useState(false);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [duration,       setDuration]       = useState(0);
  const [volume,         setVolume]         = useState(0.8);
  const [muted,          setMuted]          = useState(false);
  const [buffered,       setBuffered]       = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [skipAnim,       setSkipAnim]       = useState<"left"|"right"|null>(null);

  // Quality & Speed Settings state
  const [currentSrc,     setCurrentSrc]     = useState(() => videoSrc ? getImageUrl(videoSrc) : "");
  const [currentQuality, setCurrentQuality] = useState("auto");
  const [speed,          setSpeed]          = useState(1.0);
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [currentMenu,    setCurrentMenu]    = useState<"main" | "quality" | "speed" | "subtitles">("main");
  const [activeSubtitle, setActiveSubtitle] = useState<string>("off");

  const saveProgressMutation = useSaveWatchProgress();
  const lastSavedTimeRef = useRef(0);
  const resumeAppliedRef = useRef(false);

  const recordViewMutation = useRecordView();
  const viewRecordedRef = useRef(false);

  useEffect(() => {
    if (playing && !viewRecordedRef.current && contentId) {
      viewRecordedRef.current = true;
      recordViewMutation.mutate({ contentId, contentType: 'movie' });
    }
  }, [playing, contentId]);

  // If resumeFrom arrives after mount (async), apply it before the video has started
  useEffect(() => {
    if (resumeFrom && resumeFrom > 5 && !resumeAppliedRef.current && currentTime < 2) {
      pendingSeekRef.current = resumeFrom;
    }
  }, [resumeFrom]);

  useEffect(() => {
    if (!contentId || !duration) return;
    const token = localStorage.getItem("appAccessToken");
    if (!token) return;

    const diff = Math.abs(currentTime - lastSavedTimeRef.current);
    if (duration > 20 && (diff >= 10 || (!playing && currentTime > 2 && diff > 1))) {
      lastSavedTimeRef.current = currentTime;
      saveProgressMutation.mutate({
        contentId,
        progressSeconds: Math.round(currentTime),
        durationSeconds: Math.round(duration),
      });
    }
  }, [currentTime, duration, contentId, playing]);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    if (playing) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [playing]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // Sync parent videoSrc
  useEffect(() => {
    setCurrentSrc(videoSrc ? getImageUrl(videoSrc) : "");
    setCurrentQuality("auto");
    setSpeed(1.0);
    setSettingsOpen(false);
    setCurrentMenu("main");
  }, [videoSrc]);

  /* play / pause */
  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { await v.play().catch(() => {}); }
    else          { v.pause(); }
    revealControls();
  }, [revealControls]);

  /* seek */
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
    revealControls();
  };

  const skip = useCallback((sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + sec));
    setSkipAnim(sec > 0 ? "right" : "left");
    setTimeout(() => setSkipAnim(null), 600);
    revealControls();
  }, [revealControls]);

  /* volume */
  const handleVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted  = val === 0;
    setVolume(val);
    setMuted(val === 0);
    revealControls();
  };

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      v.muted = false;
      if (v.volume === 0) { v.volume = 0.8; setVolume(0.8); }
      setMuted(false);
    } else {
      v.muted = true;
      setMuted(true);
    }
    revealControls();
  }, [revealControls]);

  /* fullscreen */
  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current as any;
    const v = videoRef.current as any;
    if (!c || !v) return;

    const doc = document as any;
    const isFull = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!isFull) {
      const req = c.requestFullscreen || c.webkitRequestFullscreen || c.mozRequestFullScreen || c.msRequestFullscreen;
      if (req) {
        req.call(c).then(() => {
          (screen.orientation as any)?.lock?.('landscape').catch(() => {});
        }).catch(() => {});
      } else if (v.webkitEnterFullscreen) {
        v.webkitEnterFullscreen();
      }
    } else {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exit) {
        exit.call(doc).then(() => {
          (screen.orientation as any)?.unlock?.();
        }).catch(() => {});
      }
    }
  }, []);

  /* video element events */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => {
      setPlaying(true);
      scheduleHide();
    };
    const onPause = () => {
      setPlaying(false);
      clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
    };
    const onEnded = () => {
      setPlaying(false);
      clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
      onNext?.();
    };
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDuration   = () => { if (isFinite(v.duration)) setDuration(v.duration); };
    const onProgress   = () => {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onWaiting    = () => setLoading(true);
    const onCanPlay    = () => setLoading(false);

    v.addEventListener("play",           onPlay);
    v.addEventListener("pause",          onPause);
    v.addEventListener("ended",          onEnded);
    v.addEventListener("timeupdate",     onTimeUpdate);
    v.addEventListener("durationchange", onDuration);
    v.addEventListener("loadedmetadata", onDuration);
    v.addEventListener("progress",       onProgress);
    v.addEventListener("waiting",        onWaiting);
    v.addEventListener("canplay",        onCanPlay);
    v.addEventListener("playing",        onCanPlay);

    return () => {
      v.removeEventListener("play",           onPlay);
      v.removeEventListener("pause",          onPause);
      v.removeEventListener("ended",          onEnded);
      v.removeEventListener("timeupdate",     onTimeUpdate);
      v.removeEventListener("durationchange", onDuration);
      v.removeEventListener("loadedmetadata", onDuration);
      v.removeEventListener("progress",       onProgress);
      v.removeEventListener("waiting",        onWaiting);
      v.removeEventListener("canplay",        onCanPlay);
      v.removeEventListener("playing",        onCanPlay);
    };
  }, [scheduleHide, onNext]);

  // Listen to watch now triggers to play in fullscreen
  useEffect(() => {
    const handleForcePlay = () => {
      setPlaying(true);
      const v = videoRef.current;
      if (v) {
        v.play().catch(() => {});
        const el = containerRef.current;
        const doc = document as any;
        const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
        if (el && !isFull) {
          const req = el.requestFullscreen || (el as any).webkitRequestFullscreen || (el as any).mozRequestFullScreen || (el as any).msRequestFullscreen;
          if (req) req.call(el).catch(() => {});
        }
      }
    };
    window.addEventListener('force-play-fullscreen', handleForcePlay);
    return () => window.removeEventListener('force-play-fullscreen', handleForcePlay);
  }, []);

  // Load source with HLS support
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    setLoading(true);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const loadSource = async () => {
      const offlineUrl = await getOfflineVideoUrl(contentId || "");
      const activeSrc = offlineUrl || getImageUrl(currentSrc);

      if (!activeSrc) {
        setLoading(false);
        return;
      }

      const isM3u8 = activeSrc.includes(".m3u8") && !offlineUrl;
      const onManifestParsed = () => {
        setLoading(false);
        if (pendingSeekRef.current !== null) {
          v.currentTime = pendingSeekRef.current;
          pendingSeekRef.current = null;
          resumeAppliedRef.current = true;
        }
        v.playbackRate = speed;
        const shouldPlay = playing || autoPlay;
        if (shouldPlay) v.play().catch(() => {});
      };

      if (isM3u8 && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          startLevel: currentQuality === "auto" ? -1 : undefined,
        });
        hlsRef.current = hls;
        hls.loadSource(activeSrc);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (currentQuality === "auto") hls.currentLevel = -1;
          onManifestParsed();
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            console.error("HLS fatal error", data);
            setLoading(false);
          }
        });
      } else if (isM3u8 && v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = activeSrc;
        v.addEventListener("loadedmetadata", onManifestParsed, { once: true });
      } else {
        v.src = activeSrc;
        v.load();
        const onCanPlay = () => {
          setLoading(false);
          if (pendingSeekRef.current !== null) {
            v.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
            resumeAppliedRef.current = true;
          }
          v.playbackRate = speed;
          const shouldPlay = playing || autoPlay;
          if (shouldPlay) v.play().catch(() => {});
          v.removeEventListener("canplay", onCanPlay);
        };
        v.addEventListener("canplay", onCanPlay);
      }
    };

    loadSource();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSrc, autoPlay, contentId]);


  // Apply selected subtitle track
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = Array.from(v.textTracks || []);
    tracks.forEach((t) => {
      const match =
        activeSubtitle !== "off" &&
        (t.label === activeSubtitle || t.language === activeSubtitle);
      t.mode = match ? "showing" : "disabled";
    });
  }, [activeSubtitle, currentSrc, subtitles]);

  // When tracks load late (after metadata), re-apply selection
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onAdd = () => {
      const tracks = Array.from(v.textTracks || []);
      tracks.forEach((t) => {
        const match =
          activeSubtitle !== "off" &&
          (t.label === activeSubtitle || t.language === activeSubtitle);
        t.mode = match ? "showing" : "disabled";
      });
    };
    v.textTracks?.addEventListener?.("addtrack", onAdd as any);
    return () => v.textTracks?.removeEventListener?.("addtrack", onAdd as any);
  }, [activeSubtitle]);

  // Apply playback speed rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [currentSrc, speed]);

  /* set initial volume */
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = volume;
  }, []);

  /* fullscreen change */
  useEffect(() => {
    const onChange = () => {
      const doc = document as any;
      const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      setIsFullscreen(isFull);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    document.addEventListener("mozfullscreenchange", onChange);
    document.addEventListener("MSFullscreenChange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      document.removeEventListener("mozfullscreenchange", onChange);
      document.removeEventListener("MSFullscreenChange", onChange);
    };
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.code) {
        case "Space":
          e.preventDefault(); togglePlay(); break;
        case "ArrowLeft":
          e.preventDefault(); skip(-10); break;
        case "ArrowRight":
          e.preventDefault(); skip(10); break;
        case "ArrowUp":
          e.preventDefault();
          v.volume = Math.min(1, parseFloat((v.volume + 0.1).toFixed(2)));
          v.muted = false; setVolume(v.volume); setMuted(false); revealControls(); break;
        case "ArrowDown":
          e.preventDefault();
          v.volume = Math.max(0, parseFloat((v.volume - 0.1).toFixed(2)));
          setVolume(v.volume); setMuted(v.volume === 0); revealControls(); break;
        case "KeyM": toggleMute(); break;
        case "KeyF": toggleFullscreen(); break;
        case "KeyN": onNext?.(); break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, revealControls, onNext, skip]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const changeQuality = (key: string, url: string) => {
    const v = videoRef.current;
    if (!v) return;
    const time = v.currentTime;
    const wasPlaying = !v.paused;
    pendingSeekRef.current = time;
    setCurrentQuality(key);

    // Prefer switching HLS ABR level when master playlist is loaded
    const hls = hlsRef.current;
    if (hls && key === "auto" && hls.levels?.length) {
      hls.currentLevel = -1;
      hls.loadLevel = -1;
      setSettingsOpen(false);
      return;
    }
    if (hls && key !== "auto" && hls.levels?.length) {
      const wantH = parseInt(String(key).replace(/[^0-9]/g, ""), 10);
      const idx = hls.levels.findIndex((lvl) => {
        const h = lvl.height || 0;
        if (wantH && h === wantH) return true;
        if (wantH && Math.abs(h - wantH) <= 8) return true;
        return key.includes(String(h)) || (lvl.name && String(lvl.name).includes(String(wantH || key)));
      });
      if (idx >= 0) {
        hls.currentLevel = idx;
        setSettingsOpen(false);
        return;
      }
    }

    // Fallback: swap source to quality-specific playlist / file
    setCurrentSrc(getImageUrl(url || videoSrc));
    setTimeout(() => {
      if (videoRef.current && wasPlaying) videoRef.current.play().catch(() => {});
    }, 150);
    setSettingsOpen(false);
  };

  /* derived */
  const seekPct    = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct     = duration > 0 ? (buffered   / duration) * 100 : 0;
  const displayVol = muted ? 0 : volume;
  const VolumeIcon = displayVol === 0 ? VolumeX : displayVol < 0.5 ? Volume1 : Volume2;
  const FsIcon     = isFullscreen ? Minimize : Maximize;
  const ctrlShow   = controlsVisible || !playing;

  const fmtTime = (sec: number) => {
    if (!isFinite(sec)) return "00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black overflow-hidden w-full h-full select-none"
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (playing) {
          clearTimeout(hideTimerRef.current);
          setControlsVisible(false);
        }
      }}
      onTouchStart={revealControls}
    >
      {/* Real video element */}
      <video
        ref={videoRef}
        poster={thumbnail}
        className="absolute inset-0 w-full h-full object-contain"
        preload="metadata"
        playsInline
        onClick={togglePlay}
        style={{ outline: "none" }}
        crossOrigin="anonymous"
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v) return;
          if (isFinite(v.duration)) setDuration(v.duration);
          if (pendingSeekRef.current !== null) {
            v.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          }
          v.playbackRate = speed;
          const shouldPlay = playing || autoPlay;
          if (shouldPlay) {
            v.play().catch(() => {});
          }
        }}
      >
        {(subtitles || []).map((sub) => {
          const src = getImageUrl(sub.url || sub.filePath || "");
          if (!src) return null;
          return (
            <track
              key={`${sub.language}-${src}`}
              kind="subtitles"
              src={src}
              srcLang={sub.code || "und"}
              label={sub.language}
            />
          );
        })}
      </video>

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25 pointer-events-none z-10" />

      {/* Buffering spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        </div>
      )}

      {/* Skip flash */}
      {skipAnim && (
        <div
          className={`absolute inset-y-0 flex items-center justify-center pointer-events-none z-20
            ${skipAnim === "right" ? "left-auto right-[15%]" : "left-[15%] right-auto"}`}
        >
          <div className="flex flex-col items-center gap-1 animate-skip-pop">
            <div className="flex">
              {skipAnim === "right"
                ? [0,1,2].map(i => <ChevronRight key={i} className={`w-6 h-6 text-amber-400 ${i===2?"opacity-100":i===1?"opacity-55":"opacity-20"}`} />)
                : [2,1,0].map(i => <ChevronRight key={i} className={`w-6 h-6 text-amber-400 rotate-180 ${i===0?"opacity-100":i===1?"opacity-55":"opacity-20"}`} />)}
            </div>
            <span className="text-amber-400 text-[10px] font-black">{skipAnim === "right" ? "+10s" : "-10s"}</span>
          </div>
        </div>
      )}

      {/* Center play/pause controls overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 pointer-events-none ${
          ctrlShow ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-6 pointer-events-auto">
          {/* Skip back */}
          <button
            onClick={(e) => { e.stopPropagation(); skip(-10); }}
            className="w-11 h-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60 transition-all duration-200 active:scale-90"
          >
            <RotateCcw className="w-4 h-4 text-foreground" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center shadow-lg shadow-amber-900/40 hover:scale-105 transition-all duration-200 active:scale-95 ${
              loading ? "opacity-0 pointer-events-none scale-90" : "opacity-100"
            }`}
          >
            {playing
              ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black" />
              : <Play  className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black ml-1" />
            }
          </button>

          {/* Skip forward */}
          <button
            onClick={(e) => { e.stopPropagation(); skip(10); }}
            className="w-11 h-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60 transition-all duration-200 active:scale-90"
          >
            <RotateCw className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 bg-gradient-to-t from-black/90 to-transparent pb-3 pt-6 ${
          ctrlShow ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Seek bar */}
        <div className="px-3 sm:px-4">
          <div className="relative h-5 sm:h-4 flex items-center group/seek cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-x-0 h-[4px] sm:h-[3px] bg-white/20 rounded-full" />
            <div className="absolute h-[4px] sm:h-[3px] bg-white/35 rounded-full" style={{ width: `${bufPct}%` }} />
            <div className="absolute h-[4px] sm:h-[3px] bg-amber-400 rounded-full" style={{ width: `${seekPct}%` }} />
            <div
              className="absolute w-3.5 h-3.5 sm:w-3 sm:h-3 bg-amber-400 border border-white/50 rounded-full shadow-lg scale-100 sm:scale-0 sm:group-hover/seek:scale-100 transition-transform -translate-x-1/2 pointer-events-none"
              style={{ left: `${seekPct}%` }}
            />
            <input
              type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
              onChange={handleSeek} onMouseDown={revealControls} onTouchStart={revealControls}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Seek"
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="px-2 sm:px-3 mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-foreground hover:text-amber-400 transition-colors p-1">
              {playing ? <Pause className="w-[16px] h-[16px] fill-current" /> : <Play className="w-[16px] h-[16px] fill-current ml-px" />}
            </button>

            {/* Next episode */}
            {onNext && (
              <button
                onClick={onNext}
                className="text-foreground hover:text-amber-400 p-1 transition-colors"
                title="Next Episode (N)"
              >
                <SkipForward className="w-[14px] h-[14px]" />
              </button>
            )}

            {/* Timestamp */}
            <span className="text-foreground text-[11px] tabular-nums select-none px-1">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Volume */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={toggleMute} className="text-foreground hover:text-amber-400 transition-colors p-2 sm:p-1 touch-manipulation" title="Mute (M)" aria-label="Mute">
                <VolumeIcon className="w-4 h-4 sm:w-[15px] sm:h-[15px]" />
              </button>
              <div className="relative w-14 h-5 hidden sm:flex items-center">
                <div className="absolute inset-x-0 h-[2px] bg-white/20 rounded-full" />
                <div className="absolute h-[2px] bg-amber-400 rounded-full" style={{ width: `${displayVol * 100}%` }} />
                <input
                  type="range" min={0} max={1} step={0.05} value={displayVol}
                  onChange={(e) => handleVolume(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  aria-label="Volume"
                />
              </div>
            </div>

            {/* Settings Menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  setCurrentMenu("main");
                }}
                className={`text-foreground hover:text-amber-400 transition-all duration-300 p-2 sm:p-1 touch-manipulation ${settingsOpen ? "text-amber-400 rotate-45 scale-110" : ""}`}
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 sm:w-[15px] sm:h-[15px]" />
              </button>

              {settingsOpen && (
                <div className="absolute bottom-11 right-0 z-50 bg-[#0d0d16]/95 border border-amber-400/20 backdrop-blur-md rounded-xl p-2.5 w-[min(240px,78vw)] max-h-[min(55vh,320px)] overflow-y-auto text-xs text-foreground shadow-2xl flex flex-col gap-0.5">
                  {currentMenu === "main" && (
                    <>
                      <div className="text-[9px] uppercase font-bold text-foreground tracking-wider px-2 pb-1.5 border-b border-white/5">Settings</div>
                      <button
                        onClick={() => setCurrentMenu("quality")}
                        className="flex items-center justify-between w-full px-2 py-2.5 sm:py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors touch-manipulation"
                      >
                        <span>Quality</span>
                        <span className="text-[10px] text-foreground/80 flex items-center gap-0.5">
                          {videoSettings && videoSettings.find(q => q.key === currentQuality)?.label || "Auto"}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                      <button
                        onClick={() => setCurrentMenu("subtitles")}
                        className="flex items-center justify-between w-full px-2 py-2.5 sm:py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors touch-manipulation"
                      >
                        <span>Subtitles</span>
                        <span className="text-[10px] text-foreground/80 flex items-center gap-0.5">
                          {activeSubtitle === "off" ? "Off" : activeSubtitle}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                      <button
                        onClick={() => setCurrentMenu("speed")}
                        className="flex items-center justify-between w-full px-2 py-2.5 sm:py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors touch-manipulation"
                      >
                        <span>Speed</span>
                        <span className="text-[10px] text-foreground/80 flex items-center gap-0.5">
                          {speed === 1.0 ? "Normal" : `${speed}x`}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                    </>
                  )}

                  {currentMenu === "quality" && (
                    <>
                      <button
                        onClick={() => setCurrentMenu("main")}
                        className="flex items-center gap-0.5 w-full px-2 py-1.5 text-[10px] text-foreground/80 hover:text-foreground transition-colors mb-0.5 font-bold touch-manipulation"
                      >
                        <ChevronLeft className="w-2.5 h-2.5" /> Back
                      </button>
                      <div className="text-[9px] uppercase font-bold text-foreground tracking-wider px-2 pb-1.5 border-b border-white/5">Quality</div>
                      <div className="max-h-40 sm:max-h-36 overflow-y-auto mt-1 flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            const autoUrl = videoSettings?.find(q => q.key === 'auto')?.url || videoSrc;
                            changeQuality("auto", autoUrl);
                            setSettingsOpen(false);
                          }}
                          className="flex items-center justify-between w-full px-2 py-2.5 sm:py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors touch-manipulation"
                        >
                          <span className={currentQuality === "auto" ? "text-amber-400 font-bold" : "text-foreground"}>Auto</span>
                          {currentQuality === "auto" && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                        {videoSettings && videoSettings.filter(q => q.key !== 'auto').map((q) => (
                          <button
                            key={q.key}
                            onClick={() => {
                              changeQuality(q.key, q.url);
                              setSettingsOpen(false);
                            }}
                            className="flex items-start justify-between w-full px-2 py-2.5 sm:py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors touch-manipulation"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className={currentQuality === q.key ? "text-amber-400 font-bold text-[11px]" : "text-foreground text-[11px]"}>{q.label}</span>
                              {q.description && <span className="text-foreground/80 text-[9px] leading-tight">{q.description}</span>}
                            </div>
                            {currentQuality === q.key && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />}
                          </button>
                        ))}

                      </div>
                    </>
                  )}

                  {currentMenu === "subtitles" && (
                    <>
                      <button
                        onClick={() => setCurrentMenu("main")}
                        className="flex items-center gap-0.5 w-full px-2 py-1.5 text-[10px] text-foreground/80 hover:text-foreground transition-colors mb-0.5 font-bold touch-manipulation"
                      >
                        <ChevronLeft className="w-2.5 h-2.5" /> Back
                      </button>
                      <div className="text-[9px] uppercase font-bold text-foreground tracking-wider px-2 pb-1.5 border-b border-white/5">Subtitles</div>
                      <div className="max-h-40 overflow-y-auto mt-1 flex flex-col gap-0.5">
                        <button
                          onClick={() => { setActiveSubtitle("off"); setSettingsOpen(false); }}
                          className="flex items-center justify-between w-full px-2 py-2.5 sm:py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors touch-manipulation"
                        >
                          <span className={activeSubtitle === "off" ? "text-amber-400 font-bold" : "text-foreground"}>Off</span>
                          {activeSubtitle === "off" && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                        {(subtitles || []).map((sub) => (
                          <button
                            key={sub.language}
                            onClick={() => { setActiveSubtitle(sub.language); setSettingsOpen(false); }}
                            className="flex items-center justify-between w-full px-2 py-2.5 sm:py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors touch-manipulation"
                          >
                            <span className={activeSubtitle === sub.language ? "text-amber-400 font-bold" : "text-foreground"}>{sub.language}</span>
                            {activeSubtitle === sub.language && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </button>
                        ))}
                        {(!subtitles || subtitles.length === 0) && (
                          <p className="px-2 py-2 text-[10px] text-foreground/50">No subtitles available</p>
                        )}
                      </div>
                    </>
                  )}

                  {currentMenu === "speed" && (
                    <>
                      <button
                        onClick={() => setCurrentMenu("main")}
                        className="flex items-center gap-0.5 w-full px-2 py-1.5 text-[10px] text-foreground/80 hover:text-foreground transition-colors mb-0.5 font-bold touch-manipulation"
                      >
                        <ChevronLeft className="w-2.5 h-2.5" /> Back
                      </button>
                      <div className="text-[9px] uppercase font-bold text-foreground tracking-wider px-2 pb-1.5 border-b border-white/5">Speed</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setSpeed(s);
                              setSettingsOpen(false);
                            }}
                            className="flex items-center justify-between w-full px-2 py-2.5 sm:py-1.5 rounded-lg hover:bg-white/10 text-left transition-colors touch-manipulation"
                          >
                            <span className={speed === s ? "text-amber-400 font-bold" : "text-foreground"}>{s === 1.0 ? "Normal" : `${s}x`}</span>
                            {speed === s && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-foreground hover:text-amber-400 transition-colors p-2 sm:p-1 touch-manipulation" aria-label="Fullscreen">
              <FsIcon className="w-4 h-4 sm:w-[15px] sm:h-[15px]" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes skip-pop {
          0%   { opacity:1; transform:scale(1); }
          60%  { opacity:1; transform:scale(1.15); }
          100% { opacity:0; transform:scale(0.85); }
        }
        .animate-skip-pop { animation: skip-pop 0.6s ease forwards; }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOCK / PAYWALL POPUP
   ───────────────────────────────────────────────────────────── */

function LockPopup({ onClose, onSubscribed }: { onClose: () => void; onSubscribed: () => void }) {
  const { toast } = useToast();
  const { data: plansData, isLoading: loadingPlans } = useGetWebSubscriptionPlans();
  const createSubMutation = useCreateSubscription();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {}
  }, []);

  const plans = plansData?.data || [];

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please login first to subscribe.", variant: "destructive" });
      window.location.href = "/login";
      return;
    }
    try {
      await createSubMutation.mutateAsync({
        userId: user.id || user._id,
        planId: plan.id || plan._id,
        startDate: new Date(),
        price: plan.price || plan.totalPrice,
        totalAmount: plan.totalPrice || plan.price,
        paymentMethod: 'Credit Card',
        status: 'active'
      });

      const updatedUser = {
        ...user,
        subscriptionPlan: plan.name,
        subscriptionStatus: 'active'
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast({ title: "Subscription Successful", description: `Successfully subscribed to ${plan.name}! Content unlocked.` });
      onSubscribed();
      onClose();
    } catch (err: any) {
      toast({ title: "Subscription Failed", description: err?.message || "An error occurred.", variant: "destructive" });
    }
  };

  /* prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 bg-[#111111] w-full sm:max-w-[500px] sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden border border-zinc-800 animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "90vh", overflowY: "auto" } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 sticky top-0 bg-[#111111] z-10">
          <span className="text-foreground font-extrabold text-sm flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-500 fill-amber-500" /> Choose Subscription Plan
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-foreground/80 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-foreground/80 text-xs text-center leading-relaxed">
            This content is locked. Subscribe to one of our premium plans to unlock the entire library!
          </p>

          {loadingPlans ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan: any) => {
                if (plan.name === "free") return null;
                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-amber-500/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-amber-400 font-bold text-sm uppercase tracking-wide">{plan.name}</h4>
                        <p className="text-foreground text-[11px] mt-0.5">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-foreground font-black text-lg">₹{plan.totalPrice || plan.price}</span>
                        <span className="text-foreground/80 text-[10px] block">/ {plan.duration || 'month'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800 text-[11px] text-foreground/80">
                      <span>Valid: <strong className="text-foreground">{plan.durationValue} {plan.duration}</strong></span>
                      {plan.discount > 0 && <span className="text-amber-400 font-bold">{plan.discount}% off</span>}
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={createSubMutation.isPending}
                        className="px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:bg-zinc-800 text-white font-bold rounded-lg transition-colors text-xs"
                      >
                        {createSubMutation.isPending ? "Connecting..." : "Subscribe"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export default function WatchPage() {
  const params = useParams<{ id: string; epNum?: string }>();
  const [, navigate] = useLocation();

  const [user, setUser] = useState<any>(null);
  const [adDismissed, setAdDismissed] = useState(false);
  const [playerStarted, setPlayerStarted] = useState(false);

  const { data: adsData } = useGetPublicAds({ placement: "Player" });
  const activeAds: any[] = adsData?.data || [];
  const currentAd = !adDismissed && playerStarted && activeAds.length > 0 ? activeAds[0] : null;

  const [showPreroll, setShowPreroll] = useState(() => {
    try {
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        return u.subscriptionStatus !== "active";
      }
    } catch(e) {}
    return true; // Default to showing preroll if no user
  });

  useEffect(() => {
    try {
      const appUserStr = localStorage.getItem("appUser");
      const userStr = localStorage.getItem("user");
      const parsedUser = appUserStr ? JSON.parse(appUserStr) : (userStr ? JSON.parse(userStr) : null);
      if (parsedUser) setUser(parsedUser);
      // Sync token key so API calls work for users who logged in via streaming-home
      if (!localStorage.getItem("appAccessToken") && localStorage.getItem("accessToken")) {
        localStorage.setItem("appAccessToken", localStorage.getItem("accessToken")!);
      }
    } catch (e) {}
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    setUser(null);
    window.location.reload();
  };

  const recordShareMutation = useRecordShare();

  const contentId = params.id || "";

  const { data: detailData, isLoading } = useGetWebDetail(contentId);
  const showData = (detailData as any)?.content || detailData;
  const related: any[] = (detailData as any)?.related || [];

  const title = showData?.title || "Movie";


  const thumbUrl = showData
    ? getImageUrl(showData.bannerImage || showData.thumbnail || showData.poster || "")
    : "";

  const detail = {
    genre: Array.isArray(showData?.genres) ? showData.genres.join(" · ") : "Movie",
    tags: Array.isArray(showData?.genres) ? showData.genres as string[] : [] as string[],
    description: showData?.description || "",
    likes: showData?.likes || 0,
    favorites: 0,
    thumbnail: thumbUrl,
    rating: showData?.imdbRating ? String(showData.imdbRating) : "8.5",
  };

  const handleSubscribed = useCallback(() => {
    try {
      const appUserStr = localStorage.getItem("appUser");
      const userStr = localStorage.getItem("user");
      const parsedUser = appUserStr ? JSON.parse(appUserStr) : (userStr ? JSON.parse(userStr) : null);
      if (parsedUser) setUser(parsedUser);
    } catch (e) {}
  }, []);

  const [currentEp, setCurrentEp]       = useState(() => parseInt(params.epNum || "1", 10));
  const [autoPlay,  setAutoPlay]        = useState(false);
  const [expanded,  setExpanded]        = useState(false);
  const [lockPopupOpen, setLockPopupOpen] = useState(false);

  // Fetch saved watch position so the player can resume from where the user left off
  const { data: savedProgress } = useGetWatchProgress(contentId || undefined);

  const { data: profileData } = useGetAppProfile();
  const { toast } = useToast();

  const { data: wishlistData } = useGetWishlist({ limit: 100 });
  const wishlistItems: any[] = wishlistData?.items || [];
  const inWatchlist = wishlistItems.some((w: any) => w.id === contentId || w.contentId === contentId);
  const toggleWishlistMutation = useToggleWishlist();

  const isLiked = profileData?.likeRecords?.some((l: any) => l.contentId === contentId) || false;

  const toggleLikeMutation = useToggleLike();

  // Downloads — use web endpoint as single source of truth (cross-device consistent)
  const { data: downloadsData } = useGetDownloads({ limit: 200 });
  const downloadItems: any[] = Array.isArray(downloadsData) ? downloadsData : [];
  const downloadRecord = downloadItems.find((d: any) => d.contentId === contentId);
  const isDownloaded = !!downloadRecord;
  const requestDownloadMutation = useRequestDownload();
  const removeDownloadMutation = useRemoveDownload();
  const [dlProgress, setDlProgress] = useState<number | null>(null);

  const handleDownloadToggle = useCallback(() => {
    if (!user) { navigate("/login"); return; }

    const record = downloadItems.find((d: any) => d.contentId === contentId);
    if (record) {
      removeDownloadMutation.mutate(
        { id: record.id, contentId },
        { onSuccess: async () => { await removeOfflineVideo(contentId); toast({ title: "Removed from downloads" }); } }
      );
    } else {
      requestDownloadMutation.mutate(
        { contentId, contentType: 'movie' },
        {
          onSuccess: async (data: any) => {
            const dlUrl = data?.data?.downloadUrl || data?.downloadUrl;
            if (dlUrl) {
              setDlProgress(0);
              const ok = await cacheDownloadedVideo(dlUrl, contentId, undefined, setDlProgress);
              setDlProgress(null);
              toast({ title: ok ? "Downloaded — available offline" : "Saved to downloads (online only)" });
            } else {
              toast({ title: "Added to downloads" });
            }
          },
          onError: (err: any) => toast({ title: "Download failed", description: err?.message || "Please try again.", variant: "destructive" }),
        }
      );
    }
  }, [user, navigate, downloadItems, contentId, removeDownloadMutation, requestDownloadMutation, toast]);

  const getPlanLevel = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "premium": return 3;
      case "standard": return 2;
      case "basic": return 1;
      default: return 0;
    }
  };

  // useGetAppProfile returns { user, likeRecords, ... } — subscription lives on user
  const profileUser = profileData?.user || profileData;
  const liveStatus = String(profileUser?.subscriptionStatus || user?.subscriptionStatus || "").toLowerCase();
  const livePlan   = String(profileUser?.subscriptionPlan   || user?.subscriptionPlan || "free").toLowerCase();
  const expiryRaw = profileUser?.subscriptionExpiry || user?.subscriptionExpiry;
  const hasPaidPlan =
    (profileUser?.subscription === true || (liveStatus === "active" && livePlan !== "free")) &&
    (!expiryRaw || new Date(expiryRaw).getTime() >= Date.now());
  const userPlan = hasPaidPlan ? livePlan : "free";
  const requiredPlan = String(showData?.planRequired || "free").toLowerCase();
  // Any active paid plan unlocks paid content (don't lock Standard users out of "premium" titles)
  const isLockedForContent = requiredPlan !== "free" && !hasPaidPlan;

  const goToEpisode = useCallback((ep: number) => {
    if (ep !== 0 && ep !== 1) return;
    if (ep !== 0) {
      const isLocked = (showData?.isPremium === true || requiredPlan !== "free") && isLockedForContent;
      if (isLocked) {
        setLockPopupOpen(true);
        return;
      }
    }
    setCurrentEp(ep);
    setAutoPlay(true);
    navigate(`/watch/${contentId}/${ep}`);
  }, [contentId, navigate, isLockedForContent, requiredPlan, showData]);

  const epLabel   = currentEp === 0 ? "Trailer" : "Movie";
  const epTitle   = currentEp === 0 ? `Trailer - ${title}` : title;
  const plotTitle = currentEp === 0 ? "About Trailer" : "Plot Synopsis";

  const videoSrc = (() => {
    if (currentEp === 0 && showData?.trailerUrl) return showData.trailerUrl;
    return showData?.hlsUrl || showData?.videoUrl || showData?.sourceVideoUrl || "";
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <PublicHeader
        activeTab="movies"
        setActiveTab={(tab) => {
          if (tab === "home") navigate("/");
          else navigate(`/browse/${tab}`);
        }}
        onSignIn={() => navigate("/login")}
        onSignOut={handleSignOut}
        user={user}
      />

      <main className="pt-[68px] pb-16 bg-[#09090b] text-foreground">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back button row */}
          <div className="pt-4 pb-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>

          {/* Player Container */}
          <div
            key={`${title}-ep-${currentEp}`}
            className="relative overflow-hidden bg-black shadow-2xl rounded-xl sm:rounded-2xl border border-zinc-900 mb-6 sm:mb-8 w-full min-h-[200px] sm:min-h-0"
            style={{ aspectRatio: "16 / 9" }}
            onClick={() => !playerStarted && setPlayerStarted(true)}
          >
            <VideoPlayer
              videoSrc={videoSrc}
              thumbnail={detail.thumbnail}
              autoPlay={autoPlay}
              videoSettings={showData?.videoSettings}
              contentId={contentId}
              resumeFrom={savedProgress?.progressPercent && savedProgress.progressPercent < 95 ? savedProgress.progressSeconds : undefined}
              subtitles={showData?.subtitles || []}
            />
            {currentAd && <AdOverlay ad={currentAd} onSkip={() => setAdDismissed(true)} />}

            {/* ── PRE-ROLL AD OVERLAY (page-level scope, correct showPreroll access) ── */}
            {showPreroll && (
              <div className="absolute inset-0 z-[400] rounded-2xl overflow-hidden">
                <PlayerPrerollAd onFinished={() => setShowPreroll(false)} />
              </div>
            )}
          </div>

          {/* Details and Content Blocks */}
          <div className="space-y-6">
            
            {/* 1. Main Info Block */}
            <div className="bg-zinc-900/20 border border-zinc-900/50 rounded-2xl p-5 sm:p-6 shadow-md">
              {/* Breadcrumb */}
              <nav className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground mb-3 select-none">
                <button onClick={() => navigate("/")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Home className="w-3.5 h-3.5" /> Home
                </button>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <button onClick={() => window.history.back()} className="hover:text-foreground transition-colors truncate max-w-[180px]">
                  {title}
                </button>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-foreground/70">{epLabel}</span>
              </nav>

              {/* Title */}
              <h1 className="text-foreground font-black text-xl sm:text-2xl lg:text-3xl leading-tight mb-4">
                {epTitle}
              </h1>

              {/* Plot */}
              <div className="mb-5">
                <h2 className="text-foreground font-bold text-sm mb-2">{plotTitle}</h2>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  {expanded ? detail.description : `${detail.description.slice(0, 130)}...`}
                  {" "}
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className="text-amber-400 hover:text-primary font-semibold transition-colors"
                  >
                    {expanded ? "Less" : "More"}
                  </button>
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {detail.tags.map(tag => (
                  <button key={tag} className="px-3 py-1.5 text-xs rounded-full border border-zinc-800 text-muted-foreground hover:text-foreground hover:border-zinc-500 transition-all bg-zinc-950/30">
                    {tag}
                  </button>
                ))}
              </div>

              {/* Actions: Like / Watchlist / Download / Share */}
              <div className="flex items-center gap-1 sm:gap-4 flex-wrap mb-6 -mx-1">
                {/* Like Button */}
                <button
                  onClick={() => {
                    if (!user) { navigate("/login"); return; }
                    toggleLikeMutation.mutate({ contentId, contentType: 'movie' as const }, {
                      onSuccess: (data: any) => toast({ title: data?.data?.isLikedByUser ? "Liked!" : "Like removed" }),
                      onError: () => toast({ title: "Failed to update like", variant: "destructive" }),
                    });
                  }}
                  disabled={toggleLikeMutation.isPending}
                  className={`flex flex-col items-center gap-1 px-3 sm:px-4 py-2 transition-all active:scale-95 touch-manipulation ${
                    isLiked ? "text-amber-400" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {toggleLikeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Heart className={`w-5 h-5 ${isLiked ? "fill-[#FFB800]" : ""}`} />
                  )}
                  <span className="text-[11px] font-semibold mt-0.5">{fmtCount(detail.likes + (isLiked ? 1 : 0))} Likes</span>
                </button>

                {/* Watchlist Button */}
                <button
                  onClick={() => {
                    if (!user) { navigate("/login"); return; }
                    toggleWishlistMutation.mutate(
                      { contentId, contentType: "movie" },
                      {
                        onSuccess: (data: any) => {
                          toast({
                            title: data?.message || (inWatchlist ? "Removed from Watchlist" : "Added to Watchlist"),
                          });
                        },
                      }
                    );
                  }}
                  disabled={toggleWishlistMutation.isPending}
                  className={`flex flex-col items-center gap-1 px-4 py-2 transition-all active:scale-95 ${
                    inWatchlist ? "text-amber-400" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {toggleWishlistMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className={`w-5 h-5 ${inWatchlist ? "rotate-45 text-amber-400" : ""}`} />
                  )}
                  <span className="text-[11px] font-semibold mt-0.5">
                    {inWatchlist ? "Wishlisted" : "Watchlist"}
                  </span>
                </button>

                {/* Download Button */}
                <button
                  onClick={() => handleDownloadToggle()}
                  disabled={requestDownloadMutation.isPending || removeDownloadMutation.isPending}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-foreground/80 hover:text-foreground transition-all active:scale-95 disabled:opacity-70"
                >
                  {requestDownloadMutation.isPending || removeDownloadMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isDownloaded ? (
                    <Check className="w-5 h-5 text-emerald-400" strokeWidth={3} />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span className="text-[11px] font-semibold mt-0.5">
                    {isDownloaded ? "Downloaded" : "Download"}
                  </span>
                </button>
              </div>

              {/* Cast & Crew Section */}
              {((showData?.cast && showData.cast.length > 0) || (showData?.crew && showData.crew.length > 0) || (showData?.crewMembers && showData.crewMembers.length > 0)) && (
                <div className="border-t border-zinc-900/80 pt-5 mt-5">
                  <h3 className="text-foreground font-bold text-sm mb-3">Cast & Crew</h3>
                  <div
                    className="flex gap-5 overflow-x-auto pb-2"
                    style={{ scrollbarWidth: "none" } as React.CSSProperties}
                  >
                    {showData.cast?.map((c: any) => (
                      <div key={`cast-${c.id}-${c.character}`} className="flex flex-col items-center text-center w-20 flex-shrink-0 group">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-300 shadow-md">
                          <img
                            src={getImageUrl(c.image || "")}
                            alt={c.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                            }}
                          />
                        </div>
                        <h4 className="text-foreground font-semibold text-[10px] sm:text-xs mt-2 line-clamp-1 group-hover:text-foreground transition-colors">{c.name}</h4>
                        <p className="text-foreground/80 text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 font-semibold">{c.character || c.role || 'Cast'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 3. RELATED CONTENT SECTION */}
          {related && related.length > 0 && (
            <div className="px-4 sm:px-6 lg:px-10 mt-12 border-t border-zinc-900 pt-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: "#e50914" }} />
                <h2 className="text-foreground font-black text-lg sm:text-xl tracking-tight">More Like This</h2>
                <div className="flex-1" />
                {detail.tags.length > 0 && (
                  <button
                    onClick={() => {
                      const firstGenre = detail.tags[0];
                      window.open(`/browse/movie?genre=${encodeURIComponent(firstGenre)}`, "_blank");
                    }}
                    className="text-foreground hover:text-primary text-xs transition-colors flex items-center gap-0.5 font-semibold"
                  >
                    See all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div
                className="flex gap-4 overflow-x-auto pb-2"
                style={{ scrollbarWidth: "none" } as React.CSSProperties}
              >
                {related.map((r: any) => (
                  <LandscapeCard key={r.id || r._id} item={r} onClick={() => navigate(`/movie/${r.id || r._id}`)} />
                ))}
              </div>
            </div>
          )}

          {/* Experience Reviews & Ratings Section */}
          <div className="px-4 sm:px-6 lg:px-10 mt-12 border-t border-zinc-900 pt-10">
            <WebsiteReviews 
              user={user} 
              onSignInRequired={() => navigate("/login")} 
            />
          </div>
        </div>
      </main>

      <PublicFooter />

      {lockPopupOpen && (
        <LockPopup
          onClose={() => setLockPopupOpen(false)}
          onSubscribed={handleSubscribed}
        />
      )}
    </div>
  );
}
