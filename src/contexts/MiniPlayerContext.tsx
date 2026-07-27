import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocation } from "wouter";
import Hls from "hls.js";
import { Play, Pause, Maximize2 } from "lucide-react";
import { getImageUrl } from "@/lib/api-client";

export type MiniPlayerSession = {
  contentId: string;
  ep?: number;
  title: string;
  poster?: string;
  src: string;
  currentTime: number;
  playing: boolean;
};

type MiniPlayerContextValue = {
  session: MiniPlayerSession | null;
  startMini: (session: MiniPlayerSession) => void;
  stopMini: () => void;
  updateMiniTime: (t: number) => void;
};

const MiniPlayerContext = createContext<MiniPlayerContextValue | null>(null);

const PIP_W_MOBILE = 156;
const PIP_H_MOBILE = 88;
const PIP_W_DESKTOP = 200;
const PIP_H_DESKTOP = 112;

function pipSize() {
  if (typeof window === "undefined") return { w: PIP_W_MOBILE, h: PIP_H_MOBILE };
  const mobile = window.innerWidth < 640;
  return mobile
    ? { w: Math.min(PIP_W_MOBILE, window.innerWidth * 0.42), h: PIP_H_MOBILE }
    : { w: PIP_W_DESKTOP, h: PIP_H_DESKTOP };
}

function defaultPipPos() {
  if (typeof window === "undefined") return { x: 16, y: 120 };
  const { w, h } = pipSize();
  const margin = 12;
  const safeBottom = 64;
  return {
    x: Math.max(margin, window.innerWidth - w - margin),
    y: Math.max(margin, window.innerHeight - h - safeBottom - margin),
  };
}

export function MiniPlayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MiniPlayerSession | null>(null);
  const [playing, setPlaying] = useState(false);
  const [controlsOn, setControlsOn] = useState(true);
  const [pos, setPos] = useState(defaultPipPos);
  const [size, setSize] = useState(pipSize);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const reloadingRef = useRef(false);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const hideCtrlTimer = useRef<ReturnType<typeof setTimeout>>();
  const [location, setLocation] = useLocation();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const posRef = useRef(pos);
  posRef.current = pos;

  const stopMini = useCallback(() => {
    reloadingRef.current = true;
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      } catch {
        /* ignore */
      }
    }
    setPlaying(false);
    setSession(null);
    reloadingRef.current = false;
  }, []);

  const startMini = useCallback((next: MiniPlayerSession) => {
    setSize(pipSize());
    setPos(defaultPipPos());
    setControlsOn(true);
    setSession({ ...next, playing: true });
    setPlaying(true);
  }, []);

  const updateMiniTime = useCallback((t: number) => {
    if (sessionRef.current) sessionRef.current.currentTime = t;
  }, []);

  const bumpControls = useCallback(() => {
    setControlsOn(true);
    clearTimeout(hideCtrlTimer.current);
    hideCtrlTimer.current = setTimeout(() => setControlsOn(false), 5000);
  }, []);

  useEffect(() => {
    if (!session) return;
    bumpControls();
    return () => clearTimeout(hideCtrlTimer.current);
  }, [session?.contentId, bumpControls]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !session?.src) return;

    const src = getImageUrl(session.src) || session.src;
    const startAt = session.currentTime || 0;

    reloadingRef.current = true;
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    v.pause();
    v.removeAttribute("src");
    v.load();

    const seekAndPlay = () => {
      reloadingRef.current = false;
      if (startAt > 1) {
        try {
          v.currentTime = startAt;
        } catch {
          /* ignore */
        }
      }
      setPlaying(true);
      v.play().catch(() => {});
    };

    if (src.includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        startLevel: 0,
        maxBufferLength: 20,
        startFragPrefetch: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, seekAndPlay);
    } else if (src.includes(".m3u8") && v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
      v.addEventListener("loadedmetadata", seekAndPlay, { once: true });
    } else {
      v.src = src;
      v.addEventListener("loadedmetadata", seekAndPlay, { once: true });
    }

    return () => {
      reloadingRef.current = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.contentId, session?.src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !session) return;
    if (reloadingRef.current) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing, !!session]);

  useEffect(() => {
    if (!session || !("mediaSession" in navigator)) return;
    try {
      const art = session.poster ? getImageUrl(session.poster) || session.poster : "";
      navigator.mediaSession.metadata = new MediaMetadata({
        title: session.title || "Tataiya",
        artist: "Tataiya",
        album: "Now Playing",
        artwork: art
          ? [
              { src: art, sizes: "96x96", type: "image/jpeg" },
              { src: art, sizes: "256x256", type: "image/jpeg" },
              { src: art, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
      });
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
      navigator.mediaSession.setActionHandler("play", () => setPlaying(true));
      navigator.mediaSession.setActionHandler("pause", () => setPlaying(false));
      navigator.mediaSession.setActionHandler("stop", () => stopMini());
    } catch {
      /* ignore */
    }
  }, [session?.contentId, session?.title, session?.poster, playing, stopMini]);

  const togglePlay = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    bumpControls();
    setPlaying((p) => !p);
  };

  const expand = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    const s = sessionRef.current;
    if (!s) return;
    const t = videoRef.current?.currentTime ?? s.currentTime;
    sessionStorage.setItem(
      `mini_resume_${s.contentId}`,
      JSON.stringify({ time: t, ep: s.ep ?? 1 })
    );
    const ep = s.ep ?? 1;
    const id = s.contentId;
    stopMini();
    setLocation(`/watch/${id}/${ep}`);
  };

  const clampPos = (x: number, y: number, w = size.w, h = size.h) => {
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    return {
      x: Math.min(maxX, Math.max(margin, x)),
      y: Math.min(maxY, Math.max(margin, y)),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-pip-btn]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
    };
    bumpControls();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d?.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    setPos(clampPos(d.origX + dx, d.origY + dy));
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) bumpControls();
  };

  const onWatchPage = location.startsWith("/watch/");
  const showMiniUi = !!session && !onWatchPage;

  useEffect(() => {
    if (onWatchPage && session) stopMini();
  }, [onWatchPage, session, stopMini]);

  useEffect(() => {
    const onResize = () => {
      const next = pipSize();
      setSize(next);
      setPos((p) => clampPos(p.x, p.y, next.w, next.h));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const videoEl = (
    <video
      ref={videoRef}
      className={
        showMiniUi
          ? "w-full h-full object-cover pointer-events-none"
          : "fixed w-px h-px opacity-0 pointer-events-none -z-10"
      }
      playsInline
      muted={false}
      preload="auto"
      onTimeUpdate={() => {
        const t = videoRef.current?.currentTime;
        if (typeof t === "number") updateMiniTime(t);
      }}
      onEnded={() => stopMini()}
      onPlay={() => {
        if (sessionRef.current) setPlaying(true);
      }}
      onPause={() => {
        if (reloadingRef.current || !sessionRef.current) return;
        setPlaying(false);
      }}
    />
  );

  return (
    <MiniPlayerContext.Provider value={{ session, startMini, stopMini, updateMiniTime }}>
      {children}

      {showMiniUi ? (
        <div
          className="fixed z-[320] select-none touch-none"
          style={{
            left: pos.x,
            top: pos.y,
            width: size.w,
            height: size.h,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="relative w-full h-full rounded-lg overflow-hidden bg-black border border-amber-400/35 shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
            {videoEl}

            {/* Only play/pause + enlarge — medium size */}
            {controlsOn && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  data-pip-btn
                  onClick={togglePlay}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 text-black flex items-center justify-center shadow active:scale-95"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <Pause className="w-3.5 h-3.5 fill-black" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-black ml-px" />
                  )}
                </button>
                <button
                  type="button"
                  data-pip-btn
                  onClick={expand}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95"
                  aria-label="Open full player"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        videoEl
      )}
    </MiniPlayerContext.Provider>
  );
}

export function useMiniPlayer() {
  const ctx = useContext(MiniPlayerContext);
  if (!ctx) throw new Error("useMiniPlayer must be used within MiniPlayerProvider");
  return ctx;
}
