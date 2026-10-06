import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Film, Plus, Search, Edit2, Trash2, RotateCcw,
  Clock, Crown, Shield, Play, Lock, Tv, Layers
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
  useGetSeasonList,
  useDeleteEpisode,
  getImageUrl,
} from "@/lib/api-client";
import { formatDuration } from "@/tv-shows/data/tvShows";
import { getAdminTvShowById } from "@/data/tvShows";
import { getAdminSeasonById } from "@/data/seasons";
import { deleteAdminEpisode } from "@/data/episodes";

export default function EpisodesList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: serverEpisodesData } = useGetEpisodeList({ limit: 500 });
  const { data: serverShowsData } = useGetTVShows({ limit: 100 });
  const { data: serverSeasonsData } = useGetSeasonList({});
  const deleteEpisodeMutation = useDeleteEpisode();

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const shows = useMemo(() => {
    const raw: any[] = serverShowsData?.data || [];
    return raw.map((s) => ({
      id: s._id || s.id,
      title: s.title || "Untitled",
      poster: getImageUrl(s.poster || s.thumbnail),
    }));
  }, [serverShowsData]);

  const seasons = useMemo(() => {
    const rawList: any[] = serverSeasonsData?.data || [];
    return rawList.map((s) => ({
      id: s.seasonId || `${s.tvShowId?._id || s.tvShowId}-${s.season}`,
      tvShowId: s.tvShowId?._id || s.tvShowId,
      seasonNumber: s.season,
      title: `Season ${s.season}`,
    }));
  }, [serverSeasonsData]);

  const episodes = useMemo(() => {
    const raw: any[] = serverEpisodesData?.data || [];
    return raw.map((e) => {
      const showId = typeof e.tvShowId === "object" ? e.tvShowId?._id : e.tvShowId;
      const matchingShow = shows.find((s) => s.id === showId);
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
        videoUrl: e.videoUrl || e.hlsUrl || "",
        isFree: e.isFree ?? !e.isLocked,
        status: e.status || "published",
        releaseDate: e.releaseDate || e.createdAt || "2026-01-01",
        createdAt: e.createdAt || "2026-01-01",
        showTitle: (typeof e.tvShowId === "object" ? e.tvShowId?.title : null) || matchingShow?.title || "TV Show",
      };
    });
  }, [serverEpisodesData, shows]);

  // Summary counts
  const totalEpisodes = episodes.length;
  const publishedEpisodes = episodes.filter((e) => e.status === "published").length;
  const freeEpisodes = episodes.filter((e) => e.isFree).length;
  const premiumEpisodes = episodes.filter((e) => !e.isFree).length;

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
  }, [episodes, search, showFilter, seasonFilter, planFilter, statusFilter, sortBy, shows]);

  const handleClearFilters = () => {
    setSearch("");
    setShowFilter("all");
    setSeasonFilter("all");
    setPlanFilter("all");
    setStatusFilter("all");
    setSortBy("newest");
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
              Manage TV Show episodes, videos, thumbnails, and premium access.
            </p>
          </div>

          <Button
            onClick={() => setLocation("/admin/episodes/add")}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Episode
          </Button>
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
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Published
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-emerald-500">{publishedEpisodes}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Free Episodes
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-emerald-400">{freeEpisodes}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              VIP / Premium
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-amber-500">{premiumEpisodes}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                <SelectValue placeholder="All TV Shows" />
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

            {/* Filter by Season (dynamically dependent on show) */}
            <Select value={seasonFilter} onValueChange={setSeasonFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Seasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {availableSeasons.map((s) => {
                  const parentShow = getAdminTvShowById(s.tvShowId);
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {showFilter === "all" ? `${parentShow?.title} - ` : ""}S{s.seasonNumber}: {s.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Free / Premium */}
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

            {/* Status */}
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
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEpisodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      No Episodes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEpisodes.map((ep) => {
                    const tvShow = shows.find((s) => s.id === ep.tvShowId) || getAdminTvShowById(ep.tvShowId);
                    const season = seasons.find((s) => s.id === ep.seasonId || s.seasonNumber === ep.seasonNumber) || getAdminSeasonById(ep.seasonId);

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
                          {season ? `S${season.seasonNumber}: ${season.title}` : "Season 1"}
                        </TableCell>

                        {/* Duration */}
                        <TableCell className="py-2.5 px-4 text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatDuration(ep.duration)}
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

                        {/* Actions */}
                        <TableCell className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
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
