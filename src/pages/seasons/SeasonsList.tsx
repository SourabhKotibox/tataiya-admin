import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Layers, Plus, Search, Edit2, Trash2, RotateCcw,
  Film, Tv, CheckCircle, ArrowUpDown
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
  useGetSeasonList,
  useGetTVShows,
  useDeleteSeason,
  getImageUrl,
} from "@/lib/api-client";

export default function SeasonsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: serverSeasonsData } = useGetSeasonList({});
  const { data: serverShowsData } = useGetTVShows({ limit: 100 });
  const deleteSeasonMutation = useDeleteSeason();

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seasonNumberFilter, setSeasonNumberFilter] = useState("all");
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
    return rawList.map((s) => {
      const matchingShow = shows.find((sh) => sh.id === (s.tvShowId?._id || s.tvShowId));
      const seasonNumber = s.seasonNumber ?? s.season;
      return {
        id: s.id || s._id || s.seasonId,
        tvShowId: s.tvShowId?._id || s.tvShowId,
        seasonNumber,
        title: s.title || `Season ${seasonNumber}`,
        description: s.description || "",
        poster: getImageUrl(s.poster || s.posterImage || s.thumbnail || matchingShow?.poster),
        posterImage: s.posterImage || s.poster || s.thumbnail,
        releaseDate: s.releaseDate ? String(s.releaseDate).slice(0, 10) : "",
        status: s.status || "published",
        createdAt: s.createdAt ? String(s.createdAt).slice(0, 10) : "",
        showName: s.showName || matchingShow?.title || "TV Show",
        epCount: s.episodeCount ?? 0,
      };
    });
  }, [serverSeasonsData, shows]);

  // Summary counts
  const totalSeasons = seasons.length;
  const publishedSeasons = seasons.filter((s) => s.status === "published").length;
  const draftSeasons = seasons.filter((s) => s.status === "draft").length;

  // Filter & Sort
  const filteredSeasons = useMemo(() => {
    let list = [...seasons];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => {
        return (
          s.title.toLowerCase().includes(q) ||
          `season ${s.seasonNumber}`.includes(q) ||
          s.showName.toLowerCase().includes(q)
        );
      });
    }

    if (showFilter !== "all") {
      list = list.filter((s) => s.tvShowId === showFilter);
    }

    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }

    if (seasonNumberFilter !== "all") {
      list = list.filter((s) => s.seasonNumber.toString() === seasonNumberFilter);
    }

    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.releaseDate || b.createdAt).getTime() - new Date(a.releaseDate || a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.releaseDate || a.createdAt).getTime() - new Date(b.releaseDate || b.createdAt).getTime());
    } else if (sortBy === "seasonAsc") {
      list.sort((a, b) => a.seasonNumber - b.seasonNumber);
    } else if (sortBy === "seasonDesc") {
      list.sort((a, b) => b.seasonNumber - a.seasonNumber);
    }

    return list;
  }, [seasons, search, showFilter, statusFilter, seasonNumberFilter, sortBy]);

  const handleClearFilters = () => {
    setSearch("");
    setShowFilter("all");
    setStatusFilter("all");
    setSeasonNumberFilter("all");
    setSortBy("newest");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSeasonMutation.mutateAsync(deleteTarget.id);
      toast({
        title: "Season Deleted",
        description: `"${deleteTarget.title}" was removed.`,
      });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.message || "Could not delete Season.",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-7 h-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Seasons
              </h1>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Manage TV Show seasons, release schedules, and descriptions.
            </p>
          </div>

          <Button
            onClick={() => setLocation("/admin/seasons/add")}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Season
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Total Seasons
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{totalSeasons}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Published Seasons
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-emerald-500">{publishedSeasons}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Draft Seasons
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-amber-500">{draftSeasons}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Seasons or Shows..."
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

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            {/* Season Number */}
            <Select value={seasonNumberFilter} onValueChange={setSeasonNumberFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Season Number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Season Numbers</SelectItem>
                <SelectItem value="1">Season 1</SelectItem>
                <SelectItem value="2">Season 2</SelectItem>
                <SelectItem value="3">Season 3</SelectItem>
                <SelectItem value="4">Season 4</SelectItem>
                <SelectItem value="5">Season 5+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest Release</SelectItem>
                  <SelectItem value="oldest">Oldest Release</SelectItem>
                  <SelectItem value="seasonAsc">Season # (Ascending)</SelectItem>
                  <SelectItem value="seasonDesc">Season # (Descending)</SelectItem>
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

        {/* Seasons Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 text-[10px] uppercase font-black tracking-wider">
                  <TableHead className="py-3 px-4">Poster</TableHead>
                  <TableHead className="py-3 px-4">Season Name</TableHead>
                  <TableHead className="py-3 px-4">TV Show</TableHead>
                  <TableHead className="py-3 px-4 text-center">Season #</TableHead>
                  <TableHead className="py-3 px-4 text-center">Episodes</TableHead>
                  <TableHead className="py-3 px-4">Release Date</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSeasons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      No Seasons found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSeasons.map((s) => {
                    const tvShow = shows.find((sh) => sh.id === s.tvShowId);
                    const epCount = s.epCount ?? 0;

                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        {/* Poster */}
                        <TableCell className="py-2.5 px-4">
                          <img
                            src={getImageUrl(s.poster || s.posterImage || tvShow?.poster)}
                            alt={s.title}
                            className="w-12 h-16 object-cover rounded-md bg-zinc-800 border border-border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200&fit=crop";
                            }}
                          />
                        </TableCell>

                        {/* Season Name */}
                        <TableCell className="py-2.5 px-4 font-bold text-foreground">
                          {s.title}
                        </TableCell>

                        {/* TV Show Name */}
                        <TableCell className="py-2.5 px-4">
                          <span className="font-semibold text-primary">
                            {tvShow?.title || "Unknown Show"}
                          </span>
                        </TableCell>

                        {/* Season Number */}
                        <TableCell className="py-2.5 px-4 text-center font-bold">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-muted font-bold">
                            S{s.seasonNumber}
                          </span>
                        </TableCell>

                        {/* Episodes Count */}
                        <TableCell className="py-2.5 px-4 text-center font-bold">
                          {epCount}
                        </TableCell>

                        {/* Release Date */}
                        <TableCell className="py-2.5 px-4 text-xs text-muted-foreground">
                          {s.releaseDate || s.createdAt}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === "published"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {s.status === "published" ? "Published" : "Draft"}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLocation(`/admin/seasons/${s.id}/edit`)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Edit Season"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(s)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete Season"
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
              <AlertDialogTitle>Delete Season</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This will remove this season record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
              >
                Delete Season
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
