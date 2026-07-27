import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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
};

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<BackgroundUpload[]>([]);

  const startUpload: UploadQueueContextValue["startUpload"] = useCallback(({ id, fileName, run, onComplete }) => {
    const jobId = id || `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUploads((prev) => [
      ...prev,
      { id: jobId, fileName, percent: 0, status: "uploading" },
    ]);

    run((percent) => {
      setUploads((prev) =>
        prev.map((u) => (u.id === jobId ? { ...u, percent } : u))
      );
    })
      .then((result) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === jobId ? { ...u, percent: 100, status: "done", result } : u
          )
        );
        onComplete?.(result);
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== jobId));
        }, 8000);
      })
      .catch((err: any) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === jobId
              ? { ...u, status: "error", error: err?.message || "Upload failed" }
              : u
          )
        );
      });

    return jobId;
  }, []);

  return (
    <UploadQueueContext.Provider value={{ uploads, startUpload }}>
      {children}
      <UploadProgressPanel uploads={uploads} />
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

function UploadProgressPanel({ uploads }: { uploads: BackgroundUpload[] }) {
  if (!uploads.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[320px] max-w-[calc(100vw-2rem)] space-y-2">
      {uploads.map((u) => (
        <div
          key={u.id}
          className="rounded-xl border border-border bg-card/95 backdrop-blur shadow-lg p-3"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-xs font-semibold text-foreground truncate">
              {formatName(u.fileName)}
            </p>
            <span className="text-[10px] font-bold text-muted-foreground shrink-0">
              {u.status === "uploading" && `${u.percent}%`}
              {u.status === "done" && "Done"}
              {u.status === "error" && "Failed"}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                u.status === "error"
                  ? "bg-destructive"
                  : u.status === "done"
                    ? "bg-emerald-500"
                    : "bg-primary"
              }`}
              style={{ width: `${u.status === "error" ? 100 : u.percent}%` }}
            />
          </div>
          {u.status === "error" && (
            <p className="text-[10px] text-destructive mt-1.5 line-clamp-2">{u.error}</p>
          )}
          {u.status === "uploading" && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Uploading in background — you can keep working
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
