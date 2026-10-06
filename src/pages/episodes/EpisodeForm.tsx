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
import MediaPicker from "@/components/MediaPicker";
import {
  useGetEpisodeById,
  useGetTVShows,
  useGetSeasonList,
  useCreateEpisode,
  useUpdateEpisode,
  getImageUrl,
} from "@/lib/api-client";

export default function EpisodeForm() {
  const params = useParams<{ id?: string }>();
  const id = params.id;
  const isEdit = Boolean(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: serverShowsData } = useGetTVShows({ limit: 100 });
  const { data: existingEpisodeData } = useGetEpisodeById(id || "");
  const createEpisodeMutation = useCreateEpisode();
  const updateEpisodeMutation = useUpdateEpisode();

  const tvShows = useMemo(() => {
    const raw: any[] = serverShowsData?.data || [];
    if (raw.length > 0) {
      return raw.map((s) => ({
        id: s._id || s.id,
        title: s.title || "Untitled",
        poster: getImageUrl(s.poster || s.thumbnail),
        backdrop: getImageUrl(s.backdrop || s.banner),
      }));
    }
    return [];
  }, [serverShowsData]);

  const [tvShowId, setTvShowId] = useState<string>("");
  const [seasonId, setSeasonId] = useState<string>("");
  const [episodeNumber, setEpisodeNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [videoUploadType, setVideoUploadType] = useState<string>("url");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFilePath, setVideoFilePath] = useState("");
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [videoUploadPending, setVideoUploadPending] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [isFree, setIsFree] = useState(true);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [subtitleUrl, setSubtitleUrl] = useState("");

  const { data: serverSeasonsData } = useGetSeasonList(tvShowId ? { tvShowId } : undefined);

  useEffect(() => {
    if (!tvShowId && tvShows.length > 0) {
      setTvShowId(tvShows[0].id);
    }
  }, [tvShows, tvShowId]);

  // Seasons belonging to currently selected TV Show
  const availableSeasons = useMemo(() => {
    const rawList: any[] = serverSeasonsData?.data || [];
    if (rawList.length > 0) {
      return rawList.map((s) => ({
        id: s.seasonId || `${s.tvShowId?._id || s.tvShowId}-${s.season}`,
        seasonNumber: s.season,
        title: s.title || `Season ${s.season}`,
      }));
    }
    return [{ id: "season-1", seasonNumber: 1, title: "Season 1" }];
  }, [serverSeasonsData, tvShowId]);

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
      const existing = existingEpisodeData;
      if (existing) {
        const sid = typeof existing.tvShowId === "object" ? existing.tvShowId?._id : existing.tvShowId;
        if (sid) setTvShowId(sid);
        setSeasonId(existing.seasonId || (existing.season ? String(existing.season) : ""));
        setEpisodeNumber(existing.episodeNumber ?? existing.episode ?? 1);
        setTitle(existing.title || "");
        setShortDescription(existing.shortDescription || existing.description || "");
        setFullDescription(existing.fullDescription || existing.description || "");
        setThumbnail(existing.thumbnail || existing.poster || "");
        setVideoUrl(existing.hlsUrl || existing.sourceVideoUrl || existing.videoUrl || "");
        setVideoFilePath(existing.videoFilePath || existing.sourceVideoUrl || "");
        if (existing.videoUploadType) {
          setVideoUploadType(existing.videoUploadType);
        } else if (existing.hlsUrl || existing.videoUrl?.includes(".m3u8")) {
          setVideoUploadType("hls");
        } else if (
          existing.videoFilePath ||
          (existing.sourceVideoUrl && !/^https?:\/\//i.test(existing.sourceVideoUrl)) ||
          existing.videoUrl?.startsWith("/uploads/") ||
          existing.videoUrl?.includes("/media/")
        ) {
          setVideoUploadType("local");
        } else {
          setVideoUploadType("url");
        }
        setDurationMinutes(Math.round((existing.duration || 2700) / 60));
        setReleaseDate(existing.releaseDate ? existing.releaseDate.split("T")[0] : new Date().toISOString().split("T")[0]);
        setIsFree(existing.isFree ?? !existing.isLocked);
        setStatus(existing.status || "published");
        setSubtitleUrl(existing.subtitleUrl || "");
      }
    }
  }, [id, existingEpisodeData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvShowId) {
      toast({ title: "Please select a TV Show", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Episode Title is required", variant: "destructive" });
      return;
    }
    if (videoUploadPending) {
      toast({ title: "Video upload is still in progress", description: "Wait for the upload to finish before saving.", variant: "destructive" });
      return;
    }

    const selectedSeason = availableSeasons.find((s) => s.id === seasonId || String(s.seasonNumber) === seasonId);
    const seasonNumberVal = selectedSeason ? selectedSeason.seasonNumber : (parseInt(seasonId) || 1);

    const resolvedVideoUrl = (
      videoUploadType === "local"
        ? (videoFilePath || videoUrl)
        : videoUrl
    ).trim();
    const isHlsPlaylist = /\.m3u8(?:[?#]|$)/i.test(resolvedVideoUrl);
    if (resolvedVideoUrl.startsWith("blob:")) {
      toast({ title: "Video upload is not complete", description: "Select the video again and wait for the upload to finish.", variant: "destructive" });
      return;
    }

    const episodePayload: any = {
      tvShowId,
      season: seasonNumberVal,
      episode: Number(episodeNumber) || 1,
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      fullDescription: fullDescription.trim(),
      description: fullDescription.trim() || shortDescription.trim() || undefined,
      thumbnail: thumbnail.trim() || undefined,
      sourceVideoUrl: videoUploadType === "local" && resolvedVideoUrl && !isHlsPlaylist ? resolvedVideoUrl : undefined,
      hlsUrl: resolvedVideoUrl && isHlsPlaylist ? resolvedVideoUrl : undefined,
      duration: (durationMinutes || 45) * 60,
      releaseDate: releaseDate || undefined,
      isFree,
      isLocked: !isFree,
      status,
      subtitleUrl: subtitleUrl.trim() || undefined,
    };

    try {
      if (isEdit && id) {
        await updateEpisodeMutation.mutateAsync({
          id,
          data: episodePayload,
        });
        toast({
          title: "Episode Updated",
          description: `"${title.trim()}" (Episode ${episodeNumber}) saved successfully.`,
        });
      } else {
        await createEpisodeMutation.mutateAsync(episodePayload);
        toast({
          title: "Episode Created",
          description: `"${title.trim()}" (Episode ${episodeNumber}) saved successfully.`,
        });
      }

      setLocation("/admin/episodes");
    } catch (err: any) {
      console.error("Episode save error:", err);
      if (
        err?.status === 409 ||
        err?.response?.status === 409 ||
        err?.message?.includes("already exists") ||
        err?.message?.includes("Conflict") ||
        err?.message?.includes("409")
      ) {
        toast({
          title: "Episode Conflict (409)",
          description: err.message || `Episode ${episodeNumber} already exists in Season ${seasonNumberVal} for this TV Show. Please choose a different episode number.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error saving episode",
          description: err.message || "Failed to save episode to server.",
          variant: "destructive",
        });
      }
    }
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

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Episode Thumbnail URL (16:9)</Label>
              <Input
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://..."
                className="h-10 text-xs"
              />
              {thumbnail && (
                <div className="mt-2 w-40 h-24 rounded-lg overflow-hidden border border-border bg-zinc-900">
                  <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Video Upload Type</Label>
                <Select value={videoUploadType} onValueChange={setVideoUploadType}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">External URL</SelectItem>
                    <SelectItem value="hls">HLS / M3U8 URL</SelectItem>
                    <SelectItem value="local">Local (Media Library)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Video</Label>
                {videoUploadType === "local" ? (
                  <div
                    onClick={() => setVideoPickerOpen(true)}
                    className="border-2 border-dashed border-border rounded-lg h-10 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden w-full"
                  >
                    {videoFilePath || (videoUrl && !videoUrl.startsWith("http")) ? (
                      <span className="text-xs sm:text-sm text-foreground truncate px-3 w-full text-center block" title={getImageUrl(videoFilePath || videoUrl)}>
                        {getImageUrl(videoFilePath || videoUrl)}
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm text-muted-foreground">Click to select from media library</span>
                    )}
                  </div>
                ) : videoUploadType === "hls" ? (
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://cdn.example.com/video.m3u8"
                    className="h-10 text-xs"
                  />
                ) : (
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-10 text-xs"
                  />
                )}
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
                  className="h-10 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Release Date</Label>
                <Input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Subtitle / VTT URL (optional)</Label>
                <Input
                  value={subtitleUrl}
                  onChange={(e) => setSubtitleUrl(e.target.value)}
                  placeholder="https://.../sub.vtt"
                  className="h-10 text-xs"
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

        <MediaPicker
          open={videoPickerOpen}
          onClose={() => setVideoPickerOpen(false)}
          onUploadPendingChange={setVideoUploadPending}
          onSelect={(media) => {
            setVideoPickerOpen(false);
            const chosenUrl = media.filePath || media.s3Key || media.url || "";
            setVideoUploadType("local");
            setVideoFilePath(chosenUrl);
            setVideoUrl(chosenUrl);
            if (media.duration && (!durationMinutes || durationMinutes === 45)) {
              setDurationMinutes(Math.round(media.duration / 60));
            }
          }}
          source="episodes"
          accept="video/*"
        />
      </div>
  );
}
