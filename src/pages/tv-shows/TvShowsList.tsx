import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Tv, Plus, Search, Edit2, Trash2, Eye, Star, Crown,
  RotateCcw, SlidersHorizontal, ArrowUpDown, Shield, CheckCircle
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
import { getAdminTvShows, deleteAdminTvShow, AdminTvShow } from "@/data/tvShows";
import { getAdminSeasonsByShowId } from "@/data/seasons";
import { getAdminEpisodesByShowId } from "@/data/episodes";

export default function TvShowsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [shows, setShows] = useState<AdminTvShow[]>([]);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteTarget, setDeleteTarget] = useState<AdminTvShow | null>(null);

  const loadShows = () => {
    setShows(getAdminTvShows());
  };

  useEffect(() => {
    loadShows();
    window.addEventListener("admin-tvshows-updated", loadShows);
    return () => window.removeEventListener("admin-tvshows-updated", loadShows);
  }, []);

  // Summary counts
  const totalShows = shows.length;
  const publishedShows = shows.filter((s) => s.status === "published").length;
  const draftShows = shows.filter((s) => s.status === "draft").length;
  const featuredShows = shows.filter((s) => s.featured).length;

  // Filtered & Sorted shows
  const filteredShows = useMemo(() => {
    let list = [...shows];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.shortDescription.toLowerCase().includes(q) ||
          s.genres.some((g) => g.toLowerCase().includes(q))
      );
    }

    if (genreFilter !== "all") {
      list = list.filter((s) =>
        s.genres.some((g) => g.toLowerCase() === genreFilter.toLowerCase())
      );
    }

    if (languageFilter !== "all") {
      list = list.filter(
        (s) => s.language?.toLowerCase() === languageFilter.toLowerCase()
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }

    if (planFilter !== "all") {
      list = list.filter((s) => (planFilter === "vip" ? s.isPremium : !s.isPremium));
    }

    if (featuredFilter !== "all") {
      list = list.filter((s) => (featuredFilter === "yes" ? s.featured : !s.featured));
    }

    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "rating") {
      list.sort((a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"));
    } else if (sortBy === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [shows, search, genreFilter, languageFilter, statusFilter, planFilter, featuredFilter, sortBy]);

  const handleClearFilters = () => {
    setSearch("");
    setGenreFilter("all");
    setLanguageFilter("all");
    setStatusFilter("all");
    setPlanFilter("all");
    setFeaturedFilter("all");
    setSortBy("newest");
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteAdminTvShow(deleteTarget.id);
    toast({
      title: "TV Show Deleted",
      description: `"${deleteTarget.title}" was removed successfully.`,
    });
    setDeleteTarget(null);
    loadShows();
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Tv className="w-7 h-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                TV Shows
              </h1>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Manage TV Show series catalogs, titles, genres, and access metadata.
            </p>
          </div>

          <Button
            onClick={() => setLocation("/admin/tv-shows/add")}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add TV Show
          </Button>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Total TV Shows
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-foreground">{totalShows}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Published
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-emerald-500">{publishedShows}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Draft
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-amber-500">{draftShows}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider block">
              Featured
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-2 text-primary">{featuredShows}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search TV Shows..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Genre */}
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                <SelectItem value="Action">Action</SelectItem>
                <SelectItem value="Drama">Drama</SelectItem>
                <SelectItem value="Crime">Crime</SelectItem>
                <SelectItem value="Sci-Fi">Sci-Fi</SelectItem>
                <SelectItem value="Comedy">Comedy</SelectItem>
                <SelectItem value="Romance">Romance</SelectItem>
                <SelectItem value="Thriller">Thriller</SelectItem>
              </SelectContent>
            </Select>

            {/* Language */}
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="Hindi">Hindi</SelectItem>
                <SelectItem value="English">English</SelectItem>
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Premium / Free */}
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>

              {/* Featured */}
              <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Featured" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Featured</SelectItem>
                  <SelectItem value="yes">Featured Only</SelectItem>
                  <SelectItem value="no">Non-Featured</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
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

        {/* TV Shows Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 text-[10px] uppercase font-black tracking-wider">
                  <TableHead className="py-3 px-4">Poster</TableHead>
                  <TableHead className="py-3 px-4">TV Show Name</TableHead>
                  <TableHead className="py-3 px-4">Genre</TableHead>
                  <TableHead className="py-3 px-4">Language</TableHead>
                  <TableHead className="py-3 px-4">Year</TableHead>
                  <TableHead className="py-3 px-4 text-center">Seasons</TableHead>
                  <TableHead className="py-3 px-4 text-center">Episodes</TableHead>
                  <TableHead className="py-3 px-4">Rating</TableHead>
                  <TableHead className="py-3 px-4">Access</TableHead>
                  <TableHead className="py-3 px-4">Featured</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4">Created</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="py-12 text-center text-muted-foreground">
                      No TV Shows match the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShows.map((s) => {
                    const seasonsCount = getAdminSeasonsByShowId(s.id).length;
                    const episodesCount = getAdminEpisodesByShowId(s.id).length;

                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        {/* Poster */}
                        <TableCell className="py-2.5 px-4">
                          <img
                            src={s.poster}
                            alt={s.title}
                            className="w-10 h-14 object-cover rounded-md bg-zinc-800 border border-border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200&fit=crop";
                            }}
                          />
                        </TableCell>

                        {/* Title */}
                        <TableCell className="py-2.5 px-4 font-bold text-foreground max-w-xs truncate">
                          {s.title}
                        </TableCell>

                        {/* Genre */}
                        <TableCell className="py-2.5 px-4 text-xs text-muted-foreground">
                          {s.genres.slice(0, 2).join(", ")}
                        </TableCell>

                        {/* Language */}
                        <TableCell className="py-2.5 px-4 text-xs text-muted-foreground">
                          {s.language || "Hindi"}
                        </TableCell>

                        {/* Release Year */}
                        <TableCell className="py-2.5 px-4 text-xs font-semibold">
                          {s.year}
                        </TableCell>

                        {/* Seasons Count */}
                        <TableCell className="py-2.5 px-4 text-center font-bold">
                          {seasonsCount}
                        </TableCell>

                        {/* Episodes Count */}
                        <TableCell className="py-2.5 px-4 text-center font-bold">
                          {episodesCount}
                        </TableCell>

                        {/* Rating */}
                        <TableCell className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-500 text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-500" /> {s.rating}
                          </span>
                        </TableCell>

                        {/* Premium/Free */}
                        <TableCell className="py-2.5 px-4">
                          {s.isPremium ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              <Crown className="w-2.5 h-2.5" /> VIP
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                              FREE
                            </span>
                          )}
                        </TableCell>

                        {/* Featured */}
                        <TableCell className="py-2.5 px-4 text-xs">
                          {s.featured ? (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-primary/20 text-primary">
                              YES
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">NO</span>
                          )}
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

                        {/* Created Date */}
                        <TableCell className="py-2.5 px-4 text-[11px] text-muted-foreground whitespace-nowrap">
                          {s.createdAt}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLocation(`/admin/tv-shows/${s.id}`)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLocation(`/admin/tv-shows/${s.id}/edit`)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Edit TV Show"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(s)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete TV Show"
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
              <AlertDialogTitle>Delete TV Show</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action will permanently remove this TV show record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
              >
                Delete Show
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
