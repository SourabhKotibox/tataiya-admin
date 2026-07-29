import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Heart, Star, Share2, Lock, Unlock,
  Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
  SkipForward, Home, Loader2, X, CreditCard, Crown,
  Settings, Check, RotateCcw, RotateCw, SkipBack, Plus, Download, Sun
} from "lucide-react";
import { PublicHeader, PublicFooter } from "./streaming-home";
import { WebsiteReviews } from "@/components/WebsiteReviews";
import Hls from "hls.js";
import { useGetWebSubscriptionPlans, useCreateSubscription, useGetWebDetail, getImageUrl, useGetPublicAds, useGetAppProfile, useToggleLike, useRequestDownload, useRemoveDownload, useGetWishlist, useToggleWishlist, useSaveWatchProgress, useGetWatchProgress, getOfflineVideoUrl, useGetDownloads, cacheDownloadedVideo, removeOfflineVideo, hasOfflineVideo, useRecordView, useRecordShare } from "@/lib/api-client";
import { PlayerPrerollAd } from "@/components/AdComponents";
import { useToast } from "@/hooks/use-toast";
import { LandscapeCard } from "@/components/ContentCard";
import { useMiniPlayer } from "@/contexts/MiniPlayerContext";
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
  onPlaybackSnapshot,
}: {
  videoSrc: string;
  thumbnail: string;
  autoPlay?: boolean;
  onNext?: () => void;
  videoSettings?: Array<{ key: string; label: string; description?: string; url: string }> | null;
  contentId?: string;
  resumeFrom?: number;
  subtitles?: Array<{ language: string; code?: string; filePath?: string; url?: string }>;
  onPlaybackSnapshot?: (snap: { playing: boolean; currentTime: number; src: string }) => void;
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
  const [uiLocked, setUiLocked] = useState(false);
  const [brightness, setBrightness] = useState(1); // 0.2–1 screen overlay
  const [gestureHud, setGestureHud] = useState<{ type: "volume" | "brightness"; value: number } | null>(null);

  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const touchHandledRef = useRef(false);
  const ignoreGestureRef = useRef(false);
  const gestureMovedRef = useRef(false);
  const fsTimeRef = useRef<number | null>(null);
  const fsWasPlayingRef = useRef(false);
  /** Guard: ignore accidental pause events while layout switches to/from fullscreen */
  const fsTransitionRef = useRef(false);
  const gestureRef = useRef<{
    active: boolean;
    mode: "volume" | "brightness" | null;
    startY: number;
    startX: number;
    startVal: number;
    width: number;
    height: number;
    edge: "left" | "right" | null;
  }>({ active: false, mode: null, startY: 0, startX: 0, startVal: 0, width: 1, height: 1, edge: null });
  const gestureHudTimer = useRef<ReturnType<typeof setTimeout>>();
  const [cssFullscreen, setCssFullscreen] = useState(false);

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
  const playingRef = useRef(false);
  const autoPlayRef = useRef(autoPlay);
  playingRef.current = playing;
  autoPlayRef.current = autoPlay;

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

  // Throttle progress saves — max one API call per 15s wall-clock,
  // no matter how fast currentTime changes (scrubbing, seeking, etc.)
  const lastSaveAtRef = useRef(0);
  useEffect(() => {
    if (!contentId || !duration || duration <= 20) return;
    const token = localStorage.getItem("appAccessToken");
    if (!token) return;

    const now = Date.now();
    if (now - lastSaveAtRef.current < 15_000) return; // wall-clock gate

    const diff = Math.abs(currentTime - lastSavedTimeRef.current);
    const shouldSave = playing ? diff >= 30 : currentTime > 2 && diff > 2;
    if (!shouldSave) return;

    lastSaveAtRef.current = now;
    lastSavedTimeRef.current = currentTime;
    saveProgressMutation.mutate({
      contentId,
      progressSeconds: Math.round(currentTime),
      durationSeconds: Math.round(duration),
    });
  }, [currentTime, duration, contentId, playing]);

  // Flush progress once on unmount
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (!contentId || !v || !localStorage.getItem("appAccessToken")) return;
      const t = v.currentTime || 0;
      const d = v.duration || 0;
      if (d > 20 && t > 2 && Math.abs(t - lastSavedTimeRef.current) > 1) {
        saveProgressMutation.mutate({
          contentId,
          progressSeconds: Math.round(t),
          durationSeconds: Math.round(d),
        });
      }
    };
  }, [contentId]);

  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;
  const uiLockedRef = useRef(uiLocked);
  uiLockedRef.current = uiLocked;

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    if (settingsOpenRef.current || uiLockedRef.current) return;
    // Keep controls visible at least 5 seconds after any reveal/tap
    hideTimerRef.current = setTimeout(() => {
      if (settingsOpenRef.current || uiLockedRef.current) return;
      if (!playing) return; // stay visible while paused
      setControlsVisible(false);
    }, 5000);
  }, [playing]);

  const revealControls = useCallback(() => {
    if (uiLockedRef.current) return;
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // While settings is open, never auto-hide; when closed, start hide timer again
  useEffect(() => {
    if (settingsOpen) {
      clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
      return;
    }
    scheduleHide();
  }, [settingsOpen, scheduleHide]);

  const showGestureHud = useCallback((type: "volume" | "brightness", value: number) => {
    setGestureHud({ type, value });
    clearTimeout(gestureHudTimer.current);
    gestureHudTimer.current = setTimeout(() => setGestureHud(null), 900);
  }, []);

  // Sync parent videoSrc
  useEffect(() => {
    setCurrentSrc(videoSrc ? getImageUrl(videoSrc) : "");
    setCurrentQuality("auto");
    setSpeed(1.0);
    setSettingsOpen(false);
    setCurrentMenu("main");
    setUiLocked(false);
  }, [videoSrc]);

  /* play / pause — always honor user intent; never let FS-guard block pause */
  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;

    // User tapped play/pause — cancel any fullscreen auto-resume guard
    fsTransitionRef.current = false;

    if (v.paused) {
      fsWasPlayingRef.current = true;
      playingRef.current = true;
      setPlaying(true);
      setLoading(false);
      try {
        await v.play();
      } catch (err) {
        // Autoplay / MediaSource hiccup — retry once after a tick
        console.warn("play() failed, retrying", err);
        await new Promise((r) => setTimeout(r, 80));
        try {
          await v.play();
        } catch (err2) {
          console.warn("play() retry failed", err2);
          playingRef.current = false;
          setPlaying(false);
        }
      }
    } else {
      fsWasPlayingRef.current = false;
      playingRef.current = false;
      setPlaying(false);
      v.pause();
    }
    if (!uiLocked) revealControls();
  }, [revealControls, uiLocked]);

  /** Single tap = play/pause · Double tap also play/pause (same) · controls stay ≥5s */
  const handleScreenTap = useCallback((e?: React.SyntheticEvent) => {
    e?.stopPropagation?.();
    if (uiLocked) {
      setControlsVisible(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 5000);
      return;
    }
    // Always toggle play on tap (mobile users expect this). Reveal controls too.
    void togglePlay();
    setControlsVisible(true);
    scheduleHide();
  }, [uiLocked, togglePlay, scheduleHide]);

  const toggleLock = useCallback(() => {
    setUiLocked((locked) => {
      const next = !locked;
      if (next) {
        setControlsVisible(false);
        setSettingsOpen(false);
        clearTimeout(hideTimerRef.current);
      } else {
        setControlsVisible(true);
        scheduleHide();
      }
      return next;
    });
  }, [scheduleHide]);

  const isPlayerControlTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el?.closest) return false;
    return !!el.closest("button, input, a, [data-player-control], [role='slider']");
  };

  /** Only left/right EDGE vertical swipes adjust brightness/volume — never the middle */
  const onGestureStart = useCallback((clientX: number, clientY: number, width: number, height: number) => {
    if (ignoreGestureRef.current || uiLocked) {
      gestureRef.current.active = false;
      gestureRef.current.edge = null;
      return;
    }
    const edgeZone = Math.max(56, width * 0.22);
    let edge: "left" | "right" | null = null;
    if (clientX <= edgeZone) edge = "left";
    else if (clientX >= width - edgeZone) edge = "right";

    gestureRef.current = {
      active: edge !== null,
      mode: null,
      startY: clientY,
      startX: clientX,
      startVal: edge === "left" ? brightness : (muted ? 0 : volume),
      width,
      height,
      edge,
    };
  }, [brightness, muted, volume, uiLocked]);

  const onGestureMove = useCallback((clientY: number) => {
    const g = gestureRef.current;
    if (!g.active || !g.edge || ignoreGestureRef.current) return;
    const dy = g.startY - clientY;
    if (!g.mode) {
      if (Math.abs(dy) < 14) return; // need a real vertical swipe
      g.mode = g.edge === "left" ? "brightness" : "volume";
      g.startVal = g.mode === "brightness" ? brightness : (muted ? 0 : volume);
    }
    const delta = dy / Math.max(160, g.height * 0.45);
    if (g.mode === "brightness") {
      const next = Math.max(0.2, Math.min(1, g.startVal + delta));
      setBrightness(next);
      showGestureHud("brightness", next);
    } else {
      const v = videoRef.current;
      const next = Math.max(0, Math.min(1, g.startVal + delta));
      if (v) {
        v.volume = next;
        v.muted = next === 0;
      }
      setVolume(next);
      setMuted(next === 0);
      showGestureHud("volume", next);
    }
  }, [brightness, muted, volume, showGestureHud]);

  const onGestureEnd = useCallback(() => {
    const hadMode = gestureRef.current.mode !== null;
    if (hadMode) gestureMovedRef.current = true;
    gestureRef.current.active = false;
    gestureRef.current.mode = null;
    gestureRef.current.edge = null;
    return hadMode;
  }, []);

  const handleBrightness = (val: number) => {
    const next = Math.max(0.2, Math.min(1, val));
    setBrightness(next);
    showGestureHud("brightness", next);
    revealControls();
  };

  /* seek — simple like the original working code.
     No hls.startLoad() / play() per tick: dragging fires onChange dozens of
     times and each extra call caused repeated segment/API requests. */
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    try { v.currentTime = t; } catch { /* ignore */ }
    setCurrentTime(t);
    revealControls();
  };

  const skip = useCallback((sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + sec));
    } catch { /* ignore */ }
    setSkipAnim(sec > 0 ? "right" : "left");
    setTimeout(() => setSkipAnim(null), 600);
    revealControls();
  }, [revealControls]);

  /* volume */
  const handleVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min(1, val));
    v.volume = next;
    v.muted  = next === 0;
    setVolume(next);
    setMuted(next === 0);
    showGestureHud("volume", next);
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

  const isNativeFullscreen = () => {
    const doc = document as any;
    return !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
  };

  const isMobileBrowser = () =>
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)));

  /* fullscreen — CSS FS in-place (NO remount/portal). Native FS on desktop when available. */
  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current as any;
    const v = videoRef.current;
    if (!c) return;

    const wasPlaying = !!(v && !v.paused);
    if (v) {
      fsTimeRef.current = v.currentTime;
      fsWasPlayingRef.current = wasPlaying;
    }

    // Mark transition so onPause doesn't clear "playing" / leave us stuck paused
    fsTransitionRef.current = true;
    window.setTimeout(() => { fsTransitionRef.current = false; }, 1000);

    // MUST call play() in the same user-gesture stack — setTimeout play() is blocked on mobile
    const keepPlaying = () => {
      const vid = videoRef.current;
      if (!vid) return;
      if (!fsWasPlayingRef.current) return;
      if (vid.paused) {
        const p = vid.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
      playingRef.current = true;
      setPlaying(true);
    };

    const doc = document as any;
    const nativeFull = isNativeFullscreen();

    // Exit
    if (nativeFull || cssFullscreen) {
      if (nativeFull) {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
        try { exit?.call(doc); } catch { /* ignore */ }
      }
      try { (screen.orientation as any)?.unlock?.(); } catch { /* ignore */ }
      setCssFullscreen(false);
      setIsFullscreen(false);
      keepPlaying(); // sync — still inside click gesture
      requestAnimationFrame(() => {
        keepPlaying();
        requestAnimationFrame(keepPlaying);
      });
      window.setTimeout(keepPlaying, 80);
      window.setTimeout(keepPlaying, 250);
      revealControls();
      return;
    }

    const enterCss = () => {
      // Resume BEFORE layout change while gesture is still valid
      keepPlaying();
      setCssFullscreen(true);
      setIsFullscreen(true);
      keepPlaying();
      requestAnimationFrame(() => {
        keepPlaying();
        requestAnimationFrame(keepPlaying);
      });
      window.setTimeout(keepPlaying, 80);
      window.setTimeout(keepPlaying, 250);
      window.setTimeout(keepPlaying, 500);
      revealControls();
    };

    // iPhone: no element-fullscreen API. The ONLY way to hide Safari's bars
    // is the native video fullscreen player — it also auto-rotates.
    const vAny = v as any;
    const isIphone = /iPhone|iPod/.test(navigator.userAgent);
    if (isIphone && typeof vAny?.webkitEnterFullscreen === "function") {
      try {
        keepPlaying(); // must play before entering; iOS blocks FS on idle video
        vAny.webkitEnterFullscreen();
        setIsFullscreen(true);
        return;
      } catch { /* fall through to CSS overlay */ }
    }

    // Android + desktop: native element fullscreen hides ALL browser chrome
    const req = c.requestFullscreen || c.webkitRequestFullscreen || c.mozRequestFullScreen || c.msRequestFullscreen;
    if (req) {
      keepPlaying();
      Promise.resolve(req.call(c))
        .then(() => {
          setIsFullscreen(true);
          keepPlaying();
          window.setTimeout(keepPlaying, 80);
          window.setTimeout(keepPlaying, 250);
          // Auto-rotate to landscape (works inside native fullscreen on Android)
          if (isMobileBrowser()) {
            try { (screen.orientation as any)?.lock?.("landscape").catch(() => {}); } catch { /* ignore */ }
            window.setTimeout(keepPlaying, 500); // orientation change can fire a pause
          }
          revealControls();
        })
        .catch(() => enterCss());
    } else {
      enterCss();
    }
  }, [cssFullscreen, revealControls]);

  /* video element events */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => {
      setPlaying(true);
      scheduleHide();
    };
    const onPause = () => {
      // Only ignore spurious pauses during the brief fullscreen layout change.
      // Never block a real user pause (togglePlay clears fsTransitionRef first).
      if (fsTransitionRef.current && fsWasPlayingRef.current) {
        const vid = videoRef.current;
        if (vid?.paused) vid.play().catch(() => {});
        return;
      }
      playingRef.current = false;
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

  // iPhone native fullscreen player closed → sync state and keep playing inline
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onBegin = () => setIsFullscreen(true);
    const onEnd = () => {
      setIsFullscreen(false);
      setCssFullscreen(false);
      window.setTimeout(() => {
        const vid = videoRef.current;
        if (vid && fsWasPlayingRef.current && vid.paused) vid.play().catch(() => {});
      }, 60);
    };
    v.addEventListener("webkitbeginfullscreen", onBegin as any);
    v.addEventListener("webkitendfullscreen", onEnd as any);
    return () => {
      v.removeEventListener("webkitbeginfullscreen", onBegin as any);
      v.removeEventListener("webkitendfullscreen", onEnd as any);
    };
  }, []);

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

  // Load source with HLS — ONLY when URL changes.
  // Never depend on autoPlay/playing/fullscreen (those must not destroy the stream).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const networkSrc = getImageUrl(currentSrc);
    if (!networkSrc) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Tear down previous HLS instance only (keep <video> element alive)
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch { /* ignore */ }
      hlsRef.current = null;
    }

    const shouldAutoPlay = () => playingRef.current || autoPlayRef.current;

    const onReady = () => {
      if (cancelled) return;
      setLoading(false);
      if (pendingSeekRef.current !== null) {
        try { v.currentTime = pendingSeekRef.current; } catch { /* ignore */ }
        pendingSeekRef.current = null;
        resumeAppliedRef.current = true;
      }
      v.playbackRate = speed;
      if (shouldAutoPlay()) v.play().catch(() => {});
    };

    const isM3u8 = /\.m3u8(\?|#|$)/i.test(networkSrc);

    if (isM3u8 && Hls.isSupported()) {
      // Estimate start bandwidth from Network Information API when available
      const conn = (navigator as any).connection;
      const downlinkMbps = typeof conn?.downlink === "number" ? conn.downlink : 0;
      const startEstimate = downlinkMbps > 0
        ? Math.max(500_000, Math.min(8_000_000, Math.round(downlinkMbps * 1_000_000 * 0.7)))
        : 1_500_000;

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Start low for fast first frame, then ABR climbs to match net speed
        startLevel: 0,
        abrEwmaDefaultEstimate: startEstimate,
        abrEwmaFastVoD: 3,
        abrEwmaSlowVoD: 9,
        abrBandWidthFactor: 0.85,
        abrBandWidthUpFactor: 0.7,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
        maxBufferHole: 0.5,
        startFragPrefetch: true,
        testBandwidth: true,
      });
      hlsRef.current = hls;
      hls.loadSource(networkSrc);
      hls.attachMedia(v);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        // Prefer master playlist multi-quality when present
        if (currentQuality === "auto" && (data.levels?.length || 0) > 1) {
          // Unlock ABR after first fragment so first paint is fast
          const unlock = () => {
            if (hlsRef.current === hls && currentQuality === "auto") {
              hls.currentLevel = -1;
            }
          };
          hls.once(Hls.Events.FRAG_LOADED, unlock);
          // Safety unlock if FRAG_LOADED never fires
          window.setTimeout(unlock, 3000);
        }
        onReady();
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (cancelled) return;
        setLoading(false);
        if (v.paused && shouldAutoPlay()) v.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        console.error("HLS fatal error", data);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          try { hls.startLoad(); } catch { setLoading(false); }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try { hls.recoverMediaError(); } catch { setLoading(false); }
        } else {
          setLoading(false);
        }
      });
    } else if (isM3u8 && v.canPlayType("application/vnd.apple.mpegurl")) {
      // iOS Safari native HLS — ABR is handled by the OS
      v.src = networkSrc;
      v.preload = "auto";
      v.load();
      v.addEventListener("loadedmetadata", onReady, { once: true });
      v.addEventListener("canplay", () => setLoading(false), { once: true });
    } else {
      // Progressive MP4 / other
      v.src = networkSrc;
      v.preload = "auto";
      v.load();
      const onCanPlay = () => {
        onReady();
        v.removeEventListener("canplay", onCanPlay);
      };
      v.addEventListener("canplay", onCanPlay);
      v.addEventListener("loadeddata", () => setLoading(false), { once: true });
    }

    // Offline swap only if a local copy exists — do not block network start
    if (contentId) {
      getOfflineVideoUrl(contentId).then((offlineUrl) => {
        if (cancelled || !offlineUrl || !videoRef.current) return;
        const v2 = videoRef.current;
        const t = v2.currentTime || pendingSeekRef.current || 0;
        const wasPlaying = !v2.paused || shouldAutoPlay();
        if (hlsRef.current) {
          try { hlsRef.current.destroy(); } catch { /* ignore */ }
          hlsRef.current = null;
        }
        pendingSeekRef.current = t > 1 ? t : null;
        v2.src = offlineUrl;
        v2.load();
        const resume = () => {
          if (pendingSeekRef.current != null) {
            try { v2.currentTime = pendingSeekRef.current; } catch { /* ignore */ }
            pendingSeekRef.current = null;
          }
          setLoading(false);
          if (wasPlaying) v2.play().catch(() => {});
        };
        v2.addEventListener("canplay", resume, { once: true });
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch { /* ignore */ }
        hlsRef.current = null;
      }
      // Do NOT removeAttribute("src") / load() here — that kills playback on
      // effect re-runs and when React moves the node for CSS fullscreen.
    };
  }, [currentSrc, contentId]); // intentionally NOT autoPlay / playing / cssFullscreen

  // Keep parent informed for mini-player handoff
  useEffect(() => {
    onPlaybackSnapshot?.({
      playing,
      currentTime,
      src: currentSrc || videoSrc,
    });
  }, [playing, currentTime, currentSrc, videoSrc, onPlaybackSnapshot]);

  // Hard-stop audio if this player unmounts for any reason
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v) {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {
          /* ignore */
        }
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

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

  /* fullscreen change — keep same media; only resume play (do NOT seek/reload) */
  useEffect(() => {
    const restorePlay = () => {
      const v = videoRef.current;
      if (!v) return;
      if (fsWasPlayingRef.current && v.paused) {
        v.play().catch(() => {});
      }
      revealControls();
    };

    const onChange = () => {
      const isFull = isNativeFullscreen() || cssFullscreen;
      setIsFullscreen(isFull);
      window.setTimeout(restorePlay, 30);
      window.setTimeout(restorePlay, 200);
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
  }, [cssFullscreen, revealControls]);

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
        case "Escape":
          if (cssFullscreen) {
            setCssFullscreen(false);
            setIsFullscreen(false);
          }
          break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, revealControls, onNext, skip, cssFullscreen]);

  // Keep playback continuous when entering/leaving CSS fullscreen (same <video> element)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setIsFullscreen(cssFullscreen || isNativeFullscreen());
    if (fsWasPlayingRef.current) {
      if (v.paused) v.play().catch(() => {});
      playingRef.current = true;
      setPlaying(true);
    }
    revealControls();
  }, [cssFullscreen, revealControls]);

  // When CSS fullscreen is active, prevent body scroll.
  // Do NOT call screen.orientation.lock here — it pauses media on many mobile browsers.
  useEffect(() => {
    if (!cssFullscreen) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [cssFullscreen]);

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
  const FsIcon     = isFullscreen || cssFullscreen ? Minimize : Maximize;
  const ctrlShow   = !uiLocked && (controlsVisible || !playing || settingsOpen);
  const lockChromeShow = uiLocked && controlsVisible;

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

  const playerShell = (
    <div
      ref={containerRef}
      className={`bg-black select-none ${
        cssFullscreen
          ? "rounded-none overflow-hidden"
          : "absolute inset-0 w-full h-full rounded-xl sm:rounded-2xl overflow-hidden"
      }`}
      style={
        cssFullscreen
          ? {
              // Fixed overlay in-place — never portal / remount <video>
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100dvh",
              maxWidth: "100vw",
              maxHeight: "100dvh",
              zIndex: 99999,
              touchAction: "manipulation",
              background: "#000",
            }
          : { touchAction: "manipulation" }
      }
      onMouseMove={() => { if (!uiLocked) revealControls(); }}
      onMouseLeave={() => {
        if (playing && !uiLocked && !settingsOpen && !cssFullscreen) {
          clearTimeout(hideTimerRef.current);
          setControlsVisible(false);
        }
      }}
      onClick={(e) => {
        if (touchHandledRef.current) {
          touchHandledRef.current = false;
          return;
        }
        if (gestureMovedRef.current) {
          gestureMovedRef.current = false;
          return;
        }
        if (isPlayerControlTarget(e.target)) return;
        handleScreenTap(e);
      }}
      onTouchStart={(e) => {
        if (isPlayerControlTarget(e.target)) {
          ignoreGestureRef.current = true;
          gestureRef.current.active = false;
          return;
        }
        ignoreGestureRef.current = false;
        gestureMovedRef.current = false;
        const t = e.touches[0];
        const rect = containerRef.current?.getBoundingClientRect();
        if (!t || !rect) return;
        onGestureStart(t.clientX - rect.left, t.clientY - rect.top, rect.width, rect.height);
      }}
      onTouchMove={(e) => {
        if (ignoreGestureRef.current) return;
        const t = e.touches[0];
        if (!t || !gestureRef.current.active) return;
        if (gestureRef.current.mode) e.preventDefault();
        onGestureMove(t.clientY - (containerRef.current?.getBoundingClientRect().top || 0));
      }}
      onTouchEnd={() => {
        if (ignoreGestureRef.current) {
          ignoreGestureRef.current = false;
          onGestureEnd();
          return;
        }
        const moved = onGestureEnd();
        if (moved) {
          touchHandledRef.current = true;
        } else {
          touchHandledRef.current = true;
          handleScreenTap();
        }
      }}
    >
      {/* Real video element — object-cover fills the screen (no black gaps) in mobile fullscreen */}
      <video
        ref={videoRef}
        poster={thumbnail}
        className={`absolute inset-0 w-full h-full ${
          (cssFullscreen || isFullscreen) && isMobileBrowser() ? "object-cover" : "object-contain"
        }`}
        preload="auto"
        playsInline
        style={{ outline: "none", background: "#000" }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v) return;
          if (isFinite(v.duration)) setDuration(v.duration);
          if (pendingSeekRef.current !== null) {
            v.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          }
          v.playbackRate = speed;
          const shouldPlay = playingRef.current || autoPlayRef.current;
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

      {/* Brightness overlay (web can't set system brightness — dim video layer) */}
      <div
        className="absolute inset-0 pointer-events-none z-[5] bg-black transition-opacity duration-75"
        style={{ opacity: Math.max(0, 1 - brightness) }}
      />

      {/* Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25 pointer-events-none z-10 transition-opacity ${ctrlShow || lockChromeShow ? "opacity-100" : "opacity-0"}`} />

      {/* Buffering spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        </div>
      )}

      {/* Volume / brightness gesture HUD — sits on the edge being adjusted */}
      {gestureHud && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none ${
            gestureHud.type === "brightness" ? "left-3" : "right-3"
          }`}
        >
          <div className="flex flex-col items-center gap-2 px-3 py-3 rounded-2xl bg-black/75 border border-white/15 backdrop-blur-md min-w-[72px]">
            {gestureHud.type === "volume" ? (
              gestureHud.value === 0 ? <VolumeX className="w-5 h-5 text-amber-400" /> : <Volume2 className="w-5 h-5 text-amber-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400" />
            )}
            <div className="w-1.5 h-20 rounded-full bg-white/20 overflow-hidden flex flex-col justify-end">
              <div className="w-full bg-amber-400 rounded-full transition-all" style={{ height: `${Math.round(gestureHud.value * 100)}%` }} />
            </div>
            <span className="text-[10px] font-bold text-white/90 tabular-nums">
              {Math.round(gestureHud.value * 100)}%
            </span>
          </div>
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

      {/* Locked: unlock chip only */}
      {uiLocked && (
        <div className={`absolute top-3 right-3 z-30 transition-opacity duration-300 ${lockChromeShow ? "opacity-100" : "opacity-0"}`}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleLock(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/70 border border-white/20 text-white text-xs font-bold backdrop-blur-md"
          >
            <Unlock className="w-3.5 h-3.5 text-amber-400" /> Unlock
          </button>
        </div>
      )}

      {/* Center play/pause — skip ±10 only on larger screens to avoid overlap */}
      <div
        className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 pointer-events-none ${
          ctrlShow ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-8 sm:gap-10 pointer-events-auto" data-player-control onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); skip(-10); }}
            className="hidden sm:flex w-11 h-11 rounded-full bg-black/40 border border-white/10 items-center justify-center hover:bg-black/60 transition-all duration-200 active:scale-90 touch-manipulation"
            aria-label="Back 10 seconds"
          >
            <RotateCcw className="w-4 h-4 text-foreground" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void togglePlay(); }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center shadow-lg shadow-amber-900/40 hover:scale-105 transition-all duration-200 active:scale-95 touch-manipulation ${
              loading && playing ? "opacity-0 pointer-events-none scale-90" : "opacity-100"
            }`}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing
              ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black" />
              : <Play  className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black ml-1" />
            }
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); skip(10); }}
            className="hidden sm:flex w-11 h-11 rounded-full bg-black/40 border border-white/10 items-center justify-center hover:bg-black/60 transition-all duration-200 active:scale-90 touch-manipulation"
            aria-label="Forward 10 seconds"
          >
            <RotateCw className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Bottom controls — seek pinned above buttons at true bottom */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${
          ctrlShow ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        data-player-control
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-t from-black via-black/85 to-transparent px-3 sm:px-4 pt-8 pb-2 space-y-1">
        {/* Seek: time | bar | duration — not floating mid-player */}
        <div className="flex items-center gap-2">
          <span className="text-white/90 text-[10px] tabular-nums font-semibold shrink-0 min-w-[32px]">
            {fmtTime(currentTime)}
          </span>
          <div className="relative flex-1 h-4 flex items-center cursor-pointer">
            <div className="absolute inset-x-0 h-[3px] bg-white/25 rounded-full" />
            <div className="absolute h-[3px] bg-white/40 rounded-full" style={{ width: `${bufPct}%` }} />
            <div className="absolute h-[3px] bg-amber-400 rounded-full" style={{ width: `${seekPct}%` }} />
            <div
              className="absolute w-3 h-3 bg-amber-400 border border-white/60 rounded-full shadow -translate-x-1/2 pointer-events-none"
              style={{ left: `${seekPct}%` }}
            />
            <input
              type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
              onChange={handleSeek} onMouseDown={revealControls} onTouchStart={revealControls}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Seek"
            />
          </div>
          <span className="text-white/55 text-[10px] tabular-nums font-medium shrink-0 min-w-[32px] text-right">
            {fmtTime(duration)}
          </span>
        </div>

        {/* Single clean action row */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5 sm:gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void togglePlay(); }}
              className="text-white hover:text-amber-400 transition-colors p-2.5 touch-manipulation"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-px" />}
            </button>

            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="hidden sm:inline-flex text-white hover:text-amber-400 p-2 transition-colors touch-manipulation"
                title="Skip Trailer / Next (N)"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            {/* Desktop volume slider only */}
            <div className="hidden sm:flex items-center gap-1 ml-1" data-player-control>
              <button
                type="button"
                onClick={toggleMute}
                className="text-white hover:text-amber-400 transition-colors p-1.5 touch-manipulation"
                aria-label="Mute"
              >
                <VolumeIcon className="w-4 h-4" />
              </button>
              <div className="relative w-20 h-6 flex items-center">
                <div className="absolute inset-x-0 h-[3px] bg-white/20 rounded-full" />
                <div className="absolute h-[3px] bg-amber-400 rounded-full" style={{ width: `${displayVol * 100}%` }} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={displayVol}
                  onChange={(e) => handleVolume(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Mobile mute only (no slider clutter) */}
            <button
              type="button"
              onClick={toggleMute}
              className="sm:hidden text-white hover:text-amber-400 transition-colors p-2.5 touch-manipulation"
              aria-label="Mute"
            >
              <VolumeIcon className="w-5 h-5" />
            </button>

            {/* Settings */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen((open) => {
                    const next = !open;
                    if (next) {
                      clearTimeout(hideTimerRef.current);
                      setControlsVisible(true);
                    }
                    return next;
                  });
                  setCurrentMenu("main");
                }}
                className={`text-white hover:text-amber-400 transition-all duration-300 p-2.5 touch-manipulation ${settingsOpen ? "text-amber-400" : ""}`}
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>

              {settingsOpen && (
                <div className="absolute bottom-12 right-0 z-50 bg-[#0d0d16]/95 border border-amber-400/20 backdrop-blur-md rounded-xl p-2.5 w-[min(260px,82vw)] max-h-[min(55vh,360px)] overflow-y-auto text-xs text-foreground shadow-2xl flex flex-col gap-0.5">
                  {currentMenu === "main" && (
                    <>
                      <div className="text-[9px] uppercase font-bold text-foreground tracking-wider px-2 pb-1.5 border-b border-white/5">Settings</div>

                      {/* Volume + brightness in settings (keeps bottom bar clean) */}
                      <div className="px-2 py-2.5 space-y-3 border-b border-white/5 mb-1">
                        <div className="flex items-center gap-2">
                          <VolumeIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div className="relative flex-1 h-6 flex items-center">
                            <div className="absolute inset-x-0 h-[3px] bg-white/20 rounded-full" />
                            <div className="absolute h-[3px] bg-amber-400 rounded-full" style={{ width: `${displayVol * 100}%` }} />
                            <input
                              type="range" min={0} max={1} step={0.01} value={displayVol}
                              onChange={(e) => handleVolume(parseFloat(e.target.value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-manipulation"
                              aria-label="Volume"
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-white/60 w-8 text-right">{Math.round(displayVol * 100)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div className="relative flex-1 h-6 flex items-center">
                            <div className="absolute inset-x-0 h-[3px] bg-white/20 rounded-full" />
                            <div className="absolute h-[3px] bg-amber-400 rounded-full" style={{ width: `${((brightness - 0.2) / 0.8) * 100}%` }} />
                            <input
                              type="range" min={0.2} max={1} step={0.01} value={brightness}
                              onChange={(e) => handleBrightness(parseFloat(e.target.value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-manipulation"
                              aria-label="Brightness"
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-white/60 w-8 text-right">{Math.round(brightness * 100)}</span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-snug">Tip: swipe on left edge = brightness, right edge = volume</p>
                      </div>

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

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFullscreen();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-white hover:text-amber-400 transition-colors p-2.5 touch-manipulation"
              aria-label={isFullscreen || cssFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <FsIcon className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleLock(); }}
              className="text-white hover:text-amber-400 transition-colors p-2.5 touch-manipulation"
              aria-label="Lock controls"
              title="Lock screen controls"
            >
              <Lock className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
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

  // Always return the same DOM tree — never portal.
  // Portaling moves <video> and breaks MediaSource / HLS (reload + endless buffer).
  return playerShell;
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
  const { startMini, stopMini } = useMiniPlayer();
  const playbackSnapRef = useRef<{ playing: boolean; currentTime: number; src: string }>({
    playing: false,
    currentTime: 0,
    src: "",
  });
  const metaRef = useRef({ title: "", poster: "", contentId: "", ep: 1 });

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

  // Entering full player → close corner mini player
  useEffect(() => {
    stopMini();
  }, [contentId, stopMini]);

  // Leaving watch page: if still playing, hand off to corner mini player
  // Deferred so navigating watch→watch can cancel via stopMini / /watch guard
  useEffect(() => {
    return () => {
      const snap = playbackSnapRef.current;
      const meta = metaRef.current;
      if (!snap.playing || !snap.src || !meta.contentId) return;
      const payload = {
        contentId: meta.contentId,
        ep: meta.ep,
        title: meta.title,
        poster: meta.poster,
        src: snap.src,
        currentTime: snap.currentTime || 0,
        playing: true as const,
      };
      window.setTimeout(() => {
        const path = window.location.pathname || "";
        if (path.includes("/watch/")) return;
        startMini(payload);
      }, 0);
    };
  }, [startMini]);

  const onPlaybackSnapshot = useCallback(
    (snap: { playing: boolean; currentTime: number; src: string }) => {
      playbackSnapRef.current = snap;
    },
    []
  );

  // Resume from mini-player expand
  const miniResume = (() => {
    try {
      const raw = sessionStorage.getItem(`mini_resume_${contentId}`);
      if (!raw) return undefined;
      sessionStorage.removeItem(`mini_resume_${contentId}`);
      const parsed = JSON.parse(raw);
      return typeof parsed?.time === "number" ? parsed.time : undefined;
    } catch {
      return undefined;
    }
  })();

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

  // Keep mini-player meta fresh for leave handoff
  useEffect(() => {
    metaRef.current = {
      title: showData?.title || "Movie",
      poster: showData?.bannerImage || showData?.thumbnail || showData?.poster || "",
      contentId,
      ep: currentEp,
    };
  }, [showData, contentId, currentEp]);

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

  // Downloads — server list syncs; offline file is per-device
  const { data: downloadsData } = useGetDownloads({ limit: 200 });
  const downloadItems: any[] = Array.isArray(downloadsData) ? downloadsData : [];
  const downloadRecord = downloadItems.find((d: any) => d.contentId === contentId);
  const inDownloadList = !!downloadRecord;
  const [isOfflineHere, setIsOfflineHere] = useState(false);
  const requestDownloadMutation = useRequestDownload();
  const removeDownloadMutation = useRemoveDownload();
  const [dlProgress, setDlProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!contentId) return;
    let cancelled = false;
    hasOfflineVideo(contentId).then((ok) => {
      if (!cancelled) setIsOfflineHere(ok);
    });
    return () => { cancelled = true; };
  }, [contentId, dlProgress, inDownloadList]);

  const handleDownloadToggle = useCallback(() => {
    if (!user) { navigate("/login"); return; }

    const record = downloadItems.find((d: any) => d.contentId === contentId);
    if (isOfflineHere && record) {
      removeDownloadMutation.mutate(
        { id: record.id, contentId },
        {
          onSuccess: async () => {
            await removeOfflineVideo(contentId);
            setIsOfflineHere(false);
            toast({ title: "Removed from this device" });
          },
        }
      );
      return;
    }

    requestDownloadMutation.mutate(
      { contentId, contentType: 'movie' },
      {
        onSuccess: async (data: any) => {
          const dlUrl = data?.data?.downloadUrl || data?.downloadUrl;
          if (dlUrl) {
            setDlProgress(0);
            const ok = await cacheDownloadedVideo(dlUrl, contentId, undefined, setDlProgress, {
              trailerUrl: showData?.trailerUrl,
            });
            setDlProgress(null);
            setIsOfflineHere(ok);
            toast({
              title: ok ? "Saved offline on this device" : "Could not save full movie offline",
              description: ok
                ? "Play without internet here. Other devices need their own download."
                : "Trailer cannot be used for offline — the full movie MP4 is required.",
              variant: ok ? "default" : "destructive",
            });
          } else {
            toast({
              title: "Full movie file not available",
              description: "Offline needs the movie MP4, not the trailer.",
              variant: "destructive",
            });
          }
        },
        onError: (err: any) => toast({ title: "Download failed", description: err?.message || "Please try again.", variant: "destructive" }),
      }
    );
  }, [user, navigate, downloadItems, contentId, isOfflineHere, removeDownloadMutation, requestDownloadMutation, toast, showData?.trailerUrl]);

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
      const movieUrl =
        showData?.hlsUrl || showData?.videoUrl || showData?.sourceVideoUrl || "";
      if (!movieUrl || String(movieUrl).startsWith("blob:")) {
        toast({
          title: "Movie not ready yet",
          description: "The full movie file is still processing. Try again in a few minutes.",
          variant: "destructive",
        });
        return;
      }
    }
    setCurrentEp(ep);
    setAutoPlay(true);
    navigate(`/watch/${contentId}/${ep}`);
  }, [contentId, navigate, isLockedForContent, requiredPlan, showData, toast]);

  // Keep episode in sync with URL (/watch/:id/0 = trailer, /1 = movie)
  useEffect(() => {
    const fromUrl = parseInt(params.epNum || "1", 10);
    if ((fromUrl === 0 || fromUrl === 1) && fromUrl !== currentEp) {
      setCurrentEp(fromUrl);
    }
  }, [params.epNum]); // eslint-disable-line react-hooks/exhaustive-deps

  const epLabel   = currentEp === 0 ? "Trailer" : "Movie";
  const epTitle   = currentEp === 0 ? `Trailer - ${title}` : title;
  const plotTitle = currentEp === 0 ? "About Trailer" : "Plot Synopsis";

  const pickPlayableUrl = (...candidates: Array<string | null | undefined>) => {
    // Prefer HLS master playlist when available
    for (const c of candidates) {
      const u = String(c || "").trim();
      if (u && !u.startsWith("blob:") && /\.m3u8(\?|#|$)/i.test(u)) return u;
    }
    for (const c of candidates) {
      const u = String(c || "").trim();
      if (u && !u.startsWith("blob:")) return u;
    }
    return "";
  };

  const videoSrc =
    currentEp === 0
      ? pickPlayableUrl(showData?.trailerUrl)
      : pickPlayableUrl(
          showData?.hlsUrl,
          showData?.videoSettings?.find((q: any) => q.key === "auto")?.url,
          showData?.videoUrl,
          showData?.sourceVideoUrl
        );

  const skipToMovie = useCallback(() => goToEpisode(1), [goToEpisode]);
  const hasTrailer = !!pickPlayableUrl(showData?.trailerUrl);
  const hasMovie = !!pickPlayableUrl(showData?.hlsUrl, showData?.videoUrl, showData?.sourceVideoUrl);

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

          {/* Player Container — overflow visible so CSS fullscreen isn't clipped */}
          <div
            key={`player-ep-${currentEp}`}
            className="relative bg-black shadow-2xl rounded-xl sm:rounded-2xl border border-zinc-900 mb-4 w-full min-h-[200px] sm:min-h-0 overflow-visible"
            style={{ aspectRatio: "16 / 9" }}
            onClick={() => !playerStarted && setPlayerStarted(true)}
          >
            <VideoPlayer
              videoSrc={videoSrc}
              thumbnail={detail.thumbnail}
              autoPlay={autoPlay}
              onNext={currentEp === 0 && hasMovie ? skipToMovie : undefined}
              videoSettings={currentEp === 0 ? undefined : showData?.videoSettings}
              contentId={currentEp === 1 ? contentId : undefined}
              resumeFrom={
                miniResume && miniResume > 5
                  ? miniResume
                  : currentEp === 1 && savedProgress?.progressPercent && savedProgress.progressPercent < 95
                  ? savedProgress.progressSeconds
                  : undefined
              }
              subtitles={currentEp === 0 ? [] : showData?.subtitles || []}
              onPlaybackSnapshot={onPlaybackSnapshot}
            />
            {currentAd && <AdOverlay ad={currentAd} onSkip={() => setAdDismissed(true)} />}

            {/* Skip Trailer → play full movie */}
            {currentEp === 0 && hasMovie && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  skipToMovie();
                }}
                className="absolute top-3 right-3 z-[50] flex items-center gap-1.5 rounded-lg bg-black/75 hover:bg-black/90 border border-white/25 px-3 py-2 text-xs sm:text-sm font-bold text-white shadow-lg backdrop-blur-sm transition-colors"
              >
                Skip Trailer
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}

            {currentEp === 0 && !hasMovie && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[50] rounded-lg bg-black/80 border border-amber-400/40 px-3 py-2 text-[11px] text-amber-200 font-semibold">
                Full movie still processing — trailer only for now
              </div>
            )}

            {!videoSrc && (
              <div className="absolute inset-0 z-[40] flex items-center justify-center bg-black/80 px-6 text-center">
                <p className="text-sm text-foreground/80 font-semibold">
                  {currentEp === 0 ? "Trailer not available." : "Movie video not available yet."}
                </p>
              </div>
            )}

            {/* ── PRE-ROLL AD OVERLAY (page-level scope, correct showPreroll access) ── */}
            {showPreroll && (
              <div className="absolute inset-0 z-[400] rounded-2xl overflow-hidden">
                <PlayerPrerollAd onFinished={() => setShowPreroll(false)} />
              </div>
            )}
          </div>

          {/* Trailer / Movie switcher */}
          {(hasTrailer || hasMovie) && (
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              {hasTrailer && (
                <button
                  type="button"
                  onClick={() => goToEpisode(0)}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors border ${
                    currentEp === 0
                      ? "bg-amber-400 text-black border-amber-400"
                      : "bg-zinc-900 text-foreground/80 border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  Trailer
                </button>
              )}
              <button
                type="button"
                onClick={() => goToEpisode(1)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors border ${
                  currentEp === 1
                    ? "bg-amber-400 text-black border-amber-400"
                    : "bg-zinc-900 text-foreground/80 border-zinc-800 hover:border-zinc-600"
                }`}
              >
                Play Movie
              </button>
            </div>
          )}

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

                {/* Download — hide when movie disables downloads */}
                {(showData?.downloadAllowed !== false) && (
                <button
                  onClick={() => handleDownloadToggle()}
                  disabled={requestDownloadMutation.isPending || removeDownloadMutation.isPending || dlProgress !== null}
                  className={`flex flex-col items-center gap-1 px-4 py-2 transition-all active:scale-95 disabled:opacity-70 ${
                    isOfflineHere ? "text-emerald-400" : inDownloadList ? "text-amber-300" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {requestDownloadMutation.isPending || removeDownloadMutation.isPending || dlProgress !== null ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isOfflineHere ? (
                    <Check className="w-5 h-5 text-emerald-400" strokeWidth={3} />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span className="text-[11px] font-semibold mt-0.5">
                    {dlProgress !== null
                      ? `${dlProgress}%`
                      : isOfflineHere
                      ? "Offline here"
                      : inDownloadList
                      ? "Save offline"
                      : "Download"}
                  </span>
                </button>
                )}
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
                <div className="w-1 h-6 rounded-full flex-shrink-0 bg-amber-400" />
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
          <div className="px-4 sm:px-6 lg:px-10 mt-12 border-t border-zinc-900 pt-10 pb-4">
            <WebsiteReviews
              user={user}
              onSignInRequired={() => navigate("/login")}
              variant="full"
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
