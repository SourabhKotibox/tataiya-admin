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
import { Play, Pause, X, Maximize2 } from "lucide-react";
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

const PIP_W = 168;
const PIP_H = 94;

function defaultPipPos() {
  if (typeof window === "undefined") return { x: 16, y: 120 };
  const margin = 12;
  const safeBottom = 72;
  return {
    x: Math.max(margin, window.innerWidth - PIP_W - margin),
    y: Math.max(margin, window.innerHeight - PIP_H - safeBottom - margin),
  };
}

export function MiniPlayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MiniPlayerSession | null>(null);
  const [playing, setPlaying] = useState(false);
  const [controlsOn, setControlsOn] = useState(true);
  const [pos, setPos] = useState(defaultPipPos);
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

  // Load / play when session src changes
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
      const hls = new Hls({ enableWorker: true });
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

  const clampPos = (x: number, y: number) => {
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - PIP_W - margin);
    const maxY = Math.max(margin, window.innerHeight - PIP_H - margin);
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
    if (!d.moved) {
      expand();
    }
  };

  const onWatchPage = location.startsWith("/watch/");
  const showMiniUi = !!session && !onWatchPage;

  useEffect(() => {
    if (onWatchPage && session) stopMini();
  }, [onWatchPage, session, stopMini]);

  // Keep in view on rotate / resize
  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const videoEl = (
    <video
      ref={videoRef}
      className={showMiniUi ? "w-full h-full object-cover pointer-events-none" : "fixed w-px h-px opacity-0 pointer-events-none -z-10"}
      playsInline
      muted={false}
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
            width: PIP_W,
            height: PIP_H,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="relative w-full h-full rounded-xl overflow-hidden bg-black border border-amber-400/40 shadow-[0_10px_28px_rgba(0,0,0,0.7)]">
            {videoEl}

            {/* Always-on thin title strip when controls hidden */}
            {!controlsOn && (
              <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                <p className="text-[9px] font-bold text-white truncate">{session!.title}</p>
              </div>
            )}

            {/* Controls overlay — show ≥5s after tap/drag start */}
            {controlsOn && (
              <div className="absolute inset-0 bg-black/35 flex flex-col justify-between p-1.5">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 bg-black/55 px-1 py-0.5 rounded">
                    Live
                  </span>
                  <button
                    type="button"
                    data-pip-btn
                    onClick={(e) => {
                      e.stopPropagation();
                      stopMini();
                    }}
                    className="w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    data-pip-btn
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center shadow"
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    data-pip-btn
                    onClick={expand}
                    className="w-7 h-7 rounded-full bg-white/15 text-white flex items-center justify-center"
                    aria-label="Open full player"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[8px] font-semibold text-white/90 truncate px-0.5">{session!.title}</p>
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
