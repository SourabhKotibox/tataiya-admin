import { useParams, useLocation } from "wouter";
import { useMemo } from "react";
import {
  ChevronLeft, Edit2, Star, Crown, Tv, Layers, Film,
  Calendar, Globe, Shield, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetTVShowById,
  useGetSeasonList,
  useGetEpisodeList,
  getImageUrl,
} from "@/lib/api-client";

export default function TvShowDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();

  const { data: serverShowData, isLoading } = useGetTVShowById(id || "");
  const { data: seasonsData } = useGetSeasonList(id ? { tvShowId: id } : {});
  const { data: episodesData } = useGetEpisodeList(id ? { tvShowId: id, limit: 100 } : {});

  const show = useMemo(() => {
    const raw = serverShowData?.data || serverShowData;
    if (raw) {
      return {
        id: raw._id || raw.id,
        title: raw.title || "Untitled Show",
        shortDescription: raw.shortDescription || raw.description || "",
        fullDescription: raw.description || raw.shortDescription || "",
        poster: getImageUrl(raw.poster || raw.thumbnail || raw.bannerImage),
        backdrop: getImageUrl(raw.bannerImage || raw.backdrop || raw.poster),
        genres: Array.isArray(raw.genres)
          ? raw.genres.map((g: any) => (typeof g === "string" ? g : g?.name || "")).filter(Boolean)
          : [],
        language: Array.isArray(raw.languages) && raw.languages.length > 0
          ? (typeof raw.languages[0] === "string" ? raw.languages[0] : raw.languages[0]?.name || "Hindi")
          : (raw.language || "Hindi"),
        year: raw.year ? String(raw.year) : "2026",
        rating: raw.rating ? String(raw.rating) : "8.0",
        ageRating: raw.ageRating ? `${raw.ageRating}+` : "16+",
        contentType: raw.contentType || "series",
        tags: raw.tags || [],
        isPremium: (raw.planRequired && raw.planRequired !== "free") || Boolean(raw.isPremium),
        featured: Boolean(raw.featured),
        status: raw.status || "draft",
        createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString().split("T")[0] : "2026-01-01",
        director: raw.producer || raw.director || "",
        totalSeasons: typeof raw.totalSeasons === "number" ? raw.totalSeasons : (raw.seasons?.length || 0),
        totalEpisodes: typeof raw.totalEpisodes === "number" ? raw.totalEpisodes : (raw.episodes?.length || 0),
      };
    }
    return undefined;
  }, [serverShowData]);

  const totalSeasonsCount = seasonsData?.data?.length ?? (show?.totalSeasons ?? 0);
  const totalEpisodesCount = episodesData?.pagination?.total ?? episodesData?.data?.length ?? (show?.totalEpisodes ?? 0);

  if (!show && !isLoading) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">TV Show not found.</p>
        <Button onClick={() => setLocation("/admin/tv-shows")}>Back to List</Button>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading TV Show details...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/tv-shows")}
            className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back to TV Shows
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/tv-shows/${show.id}`, "_blank")}
              className="gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" /> View Public Page
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation(`/admin/tv-shows/${show.id}/edit`)}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
            >
              <Edit2 className="w-4 h-4" /> Edit Show
            </Button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {/* Backdrop Header */}
          <div className="relative h-48 sm:h-64 w-full bg-zinc-900 overflow-hidden">
            <img
              src={show.backdrop || show.poster}
              alt={show.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=85";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>

          {/* Details Bar */}
          <div className="relative p-6 sm:p-8 -mt-20 flex flex-col sm:flex-row gap-6 items-start">
            {/* Poster */}
            <div className="w-32 sm:w-40 aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-2 border-background flex-shrink-0 bg-zinc-900">
              <img
                src={show.poster}
                alt={show.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/20 text-primary uppercase">
                  {show.contentType === "short-drama" ? "Short Drama" : "TV Show"}
                </span>
                {show.isPremium ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-500">
                    <Crown className="w-3 h-3" /> VIP
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-500">
                    FREE
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    show.status === "published"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {show.status === "published" ? "Published" : "Draft"}
                </span>
                {show.featured && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary">
                    Featured
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                {show.title}
              </h2>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-500" /> {show.rating}
                </span>
                <span>•</span>
                <span>{show.year}</span>
                <span>•</span>
                <span>{show.ageRating}</span>
                <span>•</span>
                <span>{show.language || "Hindi"}</span>
                <span>•</span>
                <span>{show.genres.join(", ")}</span>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed max-w-2xl">
                {show.fullDescription || show.shortDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Related Management Counts Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Seasons Count card with direct link */}
          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Layers className="w-4 h-4 text-primary" />
                <span>Total Seasons</span>
              </div>
              <p className="text-3xl font-black mt-2 text-foreground">{totalSeasonsCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Managed in the Seasons section
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin/seasons")}
              className="gap-1.5 cursor-pointer"
            >
              Go to Seasons →
            </Button>
          </div>

          {/* Episodes Count card with direct link */}
          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Film className="w-4 h-4 text-amber-500" />
                <span>Total Episodes</span>
              </div>
              <p className="text-3xl font-black mt-2 text-foreground">{totalEpisodesCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Managed in the Episodes section
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin/episodes")}
              className="gap-1.5 cursor-pointer"
            >
              Go to Episodes →
            </Button>
          </div>
        </div>
      </div>
  );
}
