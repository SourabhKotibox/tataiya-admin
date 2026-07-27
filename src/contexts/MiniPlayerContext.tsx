import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
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

export function MiniPlayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MiniPlayerSession | null>(null);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const reloadingRef = useRef(false);
  const [location, setLocation] = useLocation();
  const sessionRef = useRef(session);
  sessionRef.current = session;

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
    setSession({ ...next, playing: true });
    setPlaying(true);
  }, []);

  const updateMiniTime = useCallback((t: number) => {
    // Keep time in a ref-backed session copy without re-rendering every frame
    if (sessionRef.current) sessionRef.current.currentTime = t;
  }, []);

  // Load / play when session src changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !session?.src) return;

    const src = getImageUrl(session.src) || session.src;
    const startAt = session.currentTime || 0;
    const shouldPlay = true;

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
      if (shouldPlay) {
        setPlaying(true);
        v.play().catch(() => {});
      }
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
    // only re-bind when content/src identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.contentId, session?.src]);

  // Play / pause sync (do not depend on full session — avoids timeupdate thrash)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !session) return;
    if (reloadingRef.current) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing, !!session]);

  // Media Session (lock-screen / notification / Control Center controls)
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
      navigator.mediaSession.setActionHandler("seekbackward", (d) => {
        const v = videoRef.current;
        if (v) v.currentTime = Math.max(0, v.currentTime - (d.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler("seekforward", (d) => {
        const v = videoRef.current;
        if (v) v.currentTime = Math.min(v.duration || v.currentTime + 10, v.currentTime + (d.seekOffset || 10));
      });
    } catch {
      /* ignore unsupported */
    }
  }, [session?.contentId, session?.title, session?.poster, playing, stopMini]);

  const togglePlay = () => setPlaying((p) => !p);

  const expand = () => {
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

  const onWatchPage = location.startsWith("/watch/");
  const showMiniUi = !!session && !onWatchPage;

  // Never keep mini audio alive on the full player route
  useEffect(() => {
    if (onWatchPage && session) stopMini();
  }, [onWatchPage, session, stopMini]);

  const videoEl = (
    <video
      ref={videoRef}
      className={showMiniUi ? "w-full h-full object-cover" : "fixed w-px h-px opacity-0 pointer-events-none -z-10"}
      playsInline
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
        <div className="fixed z-[280] left-3 right-3 sm:left-auto sm:right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:w-[320px] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="rounded-2xl overflow-hidden bg-[#12121a]/95 border border-amber-400/25 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl">
            <button type="button" onClick={expand} className="relative block w-full aspect-video bg-black">
              {videoEl}
              <span className="absolute left-2 top-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-black/55 px-1.5 py-0.5 rounded">
                Now Playing
              </span>
            </button>
            <div className="flex items-center gap-2 p-2.5">
              <button type="button" onClick={expand} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-white truncate">{session!.title}</p>
                <p className="text-[10px] text-white/50">Tap video to open full player</p>
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center shrink-0 active:scale-95"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={expand}
                className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 hover:bg-white/15"
                aria-label="Expand"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={stopMini}
                className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 hover:bg-red-500/80"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
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
