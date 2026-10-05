import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Save, Film, Play, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAdminEpisodeById, saveAdminEpisode, AdminEpisode } from "@/data/episodes";
import { getAdminTvShows, getAdminTvShowById } from "@/data/tvShows";
import { getAdminSeasons, getAdminSeasonsByShowId } from "@/data/seasons";

export default function EpisodeForm() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const isEdit = Boolean(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const tvShows = getAdminTvShows();
  const allSeasons = getAdminSeasons();

  const [tvShowId, setTvShowId] = useState<string>(tvShows[0]?.id || "");
  const [seasonId, setSeasonId] = useState<string>("");
  const [episodeNumber, setEpisodeNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [isFree, setIsFree] = useState(true);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [subtitleUrl, setSubtitleUrl] = useState("");

  // Seasons belonging to currently selected TV Show
  const availableSeasons = useMemo(() => {
    if (!tvShowId) return [];
    return getAdminSeasonsByShowId(tvShowId);
  }, [tvShowId]);

  // Set default seasonId when availableSeasons changes
  useEffect(() => {
    if (availableSeasons.length > 0) {
      const exists = availableSeasons.some((s) => s.id === seasonId);
      if (!exists) {
        setSeasonId(availableSeasons[0].id);
      }
    } else {
      setSeasonId("");
    }
  }, [availableSeasons, seasonId]);

  // Load existing episode if editing
  useEffect(() => {
    if (id) {
      const existing = getAdminEpisodeById(id);
      if (existing) {
        setTvShowId(existing.tvShowId);
        setSeasonId(existing.seasonId);
        setEpisodeNumber(existing.episodeNumber);
        setTitle(existing.title);
        setShortDescription(existing.shortDescription || "");
        setFullDescription(existing.fullDescription || "");
        setThumbnail(existing.thumbnail || "");
        setVideoUrl(existing.videoUrl || "");
        setDurationMinutes(Math.round((existing.duration || 2700) / 60));
        setReleaseDate(existing.releaseDate || "");
        setIsFree(Boolean(existing.isFree));
        setStatus(existing.status || "published");
        setSubtitleUrl(existing.subtitleUrl || "");
      }
    }
  }, [id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvShowId) {
      toast({ title: "Please select a TV Show", variant: "destructive" });
      return;
    }
    if (!seasonId) {
      toast({ title: "Please select a Season", description: "If none exists, create a season first in the Seasons section.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Episode Title is required", variant: "destructive" });
      return;
    }

    const episodeId = id || `ep-${Date.now()}`;
    const selectedShow = getAdminTvShowById(tvShowId);

    const savedEpisode: AdminEpisode = {
      id: episodeId,
      tvShowId,
      seasonId,
      episodeNumber: Number(episodeNumber) || 1,
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      fullDescription: fullDescription.trim(),
      thumbnail: thumbnail.trim() || selectedShow?.backdrop || selectedShow?.poster || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
      videoUrl: videoUrl.trim() || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      duration: (durationMinutes || 45) * 60,
      releaseDate,
      isFree,
      isLocked: !isFree,
      status,
      subtitleUrl: subtitleUrl.trim(),
      createdAt: isEdit ? (getAdminEpisodeById(episodeId)?.createdAt || releaseDate) : new Date().toISOString().split("T")[0],
    };

    saveAdminEpisode(savedEpisode);
    toast({
      title: isEdit ? "Episode Updated" : "Episode Created",
      description: `"${savedEpisode.title}" (Episode ${savedEpisode.episodeNumber}) saved successfully.`,
    });
    setLocation("/admin/episodes");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/episodes")}
            className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Episodes
          </Button>

          <h1 className="text-xl sm:text-2xl font-black text-foreground">
            {isEdit ? "Edit Episode" : "Add New Episode"}
          </h1>
        </div>

        {/* Note */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Film className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Episodes Section Only:</strong> Select an existing TV Show and Season.
            This form manages episode streaming files, playback durations, and paywall locks.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Section: Association */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Series Association
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Select TV Show *</Label>
                <Select value={tvShowId} onValueChange={setTvShowId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select TV Show..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tvShows.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Select Season *</Label>
                {availableSeasons.length === 0 ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
                    <AlertCircle className="w-4 h-4" />
                    <span>No seasons found. Create a season in Seasons section first.</span>
                  </div>
                ) : (
                  <Select value={seasonId} onValueChange={setSeasonId}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select Season..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSeasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          Season {s.seasonNumber}: {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Section: Episode Details */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Episode Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Episode Number *</Label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)}
                  className="h-10"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-bold mb-1.5 block">Episode Title *</Label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dark Signal"
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Short Logline</Label>
              <Input
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary of episode events..."
              />
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Full Description</Label>
              <Textarea
                rows={3}
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                placeholder="In-depth episode storyline..."
              />
            </div>
          </div>

          {/* Section: Media & Video Playback */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Video & Artwork
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Episode Thumbnail URL (16:9)</Label>
                <Input
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://..."
                />
                {thumbnail && (
                  <div className="mt-2 w-40 h-24 rounded-lg overflow-hidden border border-border bg-zinc-900">
                    <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Video Stream URL (MP4 / HLS m3u8)</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://commondatastorage.googleapis.com/.../sample.mp4"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Local demo MP4 or external streaming link.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Duration (Minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 45)}
                  placeholder="45"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Release Date</Label>
                <Input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Subtitle / VTT URL (optional)</Label>
                <Input
                  value={subtitleUrl}
                  onChange={(e) => setSubtitleUrl(e.target.value)}
                  placeholder="https://.../sub.vtt"
                />
              </div>
            </div>
          </div>

          {/* Section: Access & Publishing */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
              Access & Publishing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div>
                  <Label className="text-xs font-bold block">Free Episode</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Allow streaming without subscription</p>
                </div>
                <Switch
                  checked={isFree}
                  onCheckedChange={setIsFree}
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/episodes")}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" /> {isEdit ? "Update Episode" : "Create Episode"}
            </Button>
          </div>
        </form>
      </div>
  );
}
