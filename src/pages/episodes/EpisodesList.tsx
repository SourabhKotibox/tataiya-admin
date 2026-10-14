import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Film, Plus, Search, Edit2, Trash2, RotateCcw,
  Clock, Lock, Tv, Layers, RefreshCw, Loader2,
  CheckCircle2, AlertTriangle, Play, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useGetEpisodeList,
  useGetTVShows,
  useGetEpisodeSeasonList,
  useDeleteEpisode,
  useReprocessEpisodeHls,
  getImageUrl,
} from "@/lib/api-client";
import { formatDuration } from "@/tv-shows/data/tvShows";
import { getAdminTvShowById } from "@/data/tvShows";
import { deleteAdminEpisode } from "@/data/episodes";

function formatEta(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `~${s}s left`;
  if (s === 0) return `~${m}m left`;
  return `~${m}m ${s}s left`;
}

export default function EpisodesList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: serverEpisodesData, refetch: refetchEpisodes } = useGetEpisodeList({ limit: 500 });
  const { data: serverShowsData } = useGetTVShows({ limit: 100 });
  const { data: serverSeasonsData } = useGetEpisodeSeasonList({});
  const deleteEpisodeMutation = useDeleteEpisode();
  const reprocessMutation = useReprocessEpisodeHls();

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hlsFilter, setHlsFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [busyEpisodeId, setBusyEpisodeId] = useState<string | null>(null);

  const shows = useMemo(() => {
    const raw: any[] = serverShowsData?.data || [];
    return raw.map((s) => ({
      id: s._id || s.id,
      title: s.title || "Untitled",
      poster: getImageUrl(s.poster || s.thumbnail),
      backdrop: getImageUrl(s.backdrop || s.bannerImage),
    }));
  }, [serverShowsData]);

  const seasons = useMemo(() => {
    const rawList: any[] = serverSeasonsData?.data || [];
    return rawList.map((s) => ({
      id: s.seasonId || `${s.tvShowId?._id || s.tvShowId}-${s.season}`,
      tvShowId: s.tvShowId?._id || s.tvShowId,
      seasonNumber: s.seasonNumber ?? s.season,
      title: s.title || `Season ${s.seasonNumber ?? s.season}`,
    }));
  }, [serverSeasonsData]);

  const episodes = useMemo(() => {
    const raw: any[] = serverEpisodesData?.data || [];
    return raw.map((e) => {
      const showId = typeof e.tvShowId === "object" ? e.tvShowId?._id : e.tvShowId;
      const matchingShow = shows.find((s) => s.id === showId);
      const isHlsReady = /\.m3u8(\?|#|$)/i.test(String(e.hlsUrl || ""));
      const ps = e.processingStatus || (isHlsReady ? "ready" : "pending");
      const progress = typeof e.processingProgress === "number"
        ? e.processingProgress
        : (isHlsReady || ps === "ready" ? 100 : 0);
      const step = e.processingStep || (isHlsReady || ps === "ready" ? "Ready" : ps === "processing" ? "Transcoding..." : ps === "queued" ? "Queued" : "Pending");
      const etaSeconds = typeof e.processingEtaSeconds === "number" ? e.processingEtaSeconds : null;

      return {
        id: e._id || e.id,
        tvShowId: showId || "",
        seasonId: e.seasonId || `${showId}-${e.season}`,
        episodeNumber: e.episode ?? e.episodeNumber ?? 1,
        seasonNumber: e.season ?? 1,
        title: e.title || "Episode",
        shortDescription: e.description || e.shortDescription || "",
        duration: e.duration || 0,
        thumbnail: getImageUrl(e.thumbnail || e.poster),
        videoUrl: e.videoUrl || e.sourceVideoUrl || "",
        sourceVideoUrl: e.sourceVideoUrl || e.videoUrl || "",
        hlsUrl: e.hlsUrl || "",
        isFree: e.isFree ?? !e.isLocked,
        status: e.status || "published",
        processingStatus: ps,
        processingProgress: progress,
        processingStep: step,
        processingEtaSeconds: etaSeconds,
        processingError: e.processingError || null,
        releaseDate: e.releaseDate || e.createdAt || "2026-01-01",
        createdAt: e.createdAt || "2026-01-01",
        showTitle: (typeof e.tvShowId === "object" ? e.tvShowId?.title : null) || matchingShow?.title || "TV Show",
      };
    });
  }, [serverEpisodesData, shows]);

  // Live polling: refresh data every 2.5s whenever any episode is actively transcoding or queued
  const hasActiveProcessing = useMemo(() => {
    return episodes.some((e) => e.processingStatus === "processing" || e.processingStatus === "queued");
  }, [episodes]);

  useEffect(() => {
    if (!hasActiveProcessing) return;
    const interval = setInterval(() => {
      refetchEpisodes();
    }, 2500);
    return () => clearInterval(interval);
  }, [hasActiveProcessing, refetchEpisodes]);

  // Summary counts
  const totalEpisodes = episodes.length;
  const hlsReadyCount = episodes.filter((e) => e.processingStatus === "ready" || /\.m3u8/i.test(e.hlsUrl || "")).length;
  const processingCount = episodes.filter((e) => e.processingStatus === "processing" || e.processingStatus === "queued").length;
  const needsHlsCount = episodes.filter((e) => e.processingStatus !== "ready" && !/\.m3u8/i.test(e.hlsUrl || "") && e.processingStatus !== "processing" && e.processingStatus !== "queued").length;

  // Dynamically available seasons for selected show filter
  const availableSeasons = useMemo(() => {
    if (showFilter === "all") return seasons;
    return seasons.filter((s) => s.tvShowId === showFilter);
  }, [showFilter, seasons]);

  // Reset season filter if show filter changes
  useEffect(() => {
    if (showFilter !== "all" && seasonFilter !== "all") {
      const match = availableSeasons.some((s) => s.id === seasonFilter);
      if (!match) setSeasonFilter("all");
    }
  }, [showFilter, availableSeasons, seasonFilter]);

  // Filtered & Sorted episodes
  const filteredEpisodes = useMemo(() => {
    let list = [...episodes];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => {
        const show = shows.find((s) => s.id === e.tvShowId) || getAdminTvShowById(e.tvShowId);
        return (
          e.title.toLowerCase().includes(q) ||
          e.shortDescription?.toLowerCase().includes(q) ||
          `ep ${e.episodeNumber}`.includes(q) ||
          show?.title.toLowerCase().includes(q)
        );
      });
    }

    if (showFilter !== "all") {
      list = list.filter((e) => e.tvShowId === showFilter);
    }

    if (seasonFilter !== "all") {
      list = list.filter((e) => e.seasonId === seasonFilter || `Season ${e.seasonNumber}` === seasonFilter || String(e.seasonNumber) === seasonFilter);
    }

    if (planFilter !== "all") {
      list = list.filter((e) => (planFilter === "vip" ? !e.isFree : e.isFree));
    }

    if (statusFilter !== "all") {
      list = list.filter((e) => e.status === statusFilter);
    }

    if (hlsFilter !== "all") {
      list = list.filter((e) => {
        const isReady = e.processingStatus === "ready" || /\.m3u8/i.test(e.hlsUrl || "");
        if (hlsFilter === "ready") return isReady;
        if (hlsFilter === "processing") return e.processingStatus === "processing";
        if (hlsFilter === "queued") return e.processingStatus === "queued";
        if (hlsFilter === "failed") return e.processingStatus === "failed";
        if (hlsFilter === "pending") return !isReady && e.processingStatus !== "processing" && e.processingStatus !== "queued";
        return true;
      });
    }

    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.releaseDate || b.createdAt).getTime() - new Date(a.releaseDate || a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.releaseDate || a.createdAt).getTime() - new Date(b.releaseDate || b.createdAt).getTime());
    } else if (sortBy === "epAsc") {
      list.sort((a, b) => a.episodeNumber - b.episodeNumber);
    } else if (sortBy === "epDesc") {
      list.sort((a, b) => b.episodeNumber - a.episodeNumber);
    }

    return list;
  }, [episodes, search, showFilter, seasonFilter, planFilter, statusFilter, hlsFilter, sortBy, shows]);

  const handleClearFilters = () => {
    setSearch("");
    setShowFilter("all");
    setSeasonFilter("all");
    setPlanFilter("all");
    setStatusFilter("all");
    setHlsFilter("all");
    setSortBy("newest");
  };

  const handleReprocess = async (ep: any) => {
    try {
      setBusyEpisodeId(ep.id);
      await reprocessMutation.mutateAsync(ep.id);
      toast({
        title: "Transcoding Started",
        description: `Queued HLS processing for "${ep.title}". Track progress in the table.`,
      });
      await refetchEpisodes();
    } catch (err: any) {
      toast({
        title: "Failed to transcode",
        description: err?.message || "An error occurred. Check that an MP4 video is uploaded for this episode.",
        variant: "destructive",
      });
    } finally {
      setBusyEpisodeId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEpisodeMutation.mutateAsync(deleteTarget.id);
      deleteAdminEpisode(deleteTarget.id);
      toast({
        title: "Episode Deleted",
        description: `"${deleteTarget.title}" was removed.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to delete episode",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-7 h-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Episodes
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Manage TV Show episodes, videos, thumbnails, and HLS multi-bitrate streaming.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveProcessing && (
            <span className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {processingCount} transcoding active
            </span>
          )}
          <Button
            onClick={() => setLocation("/admin/episodes/add")}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Episode
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
            Total Episodes
          </span>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{totalEpisodes}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              HLS Ready
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-emerald-400">{hlsReadyCount}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Processing / Queued
            </span>
            <Loader2 className={`w-4 h-4 text-amber-400 ${processingCount > 0 ? "animate-spin" : ""}`} />
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-amber-400">{processingCount}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Needs HLS
            </span>
            <AlertTriangle className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-muted-foreground">{needsHlsCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Episodes..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Filter by TV Show */}
          <Select value={showFilter} onValueChange={setShowFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All TV Shows</SelectItem>
              {shows.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter by Season */}
          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {availableSeasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter by Access */}
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Access</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="vip">VIP / Premium</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter by Publication Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter by HLS Processing Status */}
          <Select value={hlsFilter} onValueChange={setHlsFilter}>
            <SelectTrigger className="h-9 text-xs font-semibold text-primary">
              <SelectValue placeholder="HLS Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All HLS Status</SelectItem>
              <SelectItem value="ready">Ready (Transcoded)</SelectItem>
              <SelectItem value="processing">Processing (% ETA)</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="pending">Needs HLS</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="epAsc">Episode # (1, 2, 3...)</SelectItem>
                <SelectItem value="epDesc">Episode # (Highest First)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
          </Button>
        </div>
      </div>

      {/* Episodes Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 text-[10px] uppercase font-black tracking-wider">
                <TableHead className="py-3 px-4">Thumbnail</TableHead>
                <TableHead className="py-3 px-4 text-center">EP #</TableHead>
                <TableHead className="py-3 px-4">Episode Title</TableHead>
                <TableHead className="py-3 px-4">TV Show</TableHead>
                <TableHead className="py-3 px-4">Season</TableHead>
                <TableHead className="py-3 px-4">Duration</TableHead>
                <TableHead className="py-3 px-4">Access</TableHead>
                <TableHead className="py-3 px-4">Status</TableHead>
                <TableHead className="py-3 px-4 min-w-[200px]">HLS Processing</TableHead>
                <TableHead className="py-3 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEpisodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                    No Episodes found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEpisodes.map((ep) => {
                  const tvShow = shows.find((s) => s.id === ep.tvShowId) || getAdminTvShowById(ep.tvShowId);
                  const season = seasons.find((s) => s.id === ep.seasonId || (s.seasonNumber === ep.seasonNumber && s.tvShowId === ep.tvShowId));

                  const isBusy = busyEpisodeId === ep.id;
                  const isReady = ep.processingStatus === "ready" || /\.m3u8/i.test(ep.hlsUrl || "");
                  const isProcessing = ep.processingStatus === "processing";
                  const isQueued = ep.processingStatus === "queued";
                  const isFailed = ep.processingStatus === "failed";

                  return (
                    <TableRow key={ep.id} className="hover:bg-muted/30">
                      {/* Thumbnail */}
                      <TableCell className="py-2.5 px-4">
                        <img
                          src={getImageUrl(ep.thumbnail || tvShow?.backdrop || tvShow?.poster)}
                          alt={ep.title}
                          className="w-16 h-10 object-cover rounded-md bg-zinc-800 border border-border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200&fit=crop";
                          }}
                        />
                      </TableCell>

                      {/* Ep # */}
                      <TableCell className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted">
                          EP {ep.episodeNumber}
                        </span>
                      </TableCell>

                      {/* Title */}
                      <TableCell className="py-2.5 px-4 font-bold text-foreground max-w-xs truncate">
                        {ep.title}
                      </TableCell>

                      {/* TV Show */}
                      <TableCell className="py-2.5 px-4 font-semibold text-primary">
                        {tvShow?.title || "Unknown Show"}
                      </TableCell>

                      {/* Season */}
                      <TableCell className="py-2.5 px-4 text-xs font-semibold text-muted-foreground">
                        {season ? `S${season.seasonNumber}: ${season.title}` : `Season ${ep.seasonNumber}`}
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="py-2.5 px-4 text-xs text-muted-foreground">
                        {ep.duration > 0 ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {formatDuration(ep.duration)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      {/* Free / Premium Access */}
                      <TableCell className="py-2.5 px-4">
                        {ep.isFree ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                            FREE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            <Lock className="w-2.5 h-2.5" /> VIP
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ep.status === "published"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {ep.status === "published" ? "Published" : "Draft"}
                        </span>
                      </TableCell>

                      {/* HLS Processing — Live % Progress, Step & ETA Countdown */}
                      <TableCell className="py-2.5 px-4 min-w-[200px]">
                        {(() => {
                          if (isProcessing) {
                            return (
                              <div className="space-y-1.5 py-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                    <span>{Math.round(ep.processingProgress)}%</span>
                                  </span>
                                  {ep.processingEtaSeconds !== null && ep.processingEtaSeconds > 0 && (
                                    <span className="text-[11px] font-bold text-amber-300/90 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      {formatEta(ep.processingEtaSeconds)}
                                    </span>
                                  )}
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(6, Math.min(100, ep.processingProgress))}%` }}
                                  />
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate max-w-[190px]">
                                  {ep.processingStep || "Transcoding in progress..."}
                                </div>
                              </div>
                            );
                          }

                          if (isQueued) {
                            return (
                              <div className="space-y-1 py-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <Loader2 className="w-3 h-3 animate-spin" /> QUEUED
                                </span>
                                <div className="text-[10px] text-muted-foreground">In queue to transcode</div>
                              </div>
                            );
                          }

                          if (isFailed) {
                            return (
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30"
                                  title={ep.processingError || "Transcoding failed"}
                                >
                                  <AlertTriangle className="w-3 h-3" /> FAILED
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => handleReprocess(ep)}
                                  disabled={isBusy}
                                  className="h-7 px-2.5 text-[11px] font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 cursor-pointer"
                                  title="Retry transcoding"
                                >
                                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                  Retry
                                </Button>
                              </div>
                            );
                          }

                          if (isReady) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" /> READY
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReprocess(ep)}
                                  disabled={isBusy}
                                  title="Re-encode / Re-transcode HLS"
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                                >
                                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                </Button>
                              </div>
                            );
                          }

                          // Pending / Unprocessed — 1-click button to start processing
                          return (
                            <Button
                              size="sm"
                              onClick={() => handleReprocess(ep)}
                              disabled={isBusy}
                              className="h-7 px-3 text-[11px] font-extrabold bg-blue-600 hover:bg-blue-500 text-white shadow-sm gap-1.5 cursor-pointer"
                              title="Start HLS multi-bitrate processing"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3 fill-white" />
                              )}
                              Start HLS
                            </Button>
                          );
                        })()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReprocess(ep)}
                            className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer disabled:opacity-40"
                            title={isReady ? "Re-transcode HLS" : "Start HLS Transcoding"}
                            disabled={isBusy || isProcessing}
                          >
                            {isBusy || isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                            ) : (
                              <Layers className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation(`/admin/episodes/${ep.id}/edit`)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit Episode"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(ep)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete Episode"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Episode</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete episode &quot;{deleteTarget?.title}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Delete Episode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
