import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { Minus, X, GripVertical, ChevronUp, Upload } from "lucide-react";

export type BackgroundUpload = {
  id: string;
  fileName: string;
  percent: number;
  status: "uploading" | "done" | "error";
  error?: string;
  result?: any;
};

type UploadQueueContextValue = {
  uploads: BackgroundUpload[];
  startUpload: (job: {
    id?: string;
    fileName: string;
    run: (onProgress: (percent: number) => void) => Promise<any>;
    onComplete?: (result: any) => void;
  }) => string;
  dismissUpload: (id: string) => void;
  clearFinished: () => void;
};

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<BackgroundUpload[]>([]);
  const uploadsRef = useRef(uploads);
  uploadsRef.current = uploads;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadsRef.current.some((u) => u.status === "uploading")) {
        e.preventDefault();
        e.returnValue = "Uploads in progress will be cancelled if you leave.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const dismissUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status === "uploading"));
  }, []);

  const startUpload: UploadQueueContextValue["startUpload"] = useCallback(({ id, fileName, run, onComplete }) => {
    const jobId = id || `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUploads((prev) => [...prev, { id: jobId, fileName, percent: 0, status: "uploading" }]);

    run((percent) => {
      setUploads((prev) => prev.map((u) => (u.id === jobId ? { ...u, percent } : u)));
    })
      .then((result) => {
        setUploads((prev) =>
          prev.map((u) => (u.id === jobId ? { ...u, percent: 100, status: "done", result } : u))
        );
        onComplete?.(result);
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => !(u.id === jobId && u.status === "done")));
        }, 10000);
      })
      .catch((err: any) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === jobId ? { ...u, status: "error", error: err?.message || "Upload failed" } : u
          )
        );
      });

    return jobId;
  }, []);

  return (
    <UploadQueueContext.Provider value={{ uploads, startUpload, dismissUpload, clearFinished }}>
      {children}
      <UploadProgressPanel uploads={uploads} onDismiss={dismissUpload} onClearFinished={clearFinished} />
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error("useUploadQueue must be used within UploadQueueProvider");
  return ctx;
}

function formatName(name: string) {
  if (name.length <= 28) return name;
  return `${name.slice(0, 14)}…${name.slice(-10)}`;
}

function UploadProgressPanel({
  uploads,
  onDismiss,
  onClearFinished,
}: {
  uploads: BackgroundUpload[];
  onDismiss: (id: string) => void;
  onClearFinished: () => void;
}) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const drag = useRef<{ ox: number; oy: number; left: number; top: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      const nextLeft = Math.max(8, Math.min(window.innerWidth - 340, drag.current.left + (e.clientX - drag.current.ox)));
      const nextTop = Math.max(8, Math.min(window.innerHeight - 80, drag.current.top + (e.clientY - drag.current.oy)));
      setPos({ left: nextLeft, top: nextTop });
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  if (!uploads.length) return null;

  const active = uploads.filter((u) => u.status === "uploading").length;
  const overall = Math.round(
    uploads.reduce((s, u) => s + (u.status === "done" ? 100 : u.percent), 0) / uploads.length
  );

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = pos?.left ?? rect.left;
    const top = pos?.top ?? rect.top;
    drag.current = { ox: e.clientX, oy: e.clientY, left, top };
    setPos({ left, top });
  };

  const style: React.CSSProperties = pos
    ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" }
    : { right: 16, bottom: 16 };

  return (
    <div
      ref={panelRef}
      className="fixed z-[120] w-[320px] max-w-[calc(100vw-2rem)] select-none"
      style={style}
    >
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div
          onPointerDown={startDrag}
          className="flex items-center gap-2 px-3 py-2.5 bg-muted/60 border-b border-border cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <Upload className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">
              {active > 0 ? `Uploading ${active} file${active > 1 ? "s" : ""}` : "Uploads"}
            </p>
            {!minimized && (
              <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${overall}%` }} />
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">{overall}%</span>
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            className="h-7 w-7 rounded-lg hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? <ChevronUp className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClearFinished}
            className="h-7 w-7 rounded-lg hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Clear finished"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {!minimized && (
          <div className="p-2 space-y-1.5 max-h-[280px] overflow-y-auto">
            {uploads.map((u) => (
              <div key={u.id} className="rounded-xl border border-border/60 bg-background/50 p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">{formatName(u.fileName)}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {u.status === "uploading" && `${u.percent}%`}
                      {u.status === "done" && "Done"}
                      {u.status === "error" && "Failed"}
                    </span>
                    {u.status !== "uploading" && (
                      <button
                        type="button"
                        onClick={() => onDismiss(u.id)}
                        className="h-5 w-5 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      u.status === "error" ? "bg-destructive" : u.status === "done" ? "bg-emerald-500" : "bg-primary"
                    }`}
                    style={{ width: `${u.status === "error" ? 100 : u.percent}%` }}
                  />
                </div>
                {u.status === "error" && (
                  <p className="text-[10px] text-destructive mt-1 line-clamp-2">{u.error}</p>
                )}
                {u.status === "uploading" && (
                  <p className="text-[10px] text-muted-foreground mt-1">Drag handle or minimize anytime</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
