import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Save, Film, Play, Lock, AlertCircle, ImageIcon, Upload, Loader2, RefreshCw } from "lucide-react";
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
  useGetEpisodeSeasonList,
  useCreateEpisode,
  useUpdateEpisode,
  getImageUrl,
  useEpisodeProcessingStatus,
  useReprocessEpisodeHls,
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

  const episode = (existingEpisodeData as any)?.data;
  const { data: hlsStatusData } = useEpisodeProcessingStatus(isEdit ? id! : "", !!isEdit && !!id);
  const reprocessHlsMutation = useReprocessEpisodeHls();

  const hlsPoll = (hlsStatusData as any)?.data;
  const liveHlsStatus = hlsPoll?.processingStatus || episode?.processingStatus;
  const liveHlsUrl = hlsPoll?.hlsUrl || episode?.hlsUrl;
  const liveHlsError = hlsPoll?.processingError || episode?.processingError;

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
  
  // Episode Thumbnail state & picker
  const [thumbnail, setThumbnail] = useState({ filePath: "", preview: "" });
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);

  // Trailer state
  const [trailerPickerOpen, setTrailerPickerOpen] = useState(false);
  const [trailerUrlType, setTrailerUrlType] = useState("url");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [trailerFilePath, setTrailerFilePath] = useState("");

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

  const { data: serverSeasonsData } = useGetEpisodeSeasonList(tvShowId ? { tvShowId } : undefined);

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
        
        if (existing.trailerUrl) {
          if (existing.trailerUrl.startsWith("http://") || existing.trailerUrl.startsWith("https://")) {
            setTrailerUrlType("url");
            setTrailerUrl(existing.trailerUrl);
          } else {
            setTrailerUrlType("local");
            setTrailerFilePath(existing.trailerUrl);
          }
        }
        
        const existingThumb = existing.thumbnail || existing.poster || "";
        setThumbnail({
          filePath: existingThumb,
          preview: existingThumb ? getImageUrl(existingThumb) : "",
        });

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

    const resolvedThumb = thumbnail.filePath || thumbnail.preview || "";

    const episodePayload: any = {
      tvShowId,
      season: seasonNumberVal,
      episode: Number(episodeNumber) || 1,
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      fullDescription: fullDescription.trim(),
      description: fullDescription.trim() || shortDescription.trim() || undefined,
      thumbnail: resolvedThumb.trim() || undefined,
      poster: resolvedThumb.trim() || undefined,
      videoUrl: resolvedVideoUrl || undefined,
      sourceVideoUrl: videoUploadType === "local" && resolvedVideoUrl && !isHlsPlaylist ? resolvedVideoUrl : undefined,
      hlsUrl: resolvedVideoUrl && isHlsPlaylist ? resolvedVideoUrl : undefined,
      videoUploadType,
      videoFilePath: videoFilePath.trim() || undefined,
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
        {/* Section: Episode Details & Artwork (matches Screenshot 2) */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
            Episode Details
          </h3>

          {/* Episode Thumbnail Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold block">Episode Thumbnail</Label>
              {thumbnail.preview && (
                <button
                  type="button"
                  onClick={() => setThumbnail({ filePath: "", preview: "" })}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  Clear Thumbnail
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div
                onClick={() => setThumbnailPickerOpen(true)}
                className="w-48 aspect-[16/9] border-2 border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden relative group flex-shrink-0"
              >
                {thumbnail.preview ? (
                  <>
                    <img src={thumbnail.preview} alt="Episode thumbnail preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[11px] font-semibold text-white bg-black/70 px-2 py-1 rounded-full border border-white/20 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Change
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Select Thumbnail</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setThumbnailPickerOpen(true)}
                  className="gap-2 text-xs h-9 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Pick Thumbnail from Library
                </Button>
                <Input
                  value={thumbnail.filePath}
                  onChange={(e) => {
                    const val = e.target.value;
                    setThumbnail({ filePath: val, preview: val ? getImageUrl(val) : "" });
                  }}
                  placeholder="Or paste image URL (https://...)"
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Recommended aspect ratio: 16:9 (e.g. 1280x720).
                </p>
              </div>
            </div>
          </div>

          {/* Association Row: TV Show, Season, Episode Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Web Series / TV Show *</Label>
              <Select value={tvShowId} onValueChange={setTvShowId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select Web Series..." />
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
              <Label className="text-xs font-bold mb-1.5 block">Season *</Label>
              {availableSeasons.length === 0 ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 h-10">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">No seasons found.</span>
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

            <div>
              <Label className="text-xs font-bold mb-1.5 block">Episode Number *</Label>
              <Input
                type="number"
                min={1}
                required
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)}
                className="h-10 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold mb-1.5 block">Episode Title *</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Beginning"
              className="h-10"
            />
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
            <Label className="text-xs font-bold mb-1.5 block">Description</Label>
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
            Video & Playback Source
          </h3>

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

          <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2 mt-6">
            Trailer
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Trailer URL Type</Label>
              <Select value={trailerUrlType} onValueChange={setTrailerUrlType}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">External URL</SelectItem>
                  <SelectItem value="local">Local (Media Library)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Trailer Video</Label>
              {trailerUrlType === "local" ? (
                <div
                  onClick={() => setTrailerPickerOpen(true)}
                  className="border-2 border-dashed border-border rounded-lg h-10 flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden"
                >
                  {trailerFilePath ? (
                    <span className="text-xs sm:text-sm text-foreground truncate px-3 w-full text-center block">
                      {getImageUrl(trailerFilePath)}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">Click to select trailer</span>
                  )}
                </div>
              ) : (
                <Input
                  value={trailerUrl}
                  onChange={(e) => setTrailerUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-10 text-xs"
                />
              )}
            </div>
          </div>

          {isEdit && (
            <div className="bg-muted/10 border border-border rounded-xl p-4 my-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">HLS Processing Status</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                    When you upload an MP4 video, our server automatically transcodes it into HLS (HTTP Live Streaming) format for adaptive bitrate playback.
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={reprocessHlsMutation.isPending || ["queued", "processing"].includes(String(liveHlsStatus || "").toLowerCase())}
                  onClick={async () => {
                    const source =
                      [videoFilePath, videoUrl, episode?.sourceVideoUrl, episode?.videoUrl]
                        .map((u) => String(u || "").trim())
                        .find((u) => u && !/\.m3u8(?:[?#]|$)/i.test(u)) || "";

                    if (!source) {
                      toast({ title: "No valid MP4 source video available to transcode", variant: "destructive" });
                      return;
                    }

                    try {
                      await reprocessHlsMutation.mutateAsync(id!);
                      toast({ title: "HLS reprocessing queued" });
                    } catch (err: any) {
                      toast({ title: "Failed to queue reprocessing", description: err.message, variant: "destructive" });
                    }
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-semibold shrink-0"
                >
                  {reprocessHlsMutation.isPending || ["queued", "processing"].includes(String(liveHlsStatus || "").toLowerCase()) ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Generate HLS</>
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Status:</span>
                {/\.m3u8/i.test(String(liveHlsUrl || "")) && String(liveHlsStatus).toLowerCase() === "ready" ? (
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">Ready</span>
                ) : String(liveHlsStatus).toLowerCase() === "failed" ? (
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                    Failed{liveHlsError ? `: ${liveHlsError}` : ""}
                  </span>
                ) : ["queued", "processing"].includes(String(liveHlsStatus || "").toLowerCase()) ? (
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> {liveHlsStatus}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-zinc-500/20 text-foreground/70 font-medium">Not generated yet</span>
                )}
              </div>
            </div>
          )}


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

          <div>
            <Label className="text-xs font-bold mb-1.5 block">Subtitle URL (optional)</Label>
            <Input
              value={subtitleUrl}
              onChange={(e) => setSubtitleUrl(e.target.value)}
              placeholder="https://example.com/subs.vtt"
              className="h-10 text-xs"
            />
          </div>
        </div>

        {/* Section: Paywall & Access Controls */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
            Paywall & Monetization
          </h3>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-bold">Free Episode (No Subscription Needed)</Label>
                {isFree ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-500">
                    OPEN ACCESS
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> VIP LOCKED
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Toggle ON to let all users stream this episode without requiring a premium subscription plan.
              </p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
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

      {/* Thumbnail Media Picker Modal */}
      <MediaPicker
        open={thumbnailPickerOpen}
        onClose={() => setThumbnailPickerOpen(false)}
        onSelect={(m) => setThumbnail({ filePath: m.filePath, preview: m.url })}
        source="episodes"
        accept="image/*"
      />

      {/* Video Media Picker Modal */}
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
      <MediaPicker
        open={trailerPickerOpen}
        onClose={() => setTrailerPickerOpen(false)}
        onSelect={(m) => setTrailerFilePath(m.filePath)}
        source="episodes"
        accept="video/*"
      />
    </div>
  );
}
